import asyncio
import hashlib
import re
from collections import deque
from collections.abc import Awaitable, Callable
from dataclasses import dataclass
from datetime import UTC, datetime
from urllib import robotparser
from urllib.parse import urljoin, urlsplit, urlunsplit

import httpx
from defusedxml import ElementTree as ET

from .models import CrawlRequest, CrawlType, Page, SiteAnalysis
from .normalize import (
    canonical_url,
    extract_canonical_url,
    extract_published_at,
    matches_patterns,
    normalize_markdown,
    page_from_result,
    render_markdown_table,
    truncate_utf8,
)
from .security import (
    SafeEgressProxy,
    SafeRobotsParser,
    UnsafeUrlError,
    assert_public_url,
    create_safe_client,
    filter_ssrf_route,
)

MAX_SITEMAP_BYTES = 2_000_000
MAX_REDIRECTS = 5
# The contact URL is not decoration. Wikimedia — and it is not alone — answers
# 403 to a bot that does not say who it is, for robots.txt as well as for every
# article, which made a Wikipedia crawl fail with "no indexable content".
# Measured against de.wikipedia.org: "CraChaBot/1.0" gets 403, the same string
# with "(+https://cracha-app.com)" gets 200. A browser user agent gets 403 too,
# so impersonating one is not the way out — identifying ourselves is.
USER_AGENT = "CraChaBot/1.0 (+https://cracha-app.com)"
# Probed in order once robots.txt names no sitemap.
SITEMAP_PATHS = (
    "/sitemap.xml",
    "/sitemap_index.xml",
    "/sitemap-index.xml",
    "/wp-sitemap.xml",
    "/sitemap/sitemap.xml",
)
# Counting stops here. Well past any knowledge base we would build, and the
# result is reported as truncated rather than as a total.
ANALYSIS_URL_LIMIT = 25_000
MIN_BROWSER_TIMEOUT_SECONDS = 60
MAX_BROWSER_TIMEOUT_SECONDS = 900
ProgressCallback = Callable[[dict[str, object]], Awaitable[None]]
HTML_LINK_RE = re.compile(
    r"<(a|iframe)\b[^>]*?\b(href|src)\s*=\s*['\"]([^'\"]+)['\"]",
    re.IGNORECASE,
)
DYNAMIC_PAGE_PREFIX_RE = re.compile(
    r"pageURL\s*=\s*['\"]([^'\"]+)['\"]\s*\+\s*htmlFile",
    re.IGNORECASE,
)


# Above this share of failed fetches the crawl is not a picture of the site,
# and pruning the index against it would delete pages that still exist.
MAX_FAILURE_RATIO = 0.1
# Refusals and outages, as opposed to a page that is gone. A 404 or 410 is the
# site saying the page no longer exists, which is exactly what pruning is for.
FAILED_STATUS_CODES = frozenset({401, 403, 408, 429})


@dataclass
class CrawlStats:
    """What the crawl knows about its own coverage of the site.

    The index is pruned to the pages of a crawl, so the crawl must say when it
    did not see the whole site: a re-crawl that hit its page limit, ran out of
    time or could not fetch a good share of pages would otherwise delete every
    page it merely did not reach.
    """

    failed: int = 0
    truncated: bool = False
    timed_out: bool = False

    def complete(self, pages_count: int) -> bool:
        if self.truncated or self.timed_out:
            return False
        attempted = pages_count + self.failed
        return attempted > 0 and self.failed <= MAX_FAILURE_RATIO * attempted


def _is_failed_status(status_code: object) -> bool:
    return isinstance(status_code, int) and (
        status_code >= 500 or status_code in FAILED_STATUS_CODES
    )


def _fetch_failed(error: Exception) -> bool:
    """A transient or refused fetch, not a page the site no longer has.

    ValueError covers our own refusals (off-host redirect, a non-HTML body),
    which say something about the page rather than about the site's health.
    """
    if isinstance(error, httpx.HTTPStatusError):
        return _is_failed_status(error.response.status_code)
    return isinstance(error, (httpx.TransportError, OSError))


def _wanted(url: str, request: CrawlRequest) -> bool:
    return matches_patterns(url, request.include_patterns, request.exclude_patterns)


async def _sitemap_targets(
    url: str, request: CrawlRequest, stats: CrawlStats
) -> list[str]:
    """Sitemap URLs to fetch: filtered before any request, capped at the limit.

    One URL past the limit is asked for, because that is how a sitemap that
    exactly fits is told apart from one the limit cut off.
    """
    urls, _ = await sitemap_page_urls(url, request.limit + 1)
    if len(urls) > request.limit:
        stats.truncated = True
    return [candidate for candidate in urls[: request.limit] if _wanted(candidate, request)]


