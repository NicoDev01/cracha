from types import SimpleNamespace

import pytest

from cracha_crawler.ingest import RagIngestClient


@pytest.mark.asyncio
async def test_indexing_skips_failed_items_when_other_pages_are_ready() -> None:
    client = object()
    ingest = object.__new__(RagIngestClient)
    statuses = iter(
        [
            {
                "ready": False,
                "pending": 0,
                "failures": ["page-b.md: file_content_empty"],
                "chunks_count": 5,
            },
            {"ready": True, "pending": 0, "failures": [], "chunks_count": 5},
        ]
    )

    async def post(*_args, **_kwargs):
        status = next(statuses)
        return SimpleNamespace(json=lambda: status)

    ingest._post = post
    active_keys = ["page-a.md", "page-b.md"]

    result = await ingest._wait_for_index(client, "database", "user", active_keys)

    assert result.chunks_count == 5
    assert result.complete is True
    assert active_keys == ["page-a.md"]


@pytest.mark.asyncio
async def test_pending_indexing_is_deferred_instead_of_failing() -> None:
    client = object()
    ingest = object.__new__(RagIngestClient)

    async def post(*_args, **_kwargs):
        return SimpleNamespace(
            json=lambda: {
                "ready": False,
                "pending": 2,
                "failures": [],
                "chunks_count": 3,
            }
        )

    ingest._post = post
    result = await ingest._wait_for_index(
        client,
        "database",
        "user",
        ["page-a.md", "page-b.md"],
        attempts=1,
    )

    assert result.complete is False
    assert result.pending_count == 2
    assert result.indexed_count == 0
    assert result.chunks_count == 3


@pytest.mark.asyncio
async def test_finalize_only_completes_a_ready_index() -> None:
    ingest = object.__new__(RagIngestClient)
    completed = False

    async def wait(*_args, **_kwargs):
        return SimpleNamespace(
            complete=False,
            pending_count=1,
            indexed_count=1,
            chunks_count=4,
        )

    async def complete(*_args, **_kwargs):
        nonlocal completed
        completed = True

    ingest._wait_for_index = wait
    ingest._complete = complete

    result = await ingest.finalize(
        "database",
        "user",
        ["page-a.md", "page-b.md"],
        attempts=1,
    )

    assert result.complete is False
    assert completed is False


@pytest.mark.asyncio
async def test_finalize_completes_a_ready_index() -> None:
    ingest = object.__new__(RagIngestClient)
    completed = False

    async def wait(*_args, **_kwargs):
        return SimpleNamespace(
            complete=True,
            pending_count=0,
            indexed_count=2,
            chunks_count=8,
        )

    async def complete(*_args, **_kwargs):
        nonlocal completed
        completed = True

    ingest._wait_for_index = wait
    ingest._complete = complete

    result = await ingest.finalize(
        "database",
        "user",
        ["page-a.md", "page-b.md"],
        attempts=1,
    )

    assert result.complete is True
    assert completed is True
