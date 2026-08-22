import asyncio
import os
import time
from collections.abc import Awaitable, Callable
from dataclasses import dataclass, replace

import httpx

from .models import Page

ProgressCallback = Callable[[dict[str, object]], Awaitable[None]]
INDEX_STATUS_ATTEMPTS = 15
INDEX_STATUS_INTERVAL_SECONDS = 2
# How long we are willing to keep asking before we notice the index is ready.
# A flat 15 seconds was chosen for crawls of hundreds of pages, where asking
# often only makes work for both sides. On a one-page crawl it is most of what
# the user waits for: measured on a single Wikipedia article, the last two polls
# were 15.8 and 15.1 seconds apart and the index had been ready inside that gap.
# The ceiling now grows with the job, so a small crawl reacts quickly and a
# large one still backs off.
INDEX_STATUS_MAX_INTERVAL_SECONDS = 15
INDEX_STATUS_MIN_CEILING_SECONDS = 4


def index_poll_ceiling(item_count: int) -> float:
    """The longest gap between two status polls for a job of this size."""
    return min(
        float(INDEX_STATUS_MAX_INTERVAL_SECONDS),
        INDEX_STATUS_MIN_CEILING_SECONDS + item_count / 10,
    )
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
class UploadResult:
    """What one upload call queued, plus the item listing it learned.

    The listing travels into the next batch, which is what keeps the dedupe
    scan to once per job instead of once per batch.
    """

    active_keys: list[str]
    #: ``None`` until some batch has actually scanned. An *empty* dict is a
    #: real answer -- a fresh instance holds nothing -- so it must not be
    #: confused with "not scanned yet", or every batch pays for its own scan.
    known_items: dict[str, dict] | None


class PageBuffer:
    """Collects crawled pages until a batch is worth sending.

    Two releases, because one is not enough. A batch that only ever leaves
    when it is full never leaves at all on a small crawl -- ten pages sat here
    until the crawl ended, which is the pipeline doing nothing for the most
    common job size. So a partial batch also leaves once its oldest page has
    waited `max_age` seconds, and a large crawl still fills its batches long
    before that clock runs out.
    """

    def __init__(self, size: int, max_age: float) -> None:
        self._size = size
        self._max_age = max_age
        self._pages: list[Page] = []
        self._since: float | None = None

    def add(self, page: Page, now: float) -> list[Page] | None:
        """Takes one page, and hands back a batch once it is full."""
        if self._since is None:
            self._since = now
        self._pages.append(page)
        return self.drain() if len(self._pages) >= self._size else None

    def due(self, now: float) -> bool:
        """Whether a partial batch has waited long enough to go out anyway."""
        return self._since is not None and now - self._since >= self._max_age

    def drain(self) -> list[Page]:
        batch = self._pages[:]
        self._pages.clear()
        self._since = None
        return batch


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

    async def upload(
        self,
        database_id: str,
        user_id: str,
        pages: list[Page],
        known_items: dict[str, dict] | None = None,
    ) -> UploadResult:
        """Queue pages for indexing and return immediately.

        Waiting happens separately (`finalize`), so a crawl can keep fetching
        while Cloudflare chunks and embeds what it already has.
        """
        active_keys: list[str] = []
        carried = dict(known_items) if known_items is not None else None
        async with httpx.AsyncClient(timeout=180) as client:
            for offset in range(0, len(pages), 25):
                batch = pages[offset : offset + 25]
                payload: dict[str, object] = {
                    "database_id": database_id,
                    "user_id": user_id,
                    "pages": [page.model_dump() for page in batch],
                }
                # The first batch of a job pays for the one scan; every later
                # batch reuses what came back, including the empty listing a
                # first crawl produces.
                if carried is not None:
                    payload["known_items"] = carried
                response = await self._post(client, "/ingest/pages", payload)
                body = response.json()
                active_keys.extend(body["active_keys"])
                returned = body.get("known_items")
                if isinstance(returned, dict):
                    carried = {**(carried or {}), **returned}
        return UploadResult(active_keys=active_keys, known_items=carried)

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
        # From the starting count: failed keys are dropped from active_keys as
        # we go, and the pace should not change because of that.
        ceiling = index_poll_ceiling(len(active_keys))
        searchable_streak = 0
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
            # Chunks are searchable the moment they exist; the item status can
            # lag minutes behind. One poll could catch a page mid-embedding, so
            # full coverage has to hold on two consecutive polls before this
            # counts as done — that is what once turned a finished crawl into
            # half an hour of waiting for statuses that never flipped.
            if total > 0 and latest.searchable_count >= total:
                if searchable_streak >= 1:
                    return replace(latest, complete=True)
                searchable_streak += 1
                # The confirming poll is the last thing between a finished
                # index and the user, so it does not wait out a backoff that
                # exists for a job still grinding. Ask again straight away.
                delay = float(INDEX_STATUS_INTERVAL_SECONDS)
            else:
                searchable_streak = 0
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
                delay = min(delay * 1.5, ceiling)

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
