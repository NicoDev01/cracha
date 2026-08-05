import asyncio
import hashlib
import re
from collections import deque
from collections.abc import Awaitable, Callable
from datetime import UTC, datetime
from urllib import robotparser
from urllib.parse import urljoin, urlsplit, urlunsplit

import httpx
from defusedxml import ElementTree as ET

from .models import CrawlRequest, CrawlType, Page
from .normalize import (
    canonical_url,
    matches_patterns,
    normalize_markdown,
    page_from_result,
    truncate_utf8,
)
from .security import assert_public_url

MAX_SITEMAP_BYTES = 2_000_000
MAX_REDIRECTS = 5
USER_AGENT = "CraChaBot/1.0"
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
        async with httpx.AsyncClient(timeout=15) as client:
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


async def _robots_allowed(
    client: httpx.AsyncClient,
    url: str,
    cache: dict[str, robotparser.RobotFileParser | None],
) -> bool:
    parsed = urlsplit(url)
    origin = urlunsplit((parsed.scheme, parsed.netloc, "", "", ""))
    if origin not in cache:
        robots_url = f"{origin}/robots.txt"
        try:
            content, final_url = await _safe_download(client, robots_url)
            if urlsplit(final_url).hostname != parsed.hostname:
                return False
            rules = robotparser.RobotFileParser(robots_url)
            rules.parse(content.decode("utf-8", errors="replace").splitlines())
            cache[origin] = rules
        except httpx.HTTPStatusError as error:
            cache[origin] = None
            if error.response.status_code in {401, 403}:
                return False
        except (httpx.HTTPError, ValueError, OSError):
            cache[origin] = None
    rules = cache[origin]
    return rules is None or rules.can_fetch(USER_AGENT, url)


async def _sitemap_urls(url: str, limit: int) -> list[str]:
    source_host = urlsplit(url).hostname
    urls: list[str] = []
    pending = deque([(url, 0)])
    visited: set[str] = set()
    async with httpx.AsyncClient(timeout=30) as client:
        while pending and len(urls) < limit:
            sitemap_url, depth = pending.popleft()
            sitemap_url = canonical_url(sitemap_url)
            if sitemap_url in visited or depth > 3:
                continue
            visited.add(sitemap_url)
            content, final_url = await _safe_download(client, sitemap_url)
            if urlsplit(final_url).hostname != source_host:
                raise ValueError("Sitemap redirects must remain on the source host.")
            root = ET.fromstring(content)
            is_index = root.tag.endswith("sitemapindex")
            for element in root.iter():
                if not element.tag.endswith("loc") or not element.text:
                    continue
                candidate = canonical_url(element.text.strip())
                if urlsplit(candidate).hostname != source_host:
                    continue
                await assert_public_url(candidate)
                if is_index:
                    pending.append((candidate, depth + 1))
                elif candidate not in urls:
                    urls.append(candidate)
                if len(urls) >= limit:
                    break
    return urls


def _html_page(
    content: bytes, url: str, depth: int, request: CrawlRequest
) -> tuple[Page | None, list[str]]:
    from lxml import html

    document = html.fromstring(content, base_url=url)
    title = " ".join(document.xpath("//title[1]//text()") or [url]).strip()[:500]
    links = [canonical_url(urljoin(url, href)) for href in document.xpath("//a[@href]/@href")]
    for element in document.xpath("//script|//style|//noscript|//nav|//footer|//aside"):
        element.drop_tree()
    roots = (
        document.xpath("//main[1]")
        or document.xpath("//article[1]")
        or document.xpath("//body[1]")
        or [document]
    )
    root = roots[0]
    lines: list[str] = []
    for element in root.xpath(".//h1|.//h2|.//h3|.//h4|.//p|.//li|.//pre|.//blockquote"):
        text = " ".join(element.text_content().split())
        if not text:
            continue
        tag = element.tag.lower()
        if tag.startswith("h") and len(tag) == 2 and tag[1].isdigit():
            text = f"{'#' * int(tag[1])} {text}"
        elif tag == "li":
            text = f"- {text}"
        elif tag == "blockquote":
            text = f"> {text}"
        lines.append(text)
    markdown = truncate_utf8(normalize_markdown("\n\n".join(lines)))
    page_url = canonical_url(url)
    if len(markdown) < 200 or not matches_patterns(
        page_url, request.include_patterns, request.exclude_patterns
    ):
        return None, links
    return Page(
        url=page_url,
        title=title or page_url,
        markdown=markdown,
        checksum=hashlib.sha256(markdown.encode("utf-8")).hexdigest(),
        crawled_at=datetime.now(UTC).isoformat(),
        depth=depth,
    ), links


async def _http_fallback_pages(
    request: CrawlRequest, on_progress: ProgressCallback | None = None
) -> tuple[list[Page], int]:
    start_url = canonical_url(str(request.url))
    source_host = urlsplit(start_url).hostname
    initial_urls = (
        await _sitemap_urls(start_url, request.limit)
        if request.type is CrawlType.SITEMAP
        else [start_url]
    )
    pending = deque((url, 0) for url in initial_urls)
    visited: set[str] = set()
    pages: dict[str, Page] = {}
    skipped = 0
    robots_cache: dict[str, robotparser.RobotFileParser | None] = {}
    async with httpx.AsyncClient(timeout=45) as client:
        while pending and len(pages) < request.limit:
            url, depth = pending.popleft()
            url = canonical_url(url)
            if url in visited or depth > request.max_depth:
                continue
            visited.add(url)
            if urlsplit(url).hostname != source_host:
                skipped += 1
                continue
            if request.respect_robots_txt and not await _robots_allowed(client, url, robots_cache):
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
            else:
                print(
                    f"[WARN] HTTP fallback found no indexable content at {final_url} "
                    f"({len(content)} bytes; include={request.include_patterns}; "
                    f"exclude={request.exclude_patterns})"
                )
                skipped += 1
            if request.type is CrawlType.RECURSIVE and depth < request.max_depth:
                for link in links:
                    if link not in visited and urlsplit(link).hostname == source_host:
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
    return list(pages.values()), skipped


