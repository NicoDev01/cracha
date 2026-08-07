from datetime import UTC, datetime, timedelta

from cracha_crawler.status import STATUS_RETENTION_SECONDS, stale_job_ids

NOW = datetime(2026, 8, 7, 12, 0, tzinfo=UTC)


def status(age_days: float) -> dict:
    return {"status": "completed", "updated_at": (NOW - timedelta(days=age_days)).isoformat()}


def test_recent_jobs_are_kept() -> None:
    items = [("a", status(0)), ("b", status(2)), ("c", status(6.9))]

    assert stale_job_ids(items, NOW) == []


def test_jobs_past_the_retention_window_are_dropped() -> None:
    items = [("fresh", status(1)), ("old", status(8)), ("ancient", status(400))]

    assert stale_job_ids(items, NOW) == ["old", "ancient"]


def test_records_without_a_timestamp_are_dropped() -> None:
    # They predate the field, so they are older than anything that has one.
    items = [("legacy", {"status": "completed"}), ("broken", {"updated_at": "not a date"})]

    assert stale_job_ids(items, NOW) == ["legacy", "broken"]


def test_a_naive_timestamp_does_not_break_the_comparison() -> None:
    naive = (NOW - timedelta(days=30)).replace(tzinfo=None).isoformat()

    assert stale_job_ids([("x", {"updated_at": naive})], NOW) == ["x"]


def test_pruning_stops_at_the_limit() -> None:
    # One crawl must not turn into thousands of deletes.
    items = [(str(index), status(90)) for index in range(50)]

    assert len(stale_job_ids(items, NOW, limit=10)) == 10


def test_a_running_job_from_last_week_still_expires() -> None:
    # Nothing polls a job for a week; such a record is abandoned, not active.
    items = [("stuck", {"status": "running", "updated_at": (NOW - timedelta(days=9)).isoformat()})]

    assert stale_job_ids(items, NOW) == ["stuck"]


def test_the_window_is_a_week() -> None:
    assert STATUS_RETENTION_SECONDS == 7 * 86_400