async def _report_progress(
    callback: ProgressCallback | None,
    *,
    stage: str,
    current: int,
    total: int,
    pages_count: int,
    skipped_count: int,
    url: str | None = None,
) -> None:
    if callback is None:
        return
    bounded_total = max(1, total)
    bounded_current = min(current, bounded_total)
    if bounded_current > 10 and bounded_current % 5 and bounded_current < bounded_total:
        return
    await callback(
        {
            "stage": stage,
            "current": bounded_current,
            "total": bounded_total,
            "percent": round((bounded_current / bounded_total) * 100),
            "pages_count": pages_count,
            "skipped_count": skipped_count,
            "url": url,
        }
    )


async def _safe_download(client: httpx.AsyncClient, url: str) -> tuple[bytes, str]:
    current = url
    for _ in range(MAX_REDIRECTS + 1):
        await assert_public_url(current)
        async with client.stream(
            "GET", current, headers={"User-Agent": USER_AGENT}, follow_redirects=False
        ) as response:
            if response.is_redirect:
                location = response.headers.get("location")
                if not location:
                    raise httpx.HTTPStatusError(
                        "Redirect without location", request=response.request, response=response
                    )
                current = urljoin(current, location)
                continue
            response.raise_for_status()
            content_type = response.headers.get("content-type", "").lower()
            if content_type and not any(value in content_type for value in ("xml", "text")):
                raise ValueError("Sitemap response is not XML or text.")
            chunks: list[bytes] = []
            size = 0
            async for chunk in response.aiter_bytes():
                size += len(chunk)
                if size > MAX_SITEMAP_BYTES:
                    raise ValueError("Sitemap exceeds the 2 MB safety limit.")
                chunks.append(chunk)
            return b"".join(chunks), str(response.url)
    raise ValueError("Sitemap redirected too often.")


async def _dynamic_page_urls(start_url: str, source_host: str | None) -> list[str]:
    try:
        async with create_safe_client(timeout=15) as client:
            content, final_url = await _safe_download(client, start_url)
    except (httpx.HTTPError, ValueError, OSError) as error:
        print(f"[CRAWL] dynamic discovery unavailable: {type(error).__name__}: {error}")
        return []
    html = content.decode("utf-8", errors="ignore")
    prefix_match = DYNAMIC_PAGE_PREFIX_RE.search(html)
    if not prefix_match:
        return []
    prefix_url = urljoin(final_url, prefix_match.group(1))
    urls: list[str] = []
    for tag, _attribute, target in HTML_LINK_RE.findall(html):
        filename = urlsplit(target).path.rsplit("/", 1)[-1]
        if tag.lower() != "a" or not filename.lower().endswith(".html"):
            continue
        url = canonical_url(urljoin(prefix_url, filename))
        if urlsplit(url).hostname == source_host:
            urls.append(url)
    return list(dict.fromkeys(urls))


class CrawlBlockedError(RuntimeError):
    """The source refused us, as opposed to having nothing worth indexing.

    Both used to end at the same place: zero pages, and a job that failed with
    "No indexable content was found." — which sends the reader looking for a
    problem in their own site's content when the site never answered at all.
    """


async def _robots_allowed(
    client: httpx.AsyncClient,
    url: str,
    cache: dict[str, robotparser.RobotFileParser | None],
) -> str | None:
    """None when the URL may be fetched, otherwise the reason it may not.

    This returned a bare False for three different situations — robots.txt
    forbids this path, the server refused to hand out robots.txt at all, and
    robots.txt redirected off the host — and every caller then dropped the URL
    without a word. A refusal is worth saying out loud: it is the difference
    between a site that has nothing for us and a site that will not talk to us.
    """
    parsed = urlsplit(url)
    origin = urlunsplit((parsed.scheme, parsed.netloc, "", "", ""))
    if origin not in cache:
        robots_url = f"{origin}/robots.txt"
        try:
            content, final_url = await _safe_download(client, robots_url)
            if urlsplit(final_url).hostname != parsed.hostname:
                return f"robots.txt von {origin} verweist auf einen anderen Host."
            rules = robotparser.RobotFileParser(robots_url)
            rules.parse(content.decode("utf-8", errors="replace").splitlines())
            cache[origin] = rules
        except httpx.HTTPStatusError as error:
            cache[origin] = None
            if error.response.status_code in {401, 403}:
                return (
                    f"{parsed.hostname} beantwortet auch robots.txt mit "
                    f"HTTP {error.response.status_code} und sperrt uns damit aus."
                )
        except (httpx.HTTPError, ValueError, OSError):
            cache[origin] = None
    rules = cache[origin]
    if rules is not None and not rules.can_fetch(USER_AGENT, url):
        return f"robots.txt von {parsed.hostname} verbietet diese Seite."
    return None


async def _robots_sitemaps(client: httpx.AsyncClient, origin: str) -> list[str]:
    """The `Sitemap:` lines of robots.txt — the site's own answer to what exists.

    `_robots_allowed` already downloads and parses this file for its rules and
    discards these lines, which are the most reliable pointer a site gives.
    """
    try:
        content, _ = await _safe_download(client, f"{origin}/robots.txt")
    except (httpx.HTTPError, ValueError, OSError):
        return []
    rules = robotparser.RobotFileParser()
    rules.parse(content.decode("utf-8", errors="replace").splitlines())
    return list(rules.site_maps() or [])


