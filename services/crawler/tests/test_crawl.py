import textwrap

from cracha_crawler import crawl
from cracha_crawler.models import CrawlRequest, Page


def html_page(body: str) -> Page | None:
    document = f"<html><head><title>Preise</title></head><body><main>{body}</main></body></html>"
    page, _links = _html_page_of(document)
    return page


def _html_page_of(document: str) -> tuple[Page | None, list[str]]:
    return crawl._html_page(
        document.encode("utf-8"), "https://example.com/preise", 0, request()
    )


FILLER = "<p>" + ("Ausführliche Beschreibung des Angebots. " * 12) + "</p>"


def test_tables_survive_as_markdown_tables() -> None:
    # Prices, versions and comparison matrices are what a table holds, and they
    # were dropped wholesale: the extractor never looked at table elements.
    page = html_page(
        FILLER
        + """
        <table>
          <tr><th>Paket</th><th>Preis</th></tr>
          <tr><td>Basis</td><td>19 EUR</td></tr>
          <tr><td>Pro</td><td>49 EUR</td></tr>
        </table>
        """
    )

    assert page is not None
    assert "| Paket | Preis |" in page.markdown
    assert "| --- | --- |" in page.markdown
    assert "| Basis | 19 EUR |" in page.markdown
    assert "| Pro | 49 EUR |" in page.markdown
    # The cell text must appear once, not again as loose paragraphs.
    assert page.markdown.count("19 EUR") == 1


def test_layout_tables_degrade_to_plain_lines() -> None:
    page = html_page(FILLER + "<table><tr><td>Nur eine Spalte</td></tr></table>")

    assert page is not None
    assert "Nur eine Spalte" in page.markdown
    assert "|" not in page.markdown


def test_code_samples_keep_their_line_breaks() -> None:
    page = html_page(
        FILLER
        + "<pre><code>php artisan queue:work\nphp artisan migrate</code></pre>"
    )

    assert page is not None
    assert "```\nphp artisan queue:work\nphp artisan migrate\n```" in page.markdown


def test_publication_date_is_read_from_the_page() -> None:
    document = textwrap.dedent(
        """
        <html><head><title>Beitrag</title>
        <meta property="article:published_time" content="2026-03-14T09:30:00+01:00">
        </head><body><main>{filler}</main></body></html>
        """
    ).format(filler=FILLER)
    page, _links = _html_page_of(document)

    assert page is not None
    assert page.published_at == "2026-03-14T09:30:00+01:00"


def test_pages_without_a_date_report_none() -> None:
    page = html_page(FILLER)

    assert page is not None
    assert page.published_at is None


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
