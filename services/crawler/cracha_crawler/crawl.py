import hashlib
from collections import deque
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


async def _http_fallback_pages(request: CrawlRequest) -> tuple[list[Page], int]:
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
            except (httpx.HTTPError, ValueError, OSError):
                skipped += 1
                continue
            if page:
                pages[page.url] = page
            else:
                skipped += 1
            if request.type is CrawlType.RECURSIVE and depth < request.max_depth:
                for link in links:
                    if link not in visited and urlsplit(link).hostname == source_host:
                        pending.append((link, depth + 1))
    return list(pages.values()), skipped


async def crawl_pages(request: CrawlRequest) -> tuple[list[Page], int]:
    from crawl4ai import AsyncWebCrawler, BrowserConfig, CacheMode, CrawlerRunConfig
    from crawl4ai.content_filter_strategy import PruningContentFilter
    from crawl4ai.content_scraping_strategy import LXMLWebScrapingStrategy
    from crawl4ai.deep_crawling import BFSDeepCrawlStrategy
    from crawl4ai.deep_crawling.filters import (
        ContentTypeFilter,
        DomainFilter,
        FilterChain,
        URLPatternFilter,
    )
    from crawl4ai.markdown_generation_strategy import DefaultMarkdownGenerator

    start_url = str(request.url)
    await assert_public_url(start_url)
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
        "verbose": True,
        "check_robots_txt": request.respect_robots_txt,
        "user_agent": f"{USER_AGENT} (+https://cracha.aimpact-agency.workers.dev)",
        "exclude_external_links": True,
        "excluded_tags": ["nav", "footer", "aside", "script", "style", "noscript"],
        "word_count_threshold": 20,
        "page_timeout": 45_000,
        "wait_for_images": False,
        "preserve_https_for_internal_links": True,
        "scraping_strategy": LXMLWebScrapingStrategy(),
        "markdown_generator": DefaultMarkdownGenerator(
            content_filter=PruningContentFilter(threshold=0.35, threshold_type="fixed")
        ),
    }

    if request.type is CrawlType.RECURSIVE:
        host = urlsplit(start_url).hostname or ""
        filters = [
            DomainFilter(allowed_domains=[host]),
            ContentTypeFilter(allowed_types=["text/html"]),
        ]
        if request.include_patterns:
            filters.append(URLPatternFilter(patterns=request.include_patterns))
        run_options["deep_crawl_strategy"] = BFSDeepCrawlStrategy(
            max_depth=request.max_depth,
            include_external=False,
            max_pages=request.limit,
            filter_chain=FilterChain(filters),
        )
        run_options["stream"] = True
    elif request.type is CrawlType.SITEMAP:
        run_options["stream"] = True

    config = CrawlerRunConfig(**run_options)
    async with AsyncWebCrawler(config=browser_config) as crawler:
        if request.type is CrawlType.SITEMAP:
            urls = await _sitemap_urls(start_url, request.limit)
            results = await crawler.arun_many(urls=urls, config=config)
        else:
            results = await crawler.arun(url=start_url, config=config)

    pages_by_url: dict[str, Page] = {}
    skipped = 0
    if hasattr(results, "__aiter__"):
        collected = [result async for result in results]
    elif isinstance(results, list):
        collected = results
    else:
        collected = [results]

    source_host = urlsplit(start_url).hostname
    for result in collected:
        result_url = str(getattr(result, "redirected_url", None) or getattr(result, "url", ""))
        try:
            await assert_public_url(result_url)
        except (ValueError, OSError):
            skipped += 1
            continue
        if urlsplit(result_url).hostname != source_host:
            skipped += 1
            continue
        page = page_from_result(result, request.include_patterns, request.exclude_patterns)
        if page:
            pages_by_url[page.url] = page
        else:
            skipped += 1
    if pages_by_url:
        return list(pages_by_url.values()), skipped
    return await _http_fallback_pages(request)