async def _walk_sitemaps(
    client: httpx.AsyncClient,
    roots: list[str],
    source_host: str | None,
    limit: int,
    *,
    strict: bool,
) -> tuple[list[str], str | None]:
    """Breadth-first over sitemaps and sitemap indexes.

    `strict` re-raises download and parse failures, which is what an explicitly
    supplied sitemap URL needs. Discovery instead moves on to the next candidate,
    because probing conventional locations means most of them will 404.

    Returns the page URLs and the sitemap that first yielded any.
    """
    urls: list[str] = []
    seen: set[str] = set()
    origin_sitemap: str | None = None
    pending = deque((root, 0) for root in roots)
    visited: set[str] = set()

    while pending and len(urls) < limit:
        sitemap_url, depth = pending.popleft()
        sitemap_url = canonical_url(sitemap_url)
        if sitemap_url in visited or depth > 3:
            continue
        visited.add(sitemap_url)
        try:
            content, final_url = await _safe_download(client, sitemap_url)
            if urlsplit(final_url).hostname != source_host:
                raise ValueError("Sitemap redirects must remain on the source host.")
            root = ET.fromstring(content)
        except (httpx.HTTPError, ValueError, OSError, ET.ParseError):
            if strict:
                raise
            continue

        before = len(urls)
        is_index = root.tag.endswith("sitemapindex")
        for element in root.iter():
            if not element.tag.endswith("loc") or not element.text:
                continue
            candidate = canonical_url(element.text.strip())
            if urlsplit(candidate).hostname != source_host or candidate in seen:
                continue
            try:
                # A single unroutable entry should cost that entry, not the crawl.
                await assert_public_url(candidate)
            except Exception:
                continue
            if is_index:
                pending.append((candidate, depth + 1))
            else:
                seen.add(candidate)
                urls.append(candidate)
            if len(urls) >= limit:
                break
        if origin_sitemap is None and len(urls) > before:
            origin_sitemap = sitemap_url

    return urls, origin_sitemap


async def sitemap_page_urls(url: str, limit: int) -> tuple[list[str], str | None]:
    """Page URLs the site itself declares.

    Accepts a sitemap URL directly, or any page of the site — then robots.txt
    and the conventional locations are consulted, because nobody knows their own
    sitemap URL by heart.
    """
    source_host = urlsplit(url).hostname
    parsed = urlsplit(url)
    origin = urlunsplit((parsed.scheme, parsed.netloc, "", "", ""))

    async with create_safe_client(timeout=30) as client:
        urls, used = await _walk_sitemaps(client, [url], source_host, limit, strict=False)
        if urls:
            return urls, used

        candidates = await _robots_sitemaps(client, origin)
        candidates.extend(f"{origin}{path}" for path in SITEMAP_PATHS)
        roots = [
            candidate
            for candidate in dict.fromkeys(candidates)
            if urlsplit(candidate).hostname == source_host and candidate != url
        ]
        return await _walk_sitemaps(client, roots, source_host, limit, strict=False)


async def analyze_site(url: str) -> SiteAnalysis:
    """How many pages the site declares, without crawling any of them.

    Only a sitemap can answer this up front. Link-following discovers a page
    when it finds a link to it, so without a sitemap the total is knowable only
    once the crawl has finished — `total_pages` is then None rather than a guess.
    """
    await assert_public_url(url)
    urls, sitemap_url = await sitemap_page_urls(url, ANALYSIS_URL_LIMIT)
    if not urls:
        return SiteAnalysis(total_pages=None, sitemap_url=None, truncated=False)
    return SiteAnalysis(
        total_pages=len(urls),
        sitemap_url=sitemap_url,
        truncated=len(urls) >= ANALYSIS_URL_LIMIT,
    )


MAX_TABLE_ROWS = 400
BLOCK_XPATH = (
    ".//h1|.//h2|.//h3|.//h4|.//h5|.//h6|.//p|.//li|.//pre|.//blockquote|.//table|.//dt|.//dd"
)
# A block whose text sits almost entirely inside links, and enough of them, is
# navigation wearing a content tag: a language switcher, a documentation rail, a
# tag cloud. Dropping <header> outright was the obvious idea and the wrong one —
# measured against four real sites it took 13% off python.org/about, headline
# included, while leaving laravel.com and MDN untouched.
#
# The thresholds come from those same measurements rather than from taste.
# Wikipedia's language list is 105 links at a ratio of 1.00 and goes; the
# densest real content on python.org/about is 4 links at 0.98 and stays. MDN's
# densest block reaches 0.52 and is never a candidate.
NAVIGATION_LINK_RATIO = 0.9
NAVIGATION_MIN_LINKS = 10
NAVIGATION_MIN_TEXT = 120
NAVIGATION_XPATH = ".//ul|.//ol|.//div|.//header"


