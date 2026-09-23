from types import SimpleNamespace
from unittest.mock import AsyncMock

import pytest
from cracha_crawler.models import Page
from services.crawler import modal_app


@pytest.mark.asyncio
@pytest.mark.parametrize(
    ("coverage", "expected"),
    [
        ({}, True),
        ({"truncated": True}, False),
        ({"timed_out": True}, False),
        ({"failed": 3}, False),
    ],
)
async def test_the_crawls_coverage_decides_whether_the_worker_may_prune(
    monkeypatch, coverage, expected
) -> None:
    page = Page(
        url="https://example.com/a",
        title="A",
        markdown="# A\n\n" + "Inhalt " * 40,
        checksum="c" * 64,
        crawled_at="2026-09-23T00:00:00+00:00",
    )

    async def crawl(_request, _on_progress, on_page, stats):
        for key, value in coverage.items():
            setattr(stats, key, value)
        await on_page(page)
        return [page], 0

    finalized: dict = {}

    class Ingest:
        async def upload(self, _database, _user, batch, _known, job_id=None):
            return SimpleNamespace(active_keys=[f"key-{len(batch)}"], known_items={})

        async def finalize(self, *_args, **kwargs):
            finalized.update(kwargs)
            return SimpleNamespace(complete=True, chunks_count=2, indexed_count=1, pending_count=0)

        async def mark_failed(self, *_args, **_kwargs):
            raise AssertionError("the crawl must not fail")

    monkeypatch.setattr(modal_app, "crawl_pages", crawl)
    monkeypatch.setattr(modal_app, "RagIngestClient", Ingest)
    monkeypatch.setattr(modal_app, "update_status", AsyncMock())
    monkeypatch.setattr(modal_app, "prune_crawl_statuses", AsyncMock())

    result = await modal_app.process_crawl.get_raw_f()(
        {"url": "https://example.com/", "tenant_id": "kb", "user_id": "user"}, "job"
    )

    assert result["success"] is True
    assert finalized["crawl_complete"] is expected
