import fnmatch
import hashlib
import re
from datetime import UTC, datetime
from urllib.parse import urlsplit, urlunsplit

from .models import Page

MAX_MARKDOWN_BYTES = 3_500_000

# A link target: `(url)`, `(<url>)` or `(url "title")`, tolerating one level of
# parentheses inside the URL itself.
_LINK_TARGET = (
    r"\(\s*(?:<[^>\n]*>|[^\s()]*(?:\([^()\n]*\)[^\s()]*)*)"
    r"(?:\s+(?:\"[^\"\n]*\"|'[^'\n]*'))?\s*\)"
)
MARKDOWN_IMAGE_RE = re.compile(rf"!\[([^\[\]\n]*)\]{_LINK_TARGET}")
MARKDOWN_LINK_RE = re.compile(rf"\[([^\[\]\n]*)\]{_LINK_TARGET}")
MARKDOWN_REFERENCE_LINK_RE = re.compile(r"\[([^\[\]\n]*)\]\[[^\]\n]*\]")
# Indentation is horizontal only. `\s` would swallow the preceding blank line.
MARKDOWN_REFERENCE_DEFINITION_RE = re.compile(r"(?m)^[ \t]{0,3}\[[^\]\n]+\]:[ \t]*\S+.*$")
AUTOLINK_RE = re.compile(r"<((?:https?|mailto):[^>\s]+)>")
EMPTY_LIST_ITEM_RE = re.compile(r"(?m)^[ \t]{0,3}(?:[-*+]|\d+[.)])[ \t]*$\n?")
EMPTY_HEADING_RE = re.compile(r"(?m)^[ \t]{0,3}#{1,6}[ \t]*$\n?")
# A fence runs to its closing marker or, if the page truncated mid-block, to the
# end of the document.
FENCED_CODE_RE = re.compile(r"(?ms)^[ \t]{0,3}(`{3,}|~{3,}).*?(?:^[ \t]{0,3}\1[ \t]*$|\Z)")


def _strip_links_in_prose(markdown: str) -> str:

    text = MARKDOWN_REFERENCE_DEFINITION_RE.sub("", markdown)
    text = AUTOLINK_RE.sub(r"\1", text)
    text = MARKDOWN_IMAGE_RE.sub(lambda match: match.group(1).strip(), text)
    # `[![alt](image)](target)` needs a second pass once the image is gone.
    for _ in range(3):
        unwrapped = MARKDOWN_LINK_RE.sub(lambda match: match.group(1).strip(), text)
        if unwrapped == text:
            break
        text = unwrapped
    text = MARKDOWN_REFERENCE_LINK_RE.sub(lambda match: match.group(1).strip(), text)
    text = EMPTY_LIST_ITEM_RE.sub("", text)
    return EMPTY_HEADING_RE.sub("", text)


def strip_markdown_links(markdown: str) -> str:
    """Replace markdown links with their text and drop images.

    Cloudflare AI Search runs its own boilerplate filter over uploaded content
    and treats link-dense markdown as navigation. Measured against the indexing
    pipeline, a page of 60 `## [Name](url)` lines fails outright with
    `file_content_empty`, and 60 `- [Name](url)` lines index as an item whose
    chunks contain none of the names. The same lists survive intact once the
    link syntax is gone, so collection pages must reach the index as plain
    text. Bare URLs are not affected and stay readable.

    Fenced code blocks are left verbatim: on a documentation site the link
    syntax inside a sample is the content being documented.

    Crawling is unaffected: link discovery reads the rendered DOM, not this
    markdown.
    """
    segments: list[str] = []
    position = 0
    for fence in FENCED_CODE_RE.finditer(markdown):
        segments.append(_strip_links_in_prose(markdown[position : fence.start()]))
        segments.append(fence.group(0))
        position = fence.end()
    segments.append(_strip_links_in_prose(markdown[position:]))
    return "".join(segments)


def canonical_url(url: str, *, preserve_fragment: bool = False) -> str:
    parsed = urlsplit(url)
    path = parsed.path or "/"
    if path != "/":
        path = path.rstrip("/")
    fragment = parsed.fragment if preserve_fragment else ""
    return urlunsplit((parsed.scheme.lower(), parsed.netloc.lower(), path, parsed.query, fragment))


def matches_patterns(url: str, includes: list[str], excludes: list[str]) -> bool:
    if includes and not any(fnmatch.fnmatch(url, pattern) for pattern in includes):
        return False
    return not any(fnmatch.fnmatch(url, pattern) for pattern in excludes)


def normalize_markdown(markdown: str) -> str:
    # Every ingest path funnels through here, so link stripping cannot be
    # forgotten by a caller that builds markdown some other way.
    text = strip_markdown_links(markdown.replace("\x00", ""))
    text = re.sub(r"[ \t]+\n", "\n", text)
    text = re.sub(r"\n{4,}", "\n\n\n", text)
    return text.strip()


def _is_indexable(markdown: str) -> bool:
    searchable_body = re.sub(r"(?m)^\s{0,3}#{1,6}\s+.*$", "", markdown)
    return len(markdown) >= 200 and len(re.sub(r"\W+", "", searchable_body)) >= 80


def truncate_utf8(value: str, max_bytes: int = MAX_MARKDOWN_BYTES) -> str:
    encoded = value.encode("utf-8")
    if len(encoded) <= max_bytes:
        return value
    return encoded[:max_bytes].decode("utf-8", errors="ignore").rstrip()


def page_from_result(result: object, includes: list[str], excludes: list[str]) -> Page | None:
    if not getattr(result, "success", False):
        return None

    # Crawl4AI reports a rendered error page as a success with its status code
    # intact. Sites whose 404 carries the full layout would otherwise index
    # "Seite nicht gefunden" as an answerable source.
    #
    # Redirects must pass. The reported status belongs to the first response,
    # so a 301 still carries the destination's content under redirected_url.
    # Rejecting those dropped every blog article behind a legacy permalink.
    status_code = getattr(result, "status_code", None)
    if isinstance(status_code, int) and status_code >= 400:
        return None

    result_url = getattr(result, "redirected_url", None) or getattr(result, "url", "")
    # Hash routes can identify distinct pages in documentation SPAs. Regular
    # link discovery still strips ordinary anchors before scheduling requests.
    url = canonical_url(str(result_url), preserve_fragment=True)
    if not url or not matches_patterns(url, includes, excludes):
        return None

    markdown_result = getattr(result, "markdown", None)
    fit_markdown = normalize_markdown(
        str(getattr(markdown_result, "fit_markdown", None) or "")
    )
    raw_markdown = normalize_markdown(
        str(
            getattr(markdown_result, "raw_markdown", None)
            or (markdown_result if isinstance(markdown_result, str) else "")
        )
    )
    # Fit markdown removes repeated navigation, cookie banners and sidebars.
    # Fall back to raw content when pruning removed a compact but valid page.
    markdown = fit_markdown if _is_indexable(fit_markdown) else raw_markdown
    if not _is_indexable(markdown):
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
