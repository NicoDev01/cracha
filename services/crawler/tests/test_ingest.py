from types import SimpleNamespace

import pytest

from cracha_crawler import ingest as ingest_module
from cracha_crawler.ingest import INDEX_STATUS_INTERVAL_SECONDS, PageBuffer, RagIngestClient
from cracha_crawler.models import Page


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
                "pending": 8,
                "failures": [],
                "chunks_count": 180,
                # Ninety of ninety-eight answer questions; the last eight have
                # stopped moving entirely. That is a stall, not a finish.
                "searchable": 90,
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
    assert result.searchable_count == 90
    # It must stop long before the attempt budget, not poll 250 times.
    assert polls < 5


@pytest.mark.asyncio
async def test_full_coverage_on_two_polls_finishes_without_status_flips(no_sleep: None) -> None:
    # Every page's chunks are searchable while AI Search still reports the
    # items as "running". Waiting for the flip once kept a finished knowledge
    # base locked for half an hour; two agreeing polls are enough evidence.
    ingest = object.__new__(RagIngestClient)

    async def post(*_args, **_kwargs):
        return SimpleNamespace(
            json=lambda: {
                "ready": False,
                "pending": 3,
                "failures": [],
                "chunks_count": 12,
                "searchable": 3,
            }
        )

    ingest._post = post
    result = await ingest._wait_for_index(
        object(),
        "database",
        "user",
        ["a.md", "b.md", "c.md"],
        attempts=10,
    )

    assert result.complete is True
    assert result.searchable_count == 3


@pytest.mark.asyncio
async def test_one_full_coverage_poll_is_not_enough(no_sleep: None) -> None:
    # A single poll can catch a page mid-embedding: chunks exist, more are
    # coming. Only agreement across two polls may end the wait early, so one
    # full-coverage poll on its own changes nothing.
    ingest = object.__new__(RagIngestClient)

    async def post(*_args, **_kwargs):
        return SimpleNamespace(
            json=lambda: {
                "ready": False,
                "pending": 0,
                "failures": [],
                "chunks_count": 4,
                "searchable": 2,
            }
        )

    ingest._post = post
    result = await ingest._wait_for_index(
        object(),
        "database",
        "user",
        ["a.md", "b.md"],
        attempts=1,
    )

    assert result.complete is False


@pytest.mark.asyncio
async def test_upload_threads_the_listing_into_the_next_batch() -> None:
    ingest = object.__new__(RagIngestClient)
    payloads: list[dict] = []

    async def post(_client, path, payload):
        payloads.append(payload)
        # The worker answers every upload with what its scan found; only the
        # first batch of a job actually triggers that scan.
        listing: dict = {}
        if len(payloads) == 1:
            listing["known_items"] = {
                "page-a.md": {"checksum": "y", "title": "A", "status": "completed", "chunks": 1}
            }
        return SimpleNamespace(json=lambda: {"active_keys": ["k"], **listing})

    ingest._post = post
    pages = [
        SimpleNamespace(model_dump=lambda index=index: {"url": f"https://example.com/{index}"})
        for index in range(30)
    ]

    result = await ingest.upload("db", "user", pages)  # type: ignore[arg-type]

    assert len(payloads) == 2
    assert "known_items" not in payloads[0]
    assert payloads[1]["known_items"] == {
        "page-a.md": {"checksum": "y", "title": "A", "status": "completed", "chunks": 1}
    }
    assert result.active_keys == ["k", "k"]
    assert result.known_items == {
        "page-a.md": {"checksum": "y", "title": "A", "status": "completed", "chunks": 1}
    }


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


@pytest.mark.asyncio
async def test_an_empty_listing_still_travels_to_the_next_batch() -> None:
    # A first crawl scans an empty instance. That empty answer is a real
    # answer, and treating it as "nothing learned yet" made every batch of a
    # first crawl re-scan an instance that was growing under it -- the case the
    # threading was written for in the first place.
    ingest = object.__new__(RagIngestClient)
    payloads: list[dict] = []

    async def post(_client, _path, payload):
        payloads.append(payload)
        return SimpleNamespace(json=lambda: {"active_keys": ["k"], "known_items": {}})

    ingest._post = post
    pages = [
        SimpleNamespace(model_dump=lambda index=index: {"url": f"https://example.com/{index}"})
        for index in range(30)
    ]

    result = await ingest.upload("db", "user", pages)  # type: ignore[arg-type]

    assert "known_items" not in payloads[0]
    assert payloads[1]["known_items"] == {}
    assert result.known_items == {}