def _visible_text(element) -> str:
    return " ".join("".join(element.itertext()).split())


def _drop_navigation_blocks(root) -> None:
    for element in root.xpath(NAVIGATION_XPATH):
        # A parent may already have taken this subtree with it.
        if element is root or root not in element.iterancestors():
            continue
        text = _visible_text(element)
        if len(text) < NAVIGATION_MIN_TEXT:
            continue
        links = element.xpath(".//a")
        if len(links) < NAVIGATION_MIN_LINKS:
            continue
        linked = sum(len(_visible_text(link)) for link in links)
        if linked / len(text) >= NAVIGATION_LINK_RATIO:
            element.drop_tree()


def _markdown_table(table) -> str:
    """Render an HTML table as a markdown table.

    Dropping tables lost exactly the content people ask about most precisely:
    prices, versions, limits, comparisons. A single-column table is layout, not
    data, so it degrades to plain lines instead of a one-column table.
    """
    rows: list[list[str]] = []
    for row in table.xpath(".//tr")[:MAX_TABLE_ROWS]:
        cells = [
            " ".join(cell.text_content().split()).replace("|", "\\|")
            for cell in row.xpath("./th|./td")
        ]
        if any(cells):
            rows.append(cells)
    if not rows:
        return ""
    if max(len(row) for row in rows) < 2:
        return "\n".join(row[0] for row in rows if row and row[0])
    header, *body = rows
    return render_markdown_table(header, body)


def _block_markdown(element) -> str:
    tag = element.tag.lower() if isinstance(element.tag, str) else ""
    if tag == "table":
        return _markdown_table(element)
    if tag == "pre":
        # Collapsing whitespace here turned every code sample into one
        # unreadable line, which is the worst possible form for a docs crawl.
        code = element.text_content().strip("\n").rstrip()
        return f"```\n{code}\n```" if code.strip() else ""
    text = " ".join(element.text_content().split())
    if not text:
        return ""
    if len(tag) == 2 and tag[0] == "h" and tag[1].isdigit():
        return f"{'#' * int(tag[1])} {text}"
    if tag == "li":
        return f"- {text}"
    if tag == "dt":
        return f"**{text}**"
    if tag == "blockquote":
        return f"> {text}"
    return text


def _html_page(
    content: bytes, url: str, depth: int, request: CrawlRequest
) -> tuple[Page | None, list[str]]:
    from lxml import html

    document = html.fromstring(content, base_url=url)
    title = " ".join(document.xpath("//title[1]//text()") or [url]).strip()[:500]
    links = [canonical_url(urljoin(url, href)) for href in document.xpath("//a[@href]/@href")]
    # Read before the JSON-LD script tags are dropped below.
    source = content.decode("utf-8", errors="ignore")
    published_at = extract_published_at(source)
    declared_url = extract_canonical_url(source, url)
    for element in document.xpath("//script|//style|//noscript|//nav|//footer|//aside"):
        element.drop_tree()
    roots = (
        document.xpath("//main[1]")
        or document.xpath("//article[1]")
        or document.xpath("//body[1]")
        or [document]
    )
    root = roots[0]
    _drop_navigation_blocks(root)
    lines: list[str] = []
    consumed: set = set()
    for element in root.xpath(BLOCK_XPATH):
        if element in consumed:
            continue
        block = _block_markdown(element)
        if element.tag == "table":
            # Cells hold paragraphs and list items of their own; emitting those
            # again would repeat the whole table as loose text.
            consumed.update(element.iter())
        if block:
            lines.append(block)
    markdown = truncate_utf8(normalize_markdown("\n\n".join(lines)))
    page_url = canonical_url(url)
    if len(markdown) < 200 or not _wanted(page_url, request):
        return None, links
    # Two addresses of one page file under the one the site names, so the
    # dictionary keyed by URL keeps a single entry for it.
    if declared_url and _wanted(declared_url, request):
        page_url = declared_url
    return Page(
        url=page_url,
        title=title or page_url,
        markdown=markdown,
        checksum=hashlib.sha256(markdown.encode("utf-8")).hexdigest(),
        crawled_at=datetime.now(UTC).isoformat(),
        depth=depth,
        published_at=published_at,
    ), links


