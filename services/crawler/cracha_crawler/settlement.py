"""A terminal status is persisted before this callback; retries are idempotent."""

import os

import httpx


async def settle_status(status: dict) -> bool:
    reference = status.get("hold_reference")
    if not reference or status.get("status") not in {"completed", "failed", "cancelled"}:
        return False
    endpoint = os.environ.get("CRAWLER_SETTLEMENT_URL")
    if not endpoint:
        return False
    result = status.get("result") or {}
    pages = result.get("indexed_pages", result.get("pages_count", 0))
    async with httpx.AsyncClient(timeout=15) as client:
        response = await client.post(
            endpoint,
            headers={"Authorization": f"Bearer {os.environ['CRAWLER_API_SECRET']}"},
            json={
                "hold_reference": reference,
                "status": status["status"],
                "indexed_pages": max(0, int(pages or 0)),
            },
        )
        response.raise_for_status()
        return response.json().get("settled") is True
