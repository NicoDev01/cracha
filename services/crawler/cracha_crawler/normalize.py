import fnmatch
import hashlib
import re
from collections import deque
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


# Publication dates live in a handful of well-established places. Anything
# else is prose and would be guesswork.
_META_DATE_RE = re.compile(
    r"<meta\b[^>]*?\b(?:property|name|itemprop)\s*=\s*['\"]"
    r"(article:published_time|article:modified_time|og:published_time|datePublished"
    r"|dateModified|pubdate|publish[-_]?date|date)['\"][^>]*?>",
    re.IGNORECASE,
)
_META_CONTENT_RE = re.compile(r"\bcontent\s*=\s*['\"]([^'\"]+)['\"]", re.IGNORECASE)
_TIME_TAG_RE = re.compile(
    r"<time\b[^>]*?\bdatetime\s*=\s*['\"]([^'\"]+)['\"]", re.IGNORECASE
)
_JSON_LD_DATE_RE = re.compile(
    r"\"(?:datePublished|dateCreated|dateModified)\"\s*:\s*\"([^\"]+)\"", re.IGNORECASE
)
_ISO_DATE_RE = re.compile(r"^(\d{4})-(\d{2})-(\d{2})")
# Ordered by trustworthiness: an explicit publication date beats a modification
# date, which beats whatever the first <time> element happens to hold.
_DATE_PRIORITY = (
    "article:published_time",
    "og:published_time",
    "datepublished",
    "pubdate",
    "publish-date",
    "publish_date",
    "publishdate",
    "date",
    "article:modified_time",
    "datemodified",
    "datecreated",
)


def _normalize_date(value: str) -> str | None:
    """Return an ISO 8601 timestamp, or None if the value is not a date.

    The declared offset is kept as written; rewriting it to UTC would move the
    stated moment. A date without a time is anchored at midnight UTC so AI
    Search can store it as a datetime and comparisons stay meaningful.
    """
    text = value.strip()
    match = _ISO_DATE_RE.match(text)
    if not match:
        return None
    try:
        parsed = datetime.fromisoformat(text.replace("Z", "+00:00"))
    except ValueError:
        try:
            parsed = datetime(int(match.group(1)), int(match.group(2)), int(match.group(3)))
        except ValueError:
            return None
    if parsed.tzinfo is None:
        parsed = parsed.replace(tzinfo=UTC)
    return parsed.isoformat()


def extract_published_at(html: str) -> str | None:
    """Read the publication date a page declares, if it declares one.

    Absent is a valid answer: dating a page by guesswork would rank sources by
    a number nobody wrote.
    """
    if not html:
        return None
    found: dict[str, str] = {}
    for tag in _META_DATE_RE.finditer(html):
        content = _META_CONTENT_RE.search(tag.group(0))
        if not content:
            continue
        normalized = _normalize_date(content.group(1))
        if normalized:
            found.setdefault(tag.group(1).lower(), normalized)
    for key in _DATE_PRIORITY:
        if key in found:
            return found[key]

    for match in _JSON_LD_DATE_RE.finditer(html):
        normalized = _normalize_date(match.group(1))
        if normalized:
            return normalized
    for match in _TIME_TAG_RE.finditer(html):
        normalized = _normalize_date(match.group(1))
        if normalized:
            return normalized
    return None


# A syntax highlighter's line-number gutter, glued to the code because the
# gutter is a separate element: "1use App\Jobs\ProcessPodcast;".
LINE_NUMBER_PREFIX_RE = re.compile(r"^(\d{1,4})(\S.*)$")


def _collapse_blank_runs(lines: list[str]) -> list[str]:
    collapsed: list[str] = []
    blank = 0
    for line in lines:
        if line.strip():
            blank = 0
            collapsed.append(line)
            continue
        blank += 1
        if blank == 1:
            collapsed.append("")
    while collapsed and not collapsed[-1].strip():
        collapsed.pop()
    return collapsed


