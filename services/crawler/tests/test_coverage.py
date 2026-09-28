from types import SimpleNamespace
from unittest.mock import AsyncMock

import pytest
from services.crawler import modal_app

from cracha_crawler.models import Page


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
    prune = AsyncMock()
    monkeypatch.setattr(modal_app, "prune_crawl_statuses", prune)

    result = await modal_app.process_crawl.get_raw_f()(
        {"url": "https://example.com/", "tenant_id": "kb", "user_id": "user"}, "job"
    )

    assert result["success"] is True
    assert finalized["crawl_complete"] is expected
    # Housekeeping belongs to the scheduled sweep, not to the user's wait.
    prune.assert_not_awaited()


async def test_a_warm_up_call_starts_no_crawl(monkeypatch) -> None:
    # The crawl form wakes a container ahead of the crawl. That call must not
    # touch any status, billing or index: it only makes the container exist.
    update = AsyncMock()
    monkeypatch.setattr(modal_app, "update_status", update)
    monkeypatch.setattr(modal_app, "RagIngestClient", None)

    result = await modal_app.process_crawl.get_raw_f()({"warm": True}, "warm")

    assert result == {"warm": True}
    update.assert_not_awaited()


async def test_the_status_names_the_latest_pages_read(monkeypatch) -> None:
    # The crawl view lists the pages as they come in, newest first.
    pages = [
        Page(
            url=f"https://example.com/{index}",
            title=f"Seite {index}",
            markdown="# Inhalt\n\n" + "Text. " * 50,
            checksum=str(index) * 64,
            crawled_at="2026-09-28T00:00:00+00:00",
        )
        for index in range(10)
    ]

    async def crawl(_request, on_progress, on_page, _stats):
        for page in pages:
            await on_page(page)
            await on_progress({"stage": "crawling", "current": 1, "total": 10, "percent": 10})
        return pages, 0

    class Ingest:
        async def upload(self, _database, _user, batch, _known, job_id=None):
            return SimpleNamespace(active_keys=[page.url for page in batch], known_items={})

        async def finalize(self, *_args, **_kwargs):
            return SimpleNamespace(complete=True, chunks_count=2, indexed_count=10, pending_count=0)

    update = AsyncMock()
    monkeypatch.setattr(modal_app, "crawl_pages", crawl)
    monkeypatch.setattr(modal_app, "RagIngestClient", Ingest)
    monkeypatch.setattr(modal_app, "update_status", update)

    await modal_app.process_crawl.get_raw_f()(
        {"url": "https://example.com/", "tenant_id": "kb", "user_id": "user"}, "job"
    )

    reported = [
        call.kwargs["result"]["recent_pages"]
        for call in update.await_args_list
        if "recent_pages" in (call.kwargs.get("result") or {})
    ]
    assert reported[0] == [{"url": "https://example.com/0", "title": "Seite 0"}]
    newest_eight = [f"Seite {index}" for index in range(9, 1, -1)]
    assert [page["title"] for page in reported[-1]] == newest_eight


async def test_the_status_names_the_skipped_pages_and_why(monkeypatch) -> None:
    page = Page(
        url="https://example.com/",
        title="Start",
        markdown="# Start\n\n" + "Text. " * 50,
        checksum="a" * 64,
        crawled_at="2026-09-28T00:00:00+00:00",
    )

    async def crawl(_request, _on_progress, on_page, stats):
        stats.skip("https://example.com/termin", "Zu wenig lesbarer Text")
        await on_page(page)
        return [page], 1

    class Ingest:
        async def upload(self, _database, _user, batch, _known, job_id=None):
            return SimpleNamespace(active_keys=[item.url for item in batch], known_items={})

        async def finalize(self, *_args, **_kwargs):
            return SimpleNamespace(complete=True, chunks_count=2, indexed_count=1, pending_count=0)

    update = AsyncMock()
    monkeypatch.setattr(modal_app, "crawl_pages", crawl)
    monkeypatch.setattr(modal_app, "RagIngestClient", Ingest)
    monkeypatch.setattr(modal_app, "update_status", update)

    await modal_app.process_crawl.get_raw_f()(
        {"url": "https://example.com/", "tenant_id": "kb", "user_id": "user"}, "job"
    )

    reported = [
        call.kwargs["result"]["skipped_pages"]
        for call in update.await_args_list
        if "skipped_pages" in (call.kwargs.get("result") or {})
    ]
    assert reported == [[{"url": "https://example.com/termin", "reason": "Zu wenig lesbarer Text"}]]