async def _http_fallback_pages(
    request: CrawlRequest,
    on_progress: ProgressCallback | None = None,
    on_page: Callable[[Page], Awaitable[None]] | None = None,
    *,
    stats: CrawlStats | None = None,
) -> tuple[list[Page], int]:
    stats = stats if stats is not None else CrawlStats()
    start_url = canonical_url(str(request.url))
    source_host = urlsplit(start_url).hostname
    initial_urls = (
        (await _sitemap_targets(start_url, request, stats)) or [start_url]
        if request.type is CrawlType.SITEMAP
        else [start_url]
    )
    pending = deque((url, 0) for url in initial_urls)
    visited: set[str] = set()
    pages: dict[str, Page] = {}
    skipped = 0
    # Why the URL the user actually typed was dropped, if it was. Everything
    # below it can fail for ordinary reasons; that one failing is the whole job.
    blocked_start: str | None = None
    robots_cache: dict[str, robotparser.RobotFileParser | None] = {}
    async with create_safe_client(timeout=45) as client:
        while pending and len(pages) < request.limit:
            url, depth = pending.popleft()
            url = canonical_url(url)
            if url in visited or depth > request.max_depth:
                continue
            visited.add(url)
            if urlsplit(url).hostname != source_host:
                skipped += 1
                continue
            if request.respect_robots_txt:
                refusal = await _robots_allowed(client, url, robots_cache)
                if refusal:
                    print(f"[WARN] HTTP fallback skipped {url} ({refusal})")
                    if url == start_url:
                        blocked_start = refusal
                    skipped += 1
                    continue
            try:
                content, final_url = await _safe_download(client, url)
                if urlsplit(final_url).hostname != source_host:
                    raise ValueError("Redirect must remain on the source host.")
                page, links = _html_page(content, final_url, depth, request)
            except (httpx.HTTPError, ValueError, OSError) as error:
                print(
                    f"[WARN] HTTP fallback skipped {url} "
                    f"({type(error).__name__}: {error})"
                )
                if _fetch_failed(error):
                    stats.failed += 1
                if url == start_url:
                    status = getattr(getattr(error, "response", None), "status_code", None)
                    blocked_start = (
                        f"{source_host} hat die Seite mit HTTP {status} abgelehnt."
                        if status
                        else f"{source_host} war nicht erreichbar ({type(error).__name__})."
                    )
                skipped += 1
                await _report_progress(
                    on_progress,
                    stage="crawling",
                    current=len(visited),
                    total=request.limit,
                    pages_count=len(pages),
                    skipped_count=skipped,
                    url=url,
                )
                continue
            if page:
                pages[page.url] = page
                if on_page:
                    await on_page(page)
            else:
                print(
                    f"[WARN] HTTP fallback found no indexable content at {final_url} "
                    f"({len(content)} bytes; include={request.include_patterns}; "
                    f"exclude={request.exclude_patterns})"
                )
                skipped += 1
            if request.type is CrawlType.RECURSIVE and depth < request.max_depth:
                for link in links:
                    # Filtered before the request rather than after it: an
                    # excluded page costs neither a fetch nor a place in the
                    # limit. Only the start URL is fetched regardless, because
                    # its links are how the wanted pages are found.
                    if (
                        link not in visited
                        and urlsplit(link).hostname == source_host
                        and _wanted(link, request)
                    ):
                        pending.append((link, depth + 1))
            await _report_progress(
                on_progress,
                stage="crawling",
                current=len(visited),
                total=request.limit,
                pages_count=len(pages),
                skipped_count=skipped,
                url=final_url,
            )
    if len(pages) >= request.limit and any(
        url not in visited and depth <= request.max_depth for url, depth in pending
    ):
        stats.truncated = True
    if not pages and blocked_start:
        raise CrawlBlockedError(blocked_start)
    return list(pages.values()), skipped


async def _http_direct_pages(
    request: CrawlRequest,
    urls: list[str],
    on_progress: ProgressCallback | None = None,
    on_page: Callable[[Page], Awaitable[None]] | None = None,
    *,
    stats: CrawlStats | None = None,
) -> tuple[list[Page], int]:
    stats = stats if stats is not None else CrawlStats()
    pages: dict[str, Page] = {}
    skipped = 0
    lock = asyncio.Lock()
    semaphore = asyncio.Semaphore(10)
    robots_cache: dict[str, robotparser.RobotFileParser | None] = {}

    async with create_safe_client(timeout=30) as client:
        if request.respect_robots_txt:
            await _robots_allowed(client, urls[0], robots_cache)

        async def fetch(url: str) -> None:
            nonlocal skipped
            page: Page | None = None
            final_url = url
            try:
                if request.respect_robots_txt:
                    refusal = await _robots_allowed(client, url, robots_cache)
                    if refusal:
                        raise ValueError(refusal)
                async with semaphore:
                    content, final_url = await _safe_download(client, url)
                if urlsplit(final_url).hostname != urlsplit(str(request.url)).hostname:
                    raise ValueError("Redirect must remain on the source host.")
                page, _links = _html_page(content, final_url, 1, request)
            except (httpx.HTTPError, ValueError, OSError) as error:
                # Swallowing this without a word is how a whole crawl came back
                # empty with nothing in the log to say which URL failed or why.
                print(f"[WARN] Skipped {url} ({type(error).__name__}: {error})")
                if _fetch_failed(error):
                    stats.failed += 1
            async with lock:
                if page:
                    pages[page.url] = page
                    if on_page:
                        await on_page(page)
                else:
                    skipped += 1
                await _report_progress(
                    on_progress,
                    stage="crawling",
                    current=len(pages) + skipped,
                    total=len(urls),
                    pages_count=len(pages),
                    skipped_count=skipped,
                    url=final_url,
                )

        await asyncio.gather(*(fetch(url) for url in urls))
    return list(pages.values()), skipped