def _clean_fence_body(body: str) -> str:
    lines = body.splitlines()
    numbered: list[tuple[str, str]] = []
    bare_numbers: list[str] = []
    plain: list[str] = []
    for line in lines:
        stripped = line.strip()
        match = LINE_NUMBER_PREFIX_RE.match(stripped)
        if match:
            numbered.append((line, match.group(2)))
        # A gutter entry for a blank line of code leaves the number alone.
        elif stripped.isdigit():
            bare_numbers.append(line)
        elif stripped:
            plain.append(line)

    if numbered:
        # Only drop the gutter copy when the clean copy is demonstrably there.
        # Whitespace is compared away because the gutter rendering loses it:
        # "1php artisanqueue:work--queue=high,default".
        compact = {re.sub(r"\s+", "", line) for line in plain}
        duplicated = sum(1 for _, code in numbered if re.sub(r"\s+", "", code) in compact)
        if duplicated * 2 >= len(numbered):
            # The bare numbers only go once the gutter itself is established;
            # on their own they could be a numbered list inside a sample.
            gutter = {line for line, _ in numbered} | set(bare_numbers)
            lines = [line for line in lines if line not in gutter]

    return "\n".join(_collapse_blank_runs(lines))


def clean_code_fences(markdown: str) -> str:
    """Remove a highlighter's duplicated, whitespace-stripped copy of a sample.

    laravel.com renders every sample twice: once through a line-number gutter
    that glues the number to the code and eats the spaces, once clean. Both end
    up inside the same fence, and a chunk containing only the first copy makes
    an answer reproduce broken commands. Nothing is dropped unless the intact
    copy is present in the same fence.

    Blank runs inside a fence collapse to one line. The highlighter emitted two
    or three between every line of code, which was more than half the page.
    """
    segments: list[str] = []
    position = 0
    for fence in FENCED_CODE_RE.finditer(markdown):
        segments.append(markdown[position : fence.start()])
        lines = fence.group(0).splitlines()
        if len(lines) < 3:
            segments.append(fence.group(0))
        else:
            opener, *rest = lines
            closing = rest.pop() if rest and rest[-1].strip().startswith(("```", "~~~")) else None
            body = _clean_fence_body("\n".join(rest))
            segments.append("\n".join([opener, body] + ([closing] if closing is not None else [])))
        position = fence.end()
    segments.append(markdown[position:])
    return "".join(segments)


HEADING_RE = re.compile(r"(?m)^[ \t]{0,3}(#{1,6})[ \t]+(.+?)[ \t]*#*[ \t]*$")
LIST_ITEM_RE = re.compile(r"^[ \t]*(?:[-*+]|\d+[.)])[ \t]+(.+?)[ \t]*$")
# A table of contents is a run of entries, not a pair of them.
MIN_CONTENTS_ENTRIES = 5
# Nearly all of them must be headings; a stray entry that links elsewhere is
# normal in a table of contents.
MIN_CONTENTS_MATCH = 0.8


def _comparable(value: str) -> str:
    return re.sub(r"[^0-9a-z]+", " ", value.casefold()).strip()


def drop_duplicate_table_of_contents(markdown: str) -> str:
    """Remove an in-page table of contents whose entries are headings below it.

    Documentation pages carry one on every page: laravel.com/docs repeats 63
    section names as a list before the first paragraph. A chunk made of nothing
    but section names matches many questions and answers none of them.

    Only a run whose entries are headings of the same document is dropped, so
    the text is still there — as the headings it was copying.
    """
    headings = {
        _comparable(match.group(2)) for match in HEADING_RE.finditer(markdown)
    }
    if not headings:
        return markdown

    lines = markdown.splitlines(keepends=True)
    kept: list[str] = []
    run: list[tuple[str, str]] = []

    def flush() -> None:
        if not run:
            return
        entries = [text for _, text in run if text]
        matched = sum(1 for text in entries if _comparable(text) in headings)
        is_contents = (
            len(entries) >= MIN_CONTENTS_ENTRIES
            and matched >= MIN_CONTENTS_MATCH * len(entries)
        )
        if not is_contents:
            kept.extend(line for line, _ in run)
        run.clear()

    for line in lines:
        match = LIST_ITEM_RE.match(line.rstrip("\r\n"))
        if match:
            # Long entries are prose, not navigation.
            run.append((line, match.group(1) if len(match.group(1)) <= 120 else ""))
            continue
        if not line.strip() and run:
            # A blank line inside a loose list does not end the run.
            run.append((line, ""))
            continue
        flush()
        kept.append(line)
    flush()
    return "".join(kept)


