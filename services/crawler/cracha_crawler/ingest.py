import asyncio
import os
import time
from collections.abc import Awaitable, Callable
from dataclasses import dataclass

import httpx

from .models import Page

ProgressCallback = Callable[[dict[str, object]], Awaitable[None]]
INDEX_STATUS_ATTEMPTS = 15
INDEX_STATUS_INTERVAL_SECONDS = 2
INDEX_STATUS_MAX_INTERVAL_SECONDS = 15
# AI Search sometimes leaves an item in "running" indefinitely although its
# chunks are already searchable. Waiting out the whole budget for those turned a
# finished crawl into a half-hour hang followed by a failure, while the pages
# were answering questions the entire time. Progress resets this timer, so a
# large knowledge base that is genuinely still indexing keeps its time.
INDEX_STALL_SECONDS = 120


@dataclass(frozen=True)
class IngestResult:
    active_keys: list[str]
    chunks_count: int
    indexed_count: int
    pending_count: int
    indexing_complete: bool


@dataclass(frozen=True)
class IndexStatus:
    chunks_count: int
    indexed_count: int
    pending_count: int
    complete: bool
    searchable_count: int = 0


class RagIngestClient:
    def __init__(self) -> None:
        self.base_url = os.environ["RAG_API_URL"].rstrip("/")
        self.secret = os.environ["RAG_INGEST_SECRET"]

    @property
    def headers(self) -> dict[str, str]:
        return {"Authorization": f"Bearer {self.secret}"}

    async def _post(self, client: httpx.AsyncClient, path: str, payload: dict) -> httpx.Response:
        last_error: Exception | None = None
        for attempt in range(3):
            try:
                response = await client.post(
                    f"{self.base_url}{path}", headers=self.headers, json=payload
                )
                if response.status_code != 429 and response.status_code < 500:
                    response.raise_for_status()
                    return response
                last_error = httpx.HTTPStatusError(
                    f"Retryable response {response.status_code}",
                    request=response.request,
                    response=response,
                )
            except httpx.TransportError as error:
                last_error = error
            if attempt < 2:
                await asyncio.sleep(2**attempt)
        assert last_error is not None
        raise last_error

    async def ingest(
        self,
        database_id: str,
        user_id: str,
        pages: list[Page],
        on_progress: ProgressCallback | None = None,
    ) -> IngestResult:
        active_keys: list[str] = []
        async with httpx.AsyncClient(timeout=180) as client:
            for offset in range(0, len(pages), 25):
                batch = pages[offset : offset + 25]
                response = await self._post(
                    client,
                    "/ingest/pages",
                    {
                        "database_id": database_id,
                        "user_id": user_id,
                        "pages": [page.model_dump() for page in batch],
                    },
                )
                active_keys.extend(response.json()["active_keys"])

            index_status = await self._wait_for_index(
                client, database_id, user_id, active_keys, on_progress
            )

            if index_status.complete:
                await self._complete(
                    client, database_id, user_id, active_keys, index_status.chunks_count
                )
        return IngestResult(
            active_keys=active_keys,
            chunks_count=index_status.chunks_count,
            indexed_count=index_status.indexed_count,
            pending_count=index_status.pending_count,
            indexing_complete=index_status.complete,
        )

    async def finalize(
        self,
        database_id: str,
        user_id: str,
        active_keys: list[str],
        attempts: int,
        on_progress: ProgressCallback | None = None,
    ) -> IndexStatus:
        async with httpx.AsyncClient(timeout=180) as client:
            status = await self._wait_for_index(
                client,
                database_id,
                user_id,
                active_keys,
                on_progress,
                attempts=attempts,
                stall_seconds=INDEX_STALL_SECONDS,
            )
            # A knowledge base whose pages answer questions is finished, even if
            # AI Search never flips the last few items to "completed". Leaving it
            # in "crawling" until the budget ran out and then marking it failed
            # discarded a working index.
            if status.complete or status.searchable_count > 0:
                await self._complete(
                    client, database_id, user_id, active_keys, status.chunks_count
                )
            return status

    async def _complete(
        self,
        client: httpx.AsyncClient,
        database_id: str,
        user_id: str,
        active_keys: list[str],
        chunks_count: int,
    ) -> None:
        await self._post(
            client,
            "/ingest/complete",
            {
                "database_id": database_id,
                "user_id": user_id,
                "active_keys": active_keys,
                "pages_count": len(active_keys),
                "chunks_count": chunks_count,
            },
        )

    async def _wait_for_index(
        self,
        client: httpx.AsyncClient,
        database_id: str,
        user_id: str,
        active_keys: list[str],
        on_progress: ProgressCallback | None = None,
        attempts: int = INDEX_STATUS_ATTEMPTS,
        stall_seconds: float | None = None,
        _monotonic: Callable[[], float] = time.monotonic,
    ) -> IndexStatus:
        payload = {
            "database_id": database_id,
            "user_id": user_id,
            "active_keys": active_keys,
        }
        previous_progress: tuple[int, int] | None = None
        latest = IndexStatus(
            chunks_count=0,
            indexed_count=0,
            pending_count=len(active_keys),
            complete=False,
        )
        last_change = _monotonic()
        delay = float(INDEX_STATUS_INTERVAL_SECONDS)
        for attempt in range(attempts):
            response = await self._post(client, "/ingest/status", payload)
            status = response.json()
            failures = status.get("failures") or []
            if failures:
                failed_keys = {str(failure).split(":", 1)[0] for failure in failures}
                active_keys[:] = [key for key in active_keys if key not in failed_keys]
                if not active_keys:
                    raise RuntimeError(f"AI Search indexing failed: {failures[0]}")
                # Dropping the failed keys is progress; retry without spinning.
                last_change = _monotonic()
                if attempt + 1 < attempts:
                    await asyncio.sleep(INDEX_STATUS_INTERVAL_SECONDS)
                continue
            total = len(active_keys)
            pending = min(total, int(status.get("pending") or 0))
            indexed = max(0, total - pending)
            chunks_count = int(status.get("chunks_count") or 0)
            latest = IndexStatus(
                chunks_count=chunks_count,
                indexed_count=indexed,
                pending_count=pending,
                complete=bool(status.get("ready")),
                searchable_count=int(status.get("searchable") or 0),
            )
            progress = (indexed, chunks_count)
            if progress != previous_progress:
                previous_progress = progress
                last_change = _monotonic()
                # Indexing is moving again, so react quickly once more.
                delay = float(INDEX_STATUS_INTERVAL_SECONDS)
                if on_progress:
                    await on_progress(
                        {
                            "stage": "indexing",
                            "current": indexed,
                            "total": total,
                            "percent": round((indexed / max(1, total)) * 100),
                            "chunks_count": chunks_count,
                        }
                    )
            if latest.complete:
                return latest
            if stall_seconds is not None and _monotonic() - last_change >= stall_seconds:
                print(
                    f"[WARN] AI Search stopped progressing with {pending} item(s) pending; "
                    f"{latest.searchable_count} of {total} are searchable."
                )
                return latest
            if attempt + 1 < attempts:
                await asyncio.sleep(delay)
                # Polling every two seconds for half an hour cost 900 full item
                # listings and told us nothing the backoff does not.
                delay = min(delay * 1.5, float(INDEX_STATUS_MAX_INTERVAL_SECONDS))

        # AI Search processes accepted uploads asynchronously. A still-running item is
        # not an ingestion failure and remains searchable as soon as Cloudflare finishes.
        return latest

    async def mark_failed(self, database_id: str, user_id: str, error: str) -> None:
        async with httpx.AsyncClient(timeout=30) as client:
            await self._post(
                client,
                "/ingest/failed",
                {"database_id": database_id, "user_id": user_id, "error": error[:500]},
            )