async def _crawl4ai_pages(
    request: CrawlRequest,
    on_progress: ProgressCallback | None = None,
    on_page: Callable[[Page], Awaitable[None]] | None = None,
    *,
    stats: CrawlStats | None = None,
) -> tuple[list[Page], int]:
    from crawl4ai import AsyncWebCrawler, BrowserConfig, CacheMode, CrawlerRunConfig
    from crawl4ai.content_filter_strategy import PruningContentFilter
    from crawl4ai.content_scraping_strategy import LXMLWebScrapingStrategy
    from crawl4ai.markdown_generation_strategy import DefaultMarkdownGenerator

    stats = stats if stats is not None else CrawlStats()
    start_url = str(request.url)
    proxy = SafeEgressProxy()
    try:
        await proxy.start()
    except Exception as exc:
        raise CrawlBlockedError(f"Secure egress proxy failed to start: {exc}") from exc

    browser_config = BrowserConfig(
            browser_type="chromium",
            headless=True,
            text_mode=True,
            light_mode=True,
            verbose=False,
            # The browser sends this, not the run config. Without it Chromium used
            # its own headless default and a site that screens user agents refused
            # every page — the run config's user_agent never reached the wire, so
            # the browser pass returned nothing and the failure looked like empty
            # content rather than a rejected request.
            user_agent=USER_AGENT,
            proxy_config=f"http://127.0.0.1:{proxy.port}",
            extra_args=[
                "--no-sandbox",
                "--disable-dev-shm-usage",
                "--disable-gpu",
                f"--proxy-server=http://127.0.0.1:{proxy.port}",
                "--proxy-bypass-list=<-loopback>",
            ],
        )
    run_options = {
        "cache_mode": CacheMode.BYPASS,
        "verbose": False,
        "check_robots_txt": request.respect_robots_txt,
        "user_agent": USER_AGENT,
        "exclude_external_links": True,
        "excluded_tags": ["nav", "footer", "aside", "script", "style", "noscript"],
        # remove_overlay_elements is deliberately absent. It runs a script in
        # the page that deletes whatever it takes for a modal, and on two of
        # five sites measured it deleted the article: de.wikipedia.org went from
        # 35124 characters of markdown to 29, heise.de from 1326 to 1. On the
        # three it did not break — laravel.com, python.org, MDN — it removed
        # between 200 and 1300 characters of ordinary content. It never once
        # helped. Cookie banners are what we actually wanted gone, and
        # remove_consent_popups does that without the collateral.
        "remove_consent_popups": True,
        # Measured against the real webmen team page and laravel.com/docs: the
        # markdown is byte for byte identical at 5 and at 20, because the
        # pruning content filter decides what survives, not this. Lowering it
        # buys nothing, so it keeps its value.
        "word_count_threshold": 20,
        # Structured tables are what repairs the rows the markdown generator
        # mangles; 5 admits ordinary documentation tables that the stricter
        # default score treats as layout.
        "table_score_threshold": 5,
        "page_timeout": 30_000,
        "delay_before_return_html": 0.5,
        "wait_for_images": False,
        "preserve_https_for_internal_links": True,
        "scraping_strategy": LXMLWebScrapingStrategy(),
        "markdown_generator": DefaultMarkdownGenerator(
            content_filter=PruningContentFilter(
                threshold=0.35,
                threshold_type="dynamic",
                # Names, API members and compact lists are valid RAG content.
                min_word_threshold=0,
            )
        ),
    }

    if request.type in {CrawlType.RECURSIVE, CrawlType.SITEMAP}:
        run_options["stream"] = True

    config = CrawlerRunConfig(**run_options)
    pages_by_url: dict[str, Page] = {}
    skipped = 0
    processed = 0
    source_host = urlsplit(start_url).hostname
    expected_total = 1
    dynamic_page_urls = (
        await _dynamic_page_urls(start_url, source_host)
        if request.type is CrawlType.RECURSIVE
        else []
    )
    if dynamic_page_urls:
        # This path never starts the browser, so the proxy's finally below
        # would not run; close it here instead.
        await proxy.close()
        wanted_urls = [url for url in dynamic_page_urls if _wanted(url, request)]
        if len(wanted_urls) > request.limit:
            stats.truncated = True
        return await _http_direct_pages(
            request, wanted_urls[: request.limit], on_progress, on_page, stats=stats
        )

    async def collect(result, depth: int = 0) -> tuple[list[str], list[str]]:
        nonlocal processed, skipped
        processed += 1
        # robots.txt refusing a page is the owner's wish, not an outage.
        refused_by_robots = "robots.txt" in str(getattr(result, "error_message", "") or "")
        if not refused_by_robots and (
            not getattr(result, "success", False)
            or _is_failed_status(getattr(result, "status_code", None))
        ):
            stats.failed += 1
        result_url = str(getattr(result, "redirected_url", None) or getattr(result, "url", ""))
        try:
            await assert_public_url(result_url)
        except (ValueError, OSError):
            skipped += 1
        else:
            if urlsplit(result_url).hostname != source_host:
                skipped += 1
            else:
                html = str(getattr(result, "html", "") or "")
                embedded_links = [
                    canonical_url(urljoin(result_url or start_url, target))
                    for tag, _attribute, target in HTML_LINK_RE.findall(html)
                    if tag.lower() == "iframe" and target.strip()
                ]
                route_wrapper = bool(embedded_links and urlsplit(result_url).fragment)
                page = None if route_wrapper else page_from_result(
                    result, request.include_patterns, request.exclude_patterns
                )
                if page:
                    page.depth = depth
                    pages_by_url[page.url] = page
                    if on_page:
                        await on_page(page)
                elif not route_wrapper:
                    # "Crawl4AI returned no indexable pages" was the only trace
                    # this left, which is true of a refused request and of a
                    # fetch that worked and was then thrown away by the
                    # extraction. Those need different fixes.
                    markdown = getattr(getattr(result, "markdown", None), "fit_markdown", "")
                    print(
                        f"[WARN] Browser pass dropped {result_url} "
                        f"(status={getattr(result, 'status_code', None)}, "
                        f"html={len(html)}, markdown={len(markdown or '')})"
                    )
                    skipped += 1
        await _report_progress(
            on_progress,
            stage="crawling",
            current=len(pages_by_url),
            total=expected_total,
            pages_count=len(pages_by_url),
            skipped_count=skipped,
            url=result_url or None,
        )
        links = getattr(result, "links", None) or {}
        internal_links = links.get("internal", []) if isinstance(links, dict) else []
        discovered_links: list[str] = []
        for link in internal_links:
            href = link.get("href") if isinstance(link, dict) else getattr(link, "href", None)
            if not href:
                continue
            link_url = canonical_url(urljoin(result_url or start_url, str(href)))
            if urlsplit(link_url).hostname == source_host:
                discovered_links.append(link_url)
        html = str(getattr(result, "html", "") or "")
        dom_links = [
            canonical_url(urljoin(result_url or start_url, target))
            for tag, _attribute, target in HTML_LINK_RE.findall(html)
            if tag.lower() == "a"
            and target.strip()
            and urlsplit(urljoin(result_url or start_url, target)).hostname == source_host
        ]
        embedded_links = [
            canonical_url(urljoin(result_url or start_url, target))
            for tag, _attribute, target in HTML_LINK_RE.findall(html)
            if tag.lower() == "iframe"
            and target.strip()
            and urlsplit(urljoin(result_url or start_url, target)).hostname == source_host
        ]
        rewritten_links: list[str] = []
        prefix_match = DYNAMIC_PAGE_PREFIX_RE.search(html)
        if prefix_match:
            prefix_url = urljoin(result_url or start_url, prefix_match.group(1))
            for link_url in dom_links + discovered_links:
                filename = urlsplit(link_url).path.rsplit("/", 1)[-1]
                if filename.lower().endswith(".html"):
                    rewritten_links.append(canonical_url(urljoin(prefix_url, filename)))
        return rewritten_links + dom_links + discovered_links, embedded_links

    async def consume(results, depth: int = 0) -> tuple[list[str], list[str]]:
        discovered_links: list[str] = []
        embedded_links: list[str] = []
        if hasattr(results, "__aiter__"):
            async for result in results:
                discovered, embedded = await collect(result, depth)
                discovered_links.extend(discovered)
                embedded_links.extend(embedded)
        elif isinstance(results, list):
            for result in results:
                discovered, embedded = await collect(result, depth)
                discovered_links.extend(discovered)
                embedded_links.extend(embedded)
        else:
            discovered, embedded = await collect(results, depth)
            discovered_links.extend(discovered)
            embedded_links.extend(embedded)
        return discovered_links, embedded_links

    async def _on_page_context_created(page, context=None, **kwargs):
        if page:
            await page.route("**/*", filter_ssrf_route)
        return page

    try:
        async with AsyncWebCrawler(config=browser_config) as crawler:
            crawler.robots_parser = SafeRobotsParser()
            crawler.crawler_strategy.set_hook("on_page_context_created", _on_page_context_created)
            if request.type is CrawlType.RECURSIVE:
                # Process one breadth-first depth at a time. Pages within a depth
                # render concurrently, while links come from the rendered DOM so
                # JavaScript documentation sites expose their real content URLs.
                current_urls = [start_url]
                visited: set[str] = set()
                expected_total = request.limit
                def take(urls: list[str], filtered: bool) -> list[str]:
                    # Include/exclude apply before the request, so an excluded
                    # page costs neither a render nor a place in the limit. The
                    # start URL is exempt: its links are how the wanted pages
                    # are found, and it is still only indexed if it matches.
                    batch: list[str] = []
                    for url in dict.fromkeys(urls):
                        normalized = canonical_url(url)
                        if normalized in visited or (filtered and not _wanted(normalized, request)):
                            continue
                        if len(pages_by_url) + len(batch) >= request.limit:
                            # A wanted page is left over: the limit, not the
                            # site, ended this crawl.
                            stats.truncated = True
                            break
                        visited.add(normalized)
                        batch.append(normalized)
                    return batch

                for depth in range(request.max_depth + 1):
                    batch = take(current_urls, filtered=depth > 0)
                    if not batch:
                        break
                    results = await crawler.arun_many(urls=batch, config=config)
                    discovered_links, embedded_links = await consume(results, depth)
                    if depth == 0 and dynamic_page_urls:
                        discovered_links = dynamic_page_urls + discovered_links
                    while embedded_links:
                        embedded_batch = take(embedded_links, filtered=True)
                        if not embedded_batch:
                            break
                        embedded_results = await crawler.arun_many(
                            urls=embedded_batch, config=config
                        )
                        nested_links, embedded_links = await consume(embedded_results, depth)
                        discovered_links.extend(nested_links)
                    current_urls = list(dict.fromkeys(discovered_links))
                    if len(pages_by_url) >= request.limit:
                        if depth < request.max_depth:
                            take(current_urls, filtered=True)
                        break
            elif request.type is CrawlType.SITEMAP:
                urls = await _sitemap_targets(start_url, request, stats)
                if not urls:
                    raise ValueError("No sitemap was found for this site.")
                expected_total = max(1, len(urls))
                results = await crawler.arun_many(urls=urls, config=config)
                await consume(results)
            else:
                results = await crawler.arun(url=start_url, config=config)
                await consume(results)
            if pages_by_url and len(pages_by_url) < expected_total:
                await _report_progress(
                    on_progress,
                    stage="crawling",
                    current=len(pages_by_url),
                    total=len(pages_by_url),
                    pages_count=len(pages_by_url),
                    skipped_count=skipped,
                )
            return list(pages_by_url.values()), skipped
    finally:
        await proxy.close()


