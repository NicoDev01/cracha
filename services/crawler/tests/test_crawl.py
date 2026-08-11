import textwrap

import httpx
import pytest

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


def _sitemap(*urls: str) -> bytes:
    entries = "".join(f"<url><loc>{url}</loc></url>" for url in urls)
    return (
        '<?xml version="1.0" encoding="UTF-8"?>'
        f'<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">{entries}</urlset>'
    ).encode()


def _sitemap_index(*urls: str) -> bytes:
    entries = "".join(f"<sitemap><loc>{url}</loc></sitemap>" for url in urls)
    return (
        '<?xml version="1.0" encoding="UTF-8"?>'
        f'<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">{entries}</sitemapindex>'
    ).encode()


def serve(monkeypatch, files: dict[str, bytes]) -> None:
    """Route every sitemap and robots.txt download to an in-memory site."""

    async def allow_url(_url: str) -> None:
        return None

    async def download(_client, url: str) -> tuple[bytes, str]:
        if url not in files:
            raise httpx.HTTPError(f"404 for {url}")
        return files[url], url

    monkeypatch.setattr(crawl, "assert_public_url", allow_url)
    monkeypatch.setattr(crawl, "_safe_download", download)


async def test_analysis_counts_pages_from_the_conventional_sitemap(monkeypatch) -> None:
    serve(monkeypatch, {
        "https://example.com/sitemap.xml": _sitemap(
            "https://example.com/",
            "https://example.com/about",
            "https://example.com/contact",
        ),
    })

    analysis = await crawl.analyze_site("https://example.com")

    assert analysis.total_pages == 3
    assert analysis.sitemap_url == "https://example.com/sitemap.xml"
    assert analysis.truncated is False


async def test_analysis_uses_the_sitemap_named_in_robots_txt(monkeypatch) -> None:
    serve(monkeypatch, {
        "https://example.com/robots.txt": b"User-agent: *\nSitemap: https://example.com/custom.xml\n",
        "https://example.com/custom.xml": _sitemap(
            "https://example.com/a", "https://example.com/b"
        ),
    })

    analysis = await crawl.analyze_site("https://example.com")

    assert analysis.total_pages == 2
    assert analysis.sitemap_url == "https://example.com/custom.xml"


async def test_analysis_walks_a_sitemap_index(monkeypatch) -> None:
    serve(monkeypatch, {
        "https://example.com/sitemap.xml": _sitemap_index(
            "https://example.com/posts.xml", "https://example.com/pages.xml"
        ),
        "https://example.com/posts.xml": _sitemap(
            "https://example.com/post-1", "https://example.com/post-2"
        ),
        "https://example.com/pages.xml": _sitemap("https://example.com/imprint"),
    })

    analysis = await crawl.analyze_site("https://example.com")

    assert analysis.total_pages == 3


async def test_analysis_reports_no_total_when_the_site_has_no_sitemap(monkeypatch) -> None:
    serve(monkeypatch, {"https://example.com/robots.txt": b"User-agent: *\nDisallow:\n"})

    analysis = await crawl.analyze_site("https://example.com")

    # Guessing a number here would be worse than admitting it is unknowable.
    assert analysis.total_pages is None
    assert analysis.sitemap_url is None


async def test_analysis_ignores_entries_pointing_at_other_hosts(monkeypatch) -> None:
    serve(monkeypatch, {
        "https://example.com/sitemap.xml": _sitemap(
            "https://example.com/kept",
            "https://cdn.other.com/dropped",
        ),
    })

    analysis = await crawl.analyze_site("https://example.com")

    assert analysis.total_pages == 1


async def test_analysis_counts_each_page_once(monkeypatch) -> None:
    serve(monkeypatch, {
        "https://example.com/sitemap.xml": _sitemap_index(
            "https://example.com/a.xml", "https://example.com/b.xml"
        ),
        "https://example.com/a.xml": _sitemap("https://example.com/shared"),
        "https://example.com/b.xml": _sitemap(
            "https://example.com/shared", "https://example.com/unique"
        ),
    })

    analysis = await crawl.analyze_site("https://example.com")

    assert analysis.total_pages == 2


async def test_a_supplied_sitemap_url_is_used_directly(monkeypatch) -> None:
    serve(monkeypatch, {
        "https://example.com/custom/sitemap.xml": _sitemap(
            "https://example.com/one", "https://example.com/two"
        ),
    })

    urls, used = await crawl.sitemap_page_urls("https://example.com/custom/sitemap.xml", 100)

    assert urls == ["https://example.com/one", "https://example.com/two"]
    assert used == "https://example.com/custom/sitemap.xml"


async def test_a_site_that_refuses_robots_txt_says_so(monkeypatch) -> None:
    # de.wikipedia.org answers 403 to a user agent that names no contact, for
    # robots.txt as much as for the article. Both callers used to drop the URL
    # without a word, so a crawl of a perfectly ordinary page ended as "No
    # indexable content was found" — pointing the reader at their own content.
    async def allow_url(_url: str) -> None:
        return None

    async def refuse(_client, url: str) -> tuple[bytes, str]:
        response = httpx.Response(403, request=httpx.Request("GET", url))
        raise httpx.HTTPStatusError("403", request=response.request, response=response)

    monkeypatch.setattr(crawl, "assert_public_url", allow_url)
    monkeypatch.setattr(crawl, "_safe_download", refuse)

    with pytest.raises(crawl.CrawlBlockedError) as failure:
        await crawl._http_fallback_pages(request())

    assert "403" in str(failure.value)
    assert "example.com" in str(failure.value)


async def test_the_user_agent_names_someone_to_contact() -> None:
    # The whole failure above came down to this string. A bot that does not say
    # who it is gets turned away by more than one large site.
    assert "https://" in crawl.USER_AGENT


def test_a_language_switcher_is_not_content() -> None:
    # Wikipedia lists every translation of the article inside <main>, in a plain
    # <div>, so nothing in the markup marks it as navigation. It was 7% of the
    # extracted text and answers no question anyone would ask.
    languages = "".join(
        f'<li><a href="/x/{i}">Sprache {i}</a></li>' for i in range(40)
    )
    page = html_page(f"<div><ul>{languages}</ul></div>" + FILLER)

    assert page is not None
    assert "Sprache 7" not in page.markdown
    # ASCII on purpose: the helper's document declares no charset, so lxml
    # follows the HTML default and reads the bytes as Latin-1.
    assert "Beschreibung des Angebots" in page.markdown


def test_a_short_list_of_links_inside_prose_survives() -> None:
    # The blunt version of this rule dropped <header> wholesale and took 13% off
    # python.org/about, its headline included. A handful of links among real
    # sentences is a paragraph, not a menu.
    page = html_page(
        FILLER
        + """
        <div>
          <p>Weiterführend siehe die Dokumentation und den Leitfaden.</p>
          <ul>
            <li><a href="/docs">Dokumentation</a></li>
            <li><a href="/guide">Leitfaden</a></li>
          </ul>
        </div>
        """
    )

    assert page is not None
    assert "Dokumentation" in page.markdown
    assert "Leitfaden" in page.markdown
