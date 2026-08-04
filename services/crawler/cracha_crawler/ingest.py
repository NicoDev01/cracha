import asyncio
import os

import httpx

from .models import Page


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
    ) -> list[str]:
        active_keys: list[str] = []
        async with httpx.AsyncClient(timeout=180) as client:
            for offset in range(0, len(pages), 10):
                batch = pages[offset : offset + 10]
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

            chunks_count = await self._wait_for_index(
                client, database_id, user_id, active_keys
            )

            await self._post(
                client,
                "/ingest/complete",
                {
                    "database_id": database_id,
                    "user_id": user_id,
                    "active_keys": active_keys,
                    "pages_count": len(pages),
                    "chunks_count": chunks_count,
                },
            )
        return active_keys

    async def _wait_for_index(
        self,
        client: httpx.AsyncClient,
        database_id: str,
        user_id: str,
        active_keys: list[str],
    ) -> int:
        payload = {
            "database_id": database_id,
            "user_id": user_id,
            "active_keys": active_keys,
        }
        for _ in range(300):
            response = await self._post(client, "/ingest/status", payload)
            status = response.json()
            failures = status.get("failures") or []
            if failures:
                raise RuntimeError(f"AI Search indexing failed: {failures[0]}")
            if status.get("ready"):
                return int(status.get("chunks_count") or 0)
            await asyncio.sleep(2)
        raise TimeoutError("AI Search indexing did not finish within 10 minutes")

    async def mark_failed(self, database_id: str, user_id: str, error: str) -> None:
        async with httpx.AsyncClient(timeout=30) as client:
            await self._post(
                client,
                "/ingest/failed",
                {"database_id": database_id, "user_id": user_id, "error": error[:500]},
            )
