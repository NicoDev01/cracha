import fnmatch
import hashlib
import re
from datetime import UTC, datetime
from urllib.parse import urlsplit, urlunsplit

from .models import Page

MAX_MARKDOWN_BYTES = 3_500_000


def canonical_url(url: str) -> str:
    parsed = urlsplit(url)
    path = parsed.path or "/"
    if path != "/":
        path = path.rstrip("/")
    return urlunsplit((parsed.scheme.lower(), parsed.netloc.lower(), path, parsed.query, ""))


def matches_patterns(url: str, includes: list[str], excludes: list[str]) -> bool:
    if includes and not any(fnmatch.fnmatch(url, pattern) for pattern in includes):
        return False
    return not any(fnmatch.fnmatch(url, pattern) for pattern in excludes)


def normalize_markdown(markdown: str) -> str:
    text = markdown.replace("\x00", "")
    text = re.sub(r"[ \t]+\n", "\n", text)
    text = re.sub(r"\n{4,}", "\n\n\n", text)
    return text.strip()


def truncate_utf8(value: str, max_bytes: int = MAX_MARKDOWN_BYTES) -> str:
    encoded = value.encode("utf-8")
    if len(encoded) <= max_bytes:
        return value
    return encoded[:max_bytes].decode("utf-8", errors="ignore").rstrip()


def page_from_result(result: object, includes: list[str], excludes: list[str]) -> Page | None:
    if not getattr(result, "success", False):
        return None

    url = canonical_url(str(getattr(result, "url", "")))
    if not url or not matches_patterns(url, includes, excludes):
        return None

    markdown_result = getattr(result, "markdown", None)
    markdown = (
        getattr(markdown_result, "fit_markdown", None)
        or getattr(markdown_result, "raw_markdown", None)
        or (markdown_result if isinstance(markdown_result, str) else "")
    )
    markdown = normalize_markdown(markdown)
    if len(markdown) < 200:
        return None
    markdown = truncate_utf8(markdown)

    metadata = getattr(result, "metadata", None) or {}
    title = str(metadata.get("title") or url)[:500]
    checksum = hashlib.sha256(markdown.encode("utf-8")).hexdigest()
    return Page(
        url=url,
        title=title,
        markdown=markdown,
        checksum=checksum,
        crawled_at=datetime.now(UTC).isoformat(),
        depth=int(metadata.get("depth", 0) or 0),
    )
