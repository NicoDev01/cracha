"""Retention for crawl job status records.

The status Dict had no expiry at all: every crawl ever started still had its
progress record, and nothing ever read them again once the job was done. The
decision what to drop lives here, apart from the Modal I/O, so it can be tested
without a Dict.
"""

from collections.abc import Iterable
from datetime import UTC, datetime, timedelta

# A week outlives any crawl and any reasonable look at its outcome afterwards.
STATUS_RETENTION_SECONDS = 7 * 86_400
# One prune must not turn into an unbounded delete loop inside a crawl.
STATUS_PRUNE_LIMIT = 500


def _updated_at(status: object) -> datetime | None:
    if not isinstance(status, dict):
        return None
    value = status.get("updated_at")
    if not isinstance(value, str):
        return None
    try:
        parsed = datetime.fromisoformat(value)
    except ValueError:
        return None
    # Records written before the field carried a zone would otherwise raise on
    # comparison and take the whole prune down with them.
    return parsed if parsed.tzinfo else parsed.replace(tzinfo=UTC)


def stale_job_ids(
    items: Iterable[tuple[str, object]],
    now: datetime | None = None,
    retention_seconds: int = STATUS_RETENTION_SECONDS,
    limit: int = STATUS_PRUNE_LIMIT,
) -> list[str]:
    """The job ids whose status has outlived its usefulness.

    A record without a readable timestamp is stale by definition: it predates
    the field, so it is older than anything that carries one.
    """
    cutoff = (now or datetime.now(UTC)) - timedelta(seconds=retention_seconds)
    stale: list[str] = []
    for job_id, status in items:
        if len(stale) >= limit:
            break
        updated = _updated_at(status)
        if updated is None or updated < cutoff:
            stale.append(job_id)
    return stale