async def _http_direct_pages(
    request: CrawlRequest,
    urls: list[str],
    on_progress: ProgressCallback | None = None,
) -> tuple[list[Page], int]:
    pages: dict[str, Page] = {}
    skipped = 0
    lock = asyncio.Lock()
    semaphore = asyncio.Semaphore(10)
    robots_cache: dict[str, robotparser.RobotFileParser | None] = {}

    async with httpx.AsyncClient(timeout=30) as client:
        if request.respect_robots_txt:
            await _robots_allowed(client, urls[0], robots_cache)

        async def fetch(url: str) -> None:
            nonlocal skipped
            page: Page | None = None
            final_url = url
            try:
                if request.respect_robots_txt and not await _robots_allowed(
                    client, url, robots_cache
                ):
                    raise ValueError("Blocked by robots.txt")
                async with semaphore:
                    content, final_url = await _safe_download(client, url)
                if urlsplit(final_url).hostname != urlsplit(str(request.url)).hostname:
                    raise ValueError("Redirect must remain on the source host.")
                page, _links = _html_page(content, final_url, 1, request)
            except (httpx.HTTPError, ValueError, OSError):
                pass
            async with lock:
                if page:
                    pages[page.url] = page
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
    request: CrawlRequest, on_progress: ProgressCallback | None = None
) -> tuple[list[Page], int]:
    from crawl4ai import AsyncWebCrawler, BrowserConfig, CacheMode, CrawlerRunConfig
    from crawl4ai.content_filter_strategy import PruningContentFilter
    from crawl4ai.content_scraping_strategy import LXMLWebScrapingStrategy
    from crawl4ai.markdown_generation_strategy import DefaultMarkdownGenerator

    start_url = str(request.url)
    browser_config = BrowserConfig(
        browser_type="chromium",
        headless=True,
        text_mode=True,
        light_mode=True,
        verbose=False,
        extra_args=["--no-sandbox", "--disable-dev-shm-usage", "--disable-gpu"],
    )
    run_options = {
        "cache_mode": CacheMode.BYPASS,
        "verbose": False,
        "check_robots_txt": request.respect_robots_txt,
        "user_agent": f"{USER_AGENT} (+https://cracha.aimpact-agency.workers.dev)",
        "exclude_external_links": True,
        "excluded_tags": ["nav", "footer", "aside", "script", "style", "noscript"],
        "remove_overlay_elements": True,
        "remove_consent_popups": True,
        "word_count_threshold": 20,
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
        return await _http_direct_pages(
            request, dynamic_page_urls[: request.limit], on_progress
        )

    async def collect(result, depth: int = 0) -> tuple[list[str], list[str]]:
        nonlocal processed, skipped
        processed += 1
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
                elif not route_wrapper:
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

    async with AsyncWebCrawler(config=browser_config) as crawler:
        if request.type is CrawlType.RECURSIVE:
            # Process one breadth-first depth at a time. Pages within a depth
            # render concurrently, while links come from the rendered DOM so
            # JavaScript documentation sites expose their real content URLs.
            current_urls = [start_url]
            visited: set[str] = set()
            expected_total = request.limit
            for depth in range(request.max_depth + 1):
                batch: list[str] = []
                for url in current_urls:
                    normalized = canonical_url(url)
                    if normalized in visited:
                        continue
                    visited.add(normalized)
                    batch.append(normalized)
                    if len(pages_by_url) + len(batch) >= request.limit:
                        break
                if not batch:
                    break
                results = await crawler.arun_many(urls=batch, config=config)
                discovered_links, embedded_links = await consume(results, depth)
                if depth == 0 and dynamic_page_urls:
                    discovered_links = dynamic_page_urls + discovered_links
                while embedded_links and len(pages_by_url) < request.limit:
                    embedded_batch: list[str] = []
                    for url in dict.fromkeys(embedded_links):
                        normalized = canonical_url(url)
                        if normalized in visited:
                            continue
                        visited.add(normalized)
                        embedded_batch.append(normalized)
                        if len(pages_by_url) + len(embedded_batch) >= request.limit:
                            break
                    if not embedded_batch:
                        break
                    embedded_results = await crawler.arun_many(
                        urls=embedded_batch, config=config
                    )
                    nested_links, embedded_links = await consume(embedded_results, depth)
                    discovered_links.extend(nested_links)
                current_urls = list(dict.fromkeys(discovered_links))
                if len(pages_by_url) >= request.limit:
                    break
        elif request.type is CrawlType.SITEMAP:
            urls = await _sitemap_urls(start_url, request.limit)
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


async def crawl_pages(
    request: CrawlRequest, on_progress: ProgressCallback | None = None
) -> tuple[list[Page], int]:
    await assert_public_url(str(request.url))
    browser_timeout = min(
        MAX_BROWSER_TIMEOUT_SECONDS,
        max(MIN_BROWSER_TIMEOUT_SECONDS, request.limit * 5),
    )

    try:
        async with asyncio.timeout(browser_timeout):
            pages, skipped = await _crawl4ai_pages(request, on_progress)
        if pages:
            return pages, skipped
        print("[WARN] Crawl4AI returned no indexable pages; using the HTTP fallback.")
    except Exception as error:
        print(
            f"[WARN] Crawl4AI unavailable ({type(error).__name__}: {error}); "
            "using the HTTP fallback."
        )

    return await _http_fallback_pages(request, on_progress)
