from cracha_crawler import crawl
from cracha_crawler.models import CrawlRequest, Page


def request() -> CrawlRequest:
    return CrawlRequest(
        url="https://example.com/docs",
        tenant_id="test-db",
        user_id="test-user",
        type="single",
        limit=1,
    )


async def test_browser_failure_uses_http_fallback(monkeypatch) -> None:
    fallback_page = Page(
        url="https://example.com/docs",
        title="Docs",
        markdown="# Docs\n\n" + "Fallback content. " * 20,
        checksum="a" * 64,
        crawled_at="2026-08-04T00:00:00+00:00",
    )

    async def allow_url(_url: str) -> None:
        return None

    async def failed_browser(_request: CrawlRequest, _on_progress=None) -> tuple[list[Page], int]:
        raise RuntimeError("Browser is not available")

    async def fallback(_request: CrawlRequest, _on_progress=None) -> tuple[list[Page], int]:
        return [fallback_page], 0

    monkeypatch.setattr(crawl, "assert_public_url", allow_url)
    monkeypatch.setattr(crawl, "_crawl4ai_pages", failed_browser)
    monkeypatch.setattr(crawl, "_http_fallback_pages", fallback)

    pages, skipped = await crawl.crawl_pages(request())

    assert pages == [fallback_page]
    assert skipped == 0


async def test_successful_browser_result_skips_fallback(monkeypatch) -> None:
    browser_page = Page(
        url="https://example.com/docs",
        title="Docs",
        markdown="# Docs\n\n" + "Browser content. " * 20,
        checksum="b" * 64,
        crawled_at="2026-08-04T00:00:00+00:00",
    )

    async def allow_url(_url: str) -> None:
        return None

    async def browser(_request: CrawlRequest, _on_progress=None) -> tuple[list[Page], int]:
        return [browser_page], 1

    async def unexpected_fallback(
        _request: CrawlRequest, _on_progress=None
    ) -> tuple[list[Page], int]:
        raise AssertionError("fallback must not run")

    monkeypatch.setattr(crawl, "assert_public_url", allow_url)
    monkeypatch.setattr(crawl, "_crawl4ai_pages", browser)
    monkeypatch.setattr(crawl, "_http_fallback_pages", unexpected_fallback)

    pages, skipped = await crawl.crawl_pages(request())

    assert pages == [browser_page]
    assert skipped == 1