async def crawl_pages(
    request: CrawlRequest,
    on_progress: ProgressCallback | None = None,
    on_page: Callable[[Page], Awaitable[None]] | None = None,
    stats: CrawlStats | None = None,
) -> tuple[list[Page], int]:
    """Crawl the site; `stats`, if given, is filled with the crawl's coverage.

    The coverage describes the pass whose pages are returned, plus whether the
    browser pass ran out of time before the fallback took over.
    """
    stats = stats if stats is not None else CrawlStats()
    await assert_public_url(str(request.url))
    browser_timeout = min(
        MAX_BROWSER_TIMEOUT_SECONDS,
        max(MIN_BROWSER_TIMEOUT_SECONDS, request.limit * 5),
    )
    # A page is streamed to the caller once per crawl, never once per pass.
    # The browser pass hands over what it collected before it dies, and the
    # HTTP fallback then re-crawls the same site from the start: without this
    # the caller sees every shared page twice, and a caller that counts pages
    # is billing for the retry.
    streamed: set[str] = set()

    async def stream_once(page: Page) -> None:
        # Each pass keeps to the limit on its own, but their union need not.
        # The limit is what the crawl's credits were held against, and the
        # status endpoint refuses more than five hundred keys, so the ceiling
        # has to hold across passes rather than within one.
        if on_page is None or page.url in streamed:
            return
        if len(streamed) >= request.limit:
            stats.truncated = True
            return
        streamed.add(page.url)
        await on_page(page)

    forward = stream_once if on_page else None

    browser_stats = CrawlStats()
    try:
        async with asyncio.timeout(browser_timeout):
            pages, skipped = await _crawl4ai_pages(
                request, on_progress, forward, stats=browser_stats
            )
        if pages:
            stats.failed = browser_stats.failed
            stats.truncated = stats.truncated or browser_stats.truncated
            return pages, skipped
        print("[WARN] Crawl4AI returned no indexable pages; using the HTTP fallback.")
    except (UnsafeUrlError, CrawlBlockedError):
        raise
    except Exception as error:
        # The browser pass already streamed part of the site, and the fallback
        # that follows is a second, cruder look at it. Neither is the whole
        # site as the browser would have seen it.
        if isinstance(error, TimeoutError):
            stats.timed_out = True
        print(
            f"[WARN] Crawl4AI unavailable ({type(error).__name__}: {error}); "
            "using the HTTP fallback."
        )

    fallback_stats = CrawlStats()
    result = await _http_fallback_pages(request, on_progress, forward, stats=fallback_stats)
    stats.failed = fallback_stats.failed
    stats.truncated = stats.truncated or fallback_stats.truncated
    return result