MARKDOWN_TABLE_BLOCK_RE = re.compile(r"(?m)^(?:[ \t]{0,3}\|.*\|[ \t]*\n?){2,}")


def render_markdown_table(headers: list[str], rows: list[list[str]]) -> str:
    """Render a header and rows as a markdown table with a stable width."""
    cleaned_rows = [
        [" ".join(str(cell).split()).replace("|", "\\|") for cell in row] for row in rows
    ]
    cleaned_headers = [" ".join(str(cell).split()).replace("|", "\\|") for cell in headers]
    width = max(len(cleaned_headers), *(len(row) for row in cleaned_rows), 0)
    if width < 2:
        return ""
    padded = [
        row + [""] * (width - len(row))
        for row in [cleaned_headers, *cleaned_rows]
    ]
    header, *body = padded
    lines = ["| " + " | ".join(header) + " |", "| " + " | ".join(["---"] * width) + " |"]
    lines.extend("| " + " | ".join(row) + " |" for row in body)
    return "\n".join(lines)


def _table_cells(line: str) -> list[str]:
    stripped = line.strip()
    if not stripped.startswith("|"):
        return []
    return [cell.strip() for cell in stripped.strip("|").split("|")]


def restore_tables(markdown: str, tables: list[dict] | None) -> str:
    """Replace mangled markdown tables with Crawl4AI's structured extraction.

    A cell whose only content is a same-page anchor, `<a href="#daily-requests">
    Requests</a>`, disappears from the generated markdown, leaving the row
    "| 100,000/day | No limit |" — a number with nothing to say what it counts.
    Docs tables label their rows that way constantly. The structured extractor
    reads the cell text and keeps it.

    Tables are matched by their header row, so a block that has no counterpart
    is left exactly as it was.
    """
    if not tables:
        return markdown

    by_headers: dict[tuple[str, ...], deque[dict]] = {}
    for table in tables:
        headers = tuple(_comparable(str(cell)) for cell in table.get("headers") or [])
        if not headers or not table.get("rows"):
            continue
        by_headers.setdefault(headers, deque()).append(table)
    if not by_headers:
        return markdown

    def replace(match: re.Match[str]) -> str:
        block = match.group(0)
        lines = [line for line in block.splitlines() if line.strip()]
        if len(lines) < 2:
            return block
        headers = tuple(_comparable(cell) for cell in _table_cells(lines[0]))
        queue = by_headers.get(headers)
        if not queue:
            return block
        rendered = render_markdown_table(queue[0]["headers"], queue[0]["rows"])
        if not rendered:
            return block
        queue.popleft()
        if not queue:
            by_headers.pop(headers, None)
        return f"{rendered}\n"

    return MARKDOWN_TABLE_BLOCK_RE.sub(replace, markdown)


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
    text = clean_code_fences(strip_markdown_links(markdown.replace("\x00", "")))
    text = drop_duplicate_table_of_contents(text)
    text = re.sub(r"[ \t]+\n", "\n", text)
    # One blank line separates blocks in markdown; more is rendering noise that
    # only costs index space. Fenced code was already normalised above and is
    # not affected by a pattern this loose.
    text = re.sub(r"\n{3,}", "\n\n", text)
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
    markdown = truncate_utf8(restore_tables(markdown, getattr(result, "tables", None)))

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
        published_at=extract_published_at(str(getattr(result, "html", "") or "")),
    )
