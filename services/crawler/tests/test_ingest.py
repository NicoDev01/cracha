from types import SimpleNamespace

import pytest

from cracha_crawler import ingest as ingest_module
from cracha_crawler.ingest import RagIngestClient


@pytest.fixture
def no_sleep(monkeypatch: pytest.MonkeyPatch) -> None:
    async def instant(_seconds: float) -> None:
        return None

    monkeypatch.setattr(ingest_module.asyncio, "sleep", instant)


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
async def test_finalize_publishes_an_index_that_answers_questions() -> None:
    # AI Search left seven webmen pages in "running" for half an hour with their
    # chunks already searchable. Waiting for the status to flip kept the whole
    # knowledge base unusable and then marked it failed.
    ingest = object.__new__(RagIngestClient)
    completed = False

    async def wait(*_args, **_kwargs):
        return SimpleNamespace(
            complete=False,
            pending_count=7,
            indexed_count=91,
            chunks_count=180,
            searchable_count=98,
        )

    async def complete(*_args, **_kwargs):
        nonlocal completed
        completed = True

    ingest._wait_for_index = wait
    ingest._complete = complete

    result = await ingest.finalize("database", "user", ["page-a.md"], attempts=1)

    assert result.complete is False
    assert completed is True


@pytest.mark.asyncio
async def test_finalize_leaves_an_empty_index_unpublished() -> None:
    ingest = object.__new__(RagIngestClient)
    completed = False

    async def wait(*_args, **_kwargs):
        return SimpleNamespace(
            complete=False,
            pending_count=2,
            indexed_count=0,
            chunks_count=0,
            searchable_count=0,
        )

    async def complete(*_args, **_kwargs):
        nonlocal completed
        completed = True

    ingest._wait_for_index = wait
    ingest._complete = complete

    result = await ingest.finalize("database", "user", ["page-a.md"], attempts=1)

    assert result.complete is False
    assert completed is False


@pytest.mark.asyncio
async def test_waiting_gives_up_once_indexing_stops_progressing(no_sleep: None) -> None:
    ingest = object.__new__(RagIngestClient)
    polls = 0
    # start, first reset, first check, second check past the stall window
    clock = iter([0.0, 0.0, 1.0, 300.0])

    async def post(*_args, **_kwargs):
        nonlocal polls
        polls += 1
        return SimpleNamespace(
            json=lambda: {
                "ready": False,
                "pending": 7,
                "failures": [],
                "chunks_count": 180,
                "searchable": 98,
            }
        )

    ingest._post = post
    result = await ingest._wait_for_index(
        object(),
        "database",
        "user",
        [f"page-{index}.md" for index in range(98)],
        attempts=250,
        stall_seconds=120,
        _monotonic=lambda: next(clock),
    )

    assert result.complete is False
    assert result.searchable_count == 98
    # It must stop long before the attempt budget, not poll 250 times.
    assert polls < 5


@pytest.mark.asyncio
async def test_waiting_keeps_going_while_indexing_advances(no_sleep: None) -> None:
    ingest = object.__new__(RagIngestClient)
    statuses = iter(
        [
            {"ready": False, "pending": 3, "failures": [], "chunks_count": 5, "searchable": 1},
            {"ready": False, "pending": 2, "failures": [], "chunks_count": 9, "searchable": 2},
            {"ready": True, "pending": 0, "failures": [], "chunks_count": 14, "searchable": 4},
        ]
    )
    # Polls are hours apart. Only the reset on every advance keeps this alive,
    # so a large knowledge base that indexes slowly is never cut off.
    clock = iter([0.0, 0.0, 1.0, 1000.0, 1001.0, 2000.0])

    async def post(*_args, **_kwargs):
        status = next(statuses)
        return SimpleNamespace(json=lambda: status)

    ingest._post = post
    result = await ingest._wait_for_index(
        object(),
        "database",
        "user",
        ["a.md", "b.md", "c.md", "d.md"],
        attempts=10,
        stall_seconds=120,
        _monotonic=lambda: next(clock),
    )

    assert result.complete is True
    assert result.chunks_count == 14


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


def test_a_small_job_does_not_wait_fifteen_seconds_between_polls() -> None:
    # A flat ceiling was set for crawls of hundreds of pages. On a single-page
    # crawl it was most of the wait: measured on one Wikipedia article, the last
    # two polls sat 15.8 and 15.1 seconds apart and the index had gone ready
    # inside that gap.
    assert ingest_module.index_poll_ceiling(1) < 5
    assert ingest_module.index_poll_ceiling(10) < 6


def test_a_large_job_still_backs_off() -> None:
    # Polling every two seconds for half an hour cost 900 full item listings.
    assert ingest_module.index_poll_ceiling(500) == ingest_module.INDEX_STATUS_MAX_INTERVAL_SECONDS
    assert ingest_module.index_poll_ceiling(120) >= 15