@pytest.mark.asyncio
async def test_upload_reports_no_listing_when_the_worker_sent_none() -> None:
    # Without a listing in the response there is nothing to hand on, and the
    # next batch has to scan for itself rather than be told the index is empty.
    ingest = object.__new__(RagIngestClient)

    async def post(_client, _path, _payload):
        return SimpleNamespace(json=lambda: {"active_keys": ["k"]})

    ingest._post = post
    pages = [SimpleNamespace(model_dump=lambda: {"url": "https://example.com/"})]

    result = await ingest.upload("db", "user", pages)  # type: ignore[arg-type]

    assert result.known_items is None


def _buffered_page(index: int) -> Page:
    return Page(
        url=f"https://example.com/{index}",
        title="Titel",
        content="Inhalt " * 20,
        markdown="Inhalt",
        checksum="abc",
        crawled_at="2026-08-22T00:00:00+00:00",
    )


def test_a_full_buffer_releases_its_batch() -> None:
    buffer = PageBuffer(size=3, max_age=5)

    assert buffer.add(_buffered_page(0), now=0) is None
    assert buffer.add(_buffered_page(1), now=1) is None
    batch = buffer.add(_buffered_page(2), now=2)

    assert batch is not None
    assert len(batch) == 3
    # Drained: the released pages must not travel a second time.
    assert buffer.drain() == []


def test_a_partial_buffer_goes_out_once_its_oldest_page_has_waited() -> None:
    # The ten-page crawl: the batch never fills, so without the clock the whole
    # pipeline waits for the crawl to end and does nothing at all.
    buffer = PageBuffer(size=25, max_age=5)
    buffer.add(_buffered_page(0), now=100)
    buffer.add(_buffered_page(1), now=102)

    assert buffer.due(now=104) is False
    assert buffer.due(now=105) is True
    assert len(buffer.drain()) == 2


def test_the_clock_starts_again_with_the_next_page() -> None:
    # Age is measured from the oldest page still waiting, not from the crawl.
    buffer = PageBuffer(size=25, max_age=5)
    buffer.add(_buffered_page(0), now=0)
    buffer.drain()

    assert buffer.due(now=100) is False
    buffer.add(_buffered_page(1), now=100)
    assert buffer.due(now=104) is False
    assert buffer.due(now=106) is True


def test_an_empty_buffer_is_never_due() -> None:
    assert PageBuffer(size=25, max_age=5).due(now=10_000) is False


@pytest.mark.asyncio
async def test_the_confirming_poll_does_not_wait_out_the_backoff(monkeypatch) -> None:
    # By the time every page is searchable the backoff has grown for a job that
    # is now finished, and one more long sleep is pure waiting. The poll that
    # confirms it comes at the short interval instead.
    ingest = object.__new__(RagIngestClient)
    sleeps: list[float] = []
    polls = 0

    async def record_sleep(seconds: float) -> None:
        sleeps.append(seconds)

    monkeypatch.setattr(ingest_module.asyncio, "sleep", record_sleep)

    async def post(*_args, **_kwargs):
        nonlocal polls
        polls += 1
        # The item statuses never move -- two stay "running" to the end -- so
        # the backoff grows exactly as it does for a job that has stalled. What
        # changes is that the chunks of every page become searchable.
        searchable = 4 if polls >= 5 else 0
        return SimpleNamespace(
            json=lambda: {
                "ready": False,
                "pending": 2,
                "failures": [],
                "chunks_count": 10,
                "searchable": searchable,
            }
        )

    ingest._post = post
    result = await ingest._wait_for_index(
        object(),
        "database",
        "user",
        ["a.md", "b.md", "c.md", "d.md"],
        attempts=10,
    )

    assert result.complete is True
    # The wait before the confirming poll is the short one, not the grown one.
    assert sleeps[-1] == INDEX_STATUS_INTERVAL_SECONDS
    assert max(sleeps) > INDEX_STATUS_INTERVAL_SECONDS
