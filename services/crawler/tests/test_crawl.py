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

    async def failed_browser(
        _request: CrawlRequest, _on_progress=None, _on_page=None, **_kwargs
    ) -> tuple[list[Page], int]:
        raise RuntimeError("Browser is not available")

    async def fallback(
        _request: CrawlRequest, _on_progress=None, _on_page=None, **_kwargs
    ) -> tuple[list[Page], int]:
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

    async def browser(
        _request: CrawlRequest, _on_progress=None, _on_page=None, **_kwargs
    ) -> tuple[list[Page], int]:
        return [browser_page], 1

    async def unexpected_fallback(
        _request: CrawlRequest, _on_progress=None, _on_page=None, **_kwargs
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


@pytest.mark.asyncio
async def test_fallback_does_not_stream_a_page_the_browser_pass_already_sent(monkeypatch) -> None:
    # The browser pass hands over two pages and then dies; the HTTP fallback
    # re-crawls the same site from the start. The caller uploads and bills what
    # it is streamed, so a shared page must arrive exactly once.
    streamed: list[str] = []

    async def allow_url(_url: str) -> None:
        return None

    def page(url: str) -> Page:
        return Page(
            url=url,
            title="Titel",
            content="Inhalt " * 20,
            markdown="Inhalt",
            checksum="abc",
            crawled_at="2026-08-22T00:00:00+00:00",
        )

    async def dying_browser(_request, _on_progress=None, on_page=None, **_kwargs):
        for url in ("https://example.com/a", "https://example.com/b"):
            await on_page(page(url))
        raise TimeoutError("browser ran out of time")

    async def fallback(_request, _on_progress=None, on_page=None, **_kwargs):
        pages = [page(f"https://example.com/{name}") for name in ("a", "b", "c")]
        for candidate in pages:
            await on_page(candidate)
        return pages, 0

    monkeypatch.setattr(crawl, "assert_public_url", allow_url)
    monkeypatch.setattr(crawl, "_crawl4ai_pages", dying_browser)
    monkeypatch.setattr(crawl, "_http_fallback_pages", fallback)

    async def record(candidate: Page) -> None:
        streamed.append(candidate.url)

    pages, _ = await crawl.crawl_pages(
        request().model_copy(update={"limit": 10}), None, record
    )

    assert streamed == [
        "https://example.com/a",
        "https://example.com/b",
        "https://example.com/c",
    ]
    assert len(streamed) == len(pages)


@pytest.mark.asyncio
async def test_streaming_stops_at_the_page_limit_across_both_passes(monkeypatch) -> None:
    # Each pass keeps to the limit by itself; the union of a half-finished
    # browser pass and a full fallback need not. The limit is what the crawl's
    # credits were held against, so it has to hold across both.
    streamed: list[str] = []

    async def allow_url(_url: str) -> None:
        return None

    def page(url: str) -> Page:
        return Page(
            url=url,
            title="Titel",
            content="Inhalt " * 20,
            markdown="Inhalt",
            checksum="abc",
            crawled_at="2026-08-22T00:00:00+00:00",
        )

    async def dying_browser(_request, _on_progress=None, on_page=None, **_kwargs):
        for index in range(3):
            await on_page(page(f"https://example.com/browser-{index}"))
        raise TimeoutError("browser ran out of time")

    async def fallback(_request, _on_progress=None, on_page=None, **_kwargs):
        pages = [page(f"https://example.com/fallback-{index}") for index in range(3)]
        for candidate in pages:
            await on_page(candidate)
        return pages, 0

    monkeypatch.setattr(crawl, "assert_public_url", allow_url)
    monkeypatch.setattr(crawl, "_crawl4ai_pages", dying_browser)
    monkeypatch.setattr(crawl, "_http_fallback_pages", fallback)

    async def record(candidate: Page) -> None:
        streamed.append(candidate.url)

    wanted = request().model_copy(update={"limit": 4})
    await crawl.crawl_pages(wanted, None, record)

    assert len(streamed) == 4


def _document(*links: str, head: str = "") -> bytes:
    anchors = "".join(f'<a href="{link}">Link</a> ' for link in links)
    return (
        f"<html><head><title>Seite</title>{head}</head>"
        f"<body><main>{FILLER}<p>{anchors}</p></main></body></html>"
    ).encode()


def site(monkeypatch, pages: dict[str, bytes | int]) -> list[str]:
    """An in-memory site for the HTTP fallback; an int is an error status."""
    fetched: list[str] = []

    async def allow_url(_url: str) -> None:
        return None

    async def download(_client, url: str) -> tuple[bytes, str]:
        if url.endswith("/robots.txt"):
            raise httpx.HTTPError("no robots.txt")
        fetched.append(url)
        answer = pages.get(url, 404)
        if isinstance(answer, int):
            response = httpx.Response(answer, request=httpx.Request("GET", url))
            raise httpx.HTTPStatusError(str(answer), request=response.request, response=response)
        return answer, url

    monkeypatch.setattr(crawl, "assert_public_url", allow_url)
    monkeypatch.setattr(crawl, "_safe_download", download)
    return fetched


def recursive(**changes) -> CrawlRequest:
    return CrawlRequest(
        url="https://example.com/",
        tenant_id="test-db",
        user_id="test-user",
        type="recursive",
        max_depth=2,
        limit=10,
    ).model_copy(update=changes)


async def test_excluded_links_are_never_fetched(monkeypatch) -> None:
    fetched = site(monkeypatch, {
        "https://example.com/": _document("/docs/a", "/blog/b", "/docs/private/c"),
        "https://example.com/docs/a": _document(),
    })

    pages, skipped = await crawl._http_fallback_pages(
        recursive(include_patterns=["*/docs/*"], exclude_patterns=["*/private/*"])
    )

    # The start URL is fetched for its links although it matches no include;
    # it is still not indexed.
    assert fetched == ["https://example.com/", "https://example.com/docs/a"]
    assert [page.url for page in pages] == ["https://example.com/docs/a"]
    assert skipped == 1


async def test_a_crawl_that_saw_the_whole_site_is_complete(monkeypatch) -> None:
    site(monkeypatch, {
        "https://example.com/": _document("/a", "/gone"),
        "https://example.com/a": _document(),
        # /gone answers 404: the page is gone, which is what pruning is for.
    })
    stats = crawl.CrawlStats()

    pages, _ = await crawl._http_fallback_pages(recursive(), stats=stats)

    assert len(pages) == 2
    assert stats == crawl.CrawlStats(failed=0, truncated=False, timed_out=False)
    assert stats.complete(len(pages))


async def test_a_crawl_cut_off_by_the_page_limit_is_not_complete(monkeypatch) -> None:
    site(monkeypatch, {
        "https://example.com/": _document("/a", "/b"),
        "https://example.com/a": _document(),
        "https://example.com/b": _document(),
    })
    stats = crawl.CrawlStats()

    pages, _ = await crawl._http_fallback_pages(recursive(limit=2), stats=stats)

    assert len(pages) == 2
    assert stats.truncated
    assert not stats.complete(len(pages))


async def test_the_limit_reached_exactly_is_still_complete(monkeypatch) -> None:
    site(monkeypatch, {
        "https://example.com/": _document("/a"),
        "https://example.com/a": _document("/"),
    })
    stats = crawl.CrawlStats()

    pages, _ = await crawl._http_fallback_pages(recursive(limit=2), stats=stats)

    assert len(pages) == 2
    assert not stats.truncated


async def test_server_errors_count_against_completeness(monkeypatch) -> None:
    site(monkeypatch, {
        "https://example.com/": _document("/a", "/b"),
        "https://example.com/a": _document(),
        "https://example.com/b": 503,
    })
    stats = crawl.CrawlStats()

    pages, _ = await crawl._http_fallback_pages(recursive(), stats=stats)

    assert len(pages) == 2
    assert stats.failed == 1
    # One of three fetches failing is far above the tolerated share.
    assert not stats.complete(len(pages))


def test_failure_ratio_threshold() -> None:
    assert crawl.CrawlStats(failed=1).complete(9)
    assert not crawl.CrawlStats(failed=2).complete(9)
    assert not crawl.CrawlStats().complete(0)
    assert not crawl.CrawlStats(timed_out=True).complete(50)


async def test_sitemap_targets_are_filtered_and_report_truncation(monkeypatch) -> None:
    serve(monkeypatch, {
        "https://example.com/sitemap.xml": _sitemap(
            "https://example.com/docs/a",
            "https://example.com/blog/b",
            "https://example.com/docs/c",
        ),
    })
    stats = crawl.CrawlStats()
    wanted = recursive(type="sitemap", limit=2, include_patterns=["*/docs/*"])

    urls = await crawl._sitemap_targets("https://example.com/sitemap.xml", wanted, stats)

    assert urls == ["https://example.com/docs/a"]
    assert stats.truncated

    exact = crawl.CrawlStats()
    await crawl._sitemap_targets(
        "https://example.com/sitemap.xml", recursive(type="sitemap", limit=3), exact
    )
    assert not exact.truncated


async def test_a_browser_timeout_makes_the_crawl_incomplete(monkeypatch) -> None:
    fallback_page = Page(
        url="https://example.com/docs",
        title="Docs",
        markdown="# Docs\n\n" + "Fallback content. " * 20,
        checksum="a" * 64,
        crawled_at="2026-08-04T00:00:00+00:00",
    )

    async def allow_url(_url: str) -> None:
        return None

    async def slow_browser(_request, _on_progress=None, _on_page=None, **_kwargs):
        raise TimeoutError()

    async def fallback(_request, _on_progress=None, _on_page=None, **_kwargs):
        return [fallback_page], 0

    monkeypatch.setattr(crawl, "assert_public_url", allow_url)
    monkeypatch.setattr(crawl, "_crawl4ai_pages", slow_browser)
    monkeypatch.setattr(crawl, "_http_fallback_pages", fallback)
    stats = crawl.CrawlStats()

    pages, _ = await crawl.crawl_pages(request(), stats=stats)

    assert pages == [fallback_page]
    assert stats.timed_out
    assert not stats.complete(len(pages))


def test_the_http_path_files_a_page_under_its_canonical_url() -> None:
    document = _document(head='<link rel="canonical" href="https://example.com/preise-2026">')
    page, _links = crawl._html_page(
        document, "https://example.com/preise?utm_source=x", 0, request()
    )

    assert page is not None
    assert page.url == "https://example.com/preise-2026"


def test_links_in_the_article_come_before_the_menus_around_it() -> None:
    # A Wikipedia crawl with a 20-page limit spent all of it on the sidebar,
    # because the sidebar comes first in the markup.
    document = """
    <html><body>
      <div id="sidebar"><a href="/wiki/Hauptseite">Hauptseite</a><a href="/wiki/Xbox">Xbox</a></div>
      <main>
        <nav><a href="/wiki/Diskussion:Halo">Diskussion</a></nav>
        <p>Die Reihe umfasst <a href="/wiki/Publisher">Publisher</a>,
        <a href="/wiki/Halo_2">Halo 2</a> und <a href="/wiki/Halo:_Reach">Halo: Reach</a>.</p>
      </main>
    </body></html>
    """
    request = CrawlRequest(
        url="https://de.wikipedia.org/wiki/Halo_(Computerspielreihe)", tenant_id="t", user_id="u"
    )
    _page, links = crawl._html_page(document.encode(), str(request.url), 0, request)

    assert links == [
        "https://de.wikipedia.org/wiki/Halo_2",
        "https://de.wikipedia.org/wiki/Halo:_Reach",
        "https://de.wikipedia.org/wiki/Publisher",
        "https://de.wikipedia.org/wiki/Hauptseite",
        "https://de.wikipedia.org/wiki/Xbox",
    ]


@pytest.mark.parametrize(
    ("url", "meta"),
    [
        ("https://de.wikipedia.org/wiki/Spezial:Suche", True),
        ("https://de.wikipedia.org/wiki/Hilfe:%C3%9Cbersicht", True),
        ("https://de.wikipedia.org/wiki/Benutzer_Diskussion:Beispiel", True),
        ("https://en.wikipedia.org/wiki/User_talk:Example", True),
        ("https://de.wikipedia.org/w/index.php?title=Halo&action=edit", True),
        ("https://de.wikipedia.org/wiki/Halo:_Campaign?action=edit&redlink=1", True),
        ("https://halo.fandom.com/de/wiki/Spezial:Alle_Seiten", True),
        ("https://de.wikipedia.org/wiki/Halo:_Reach", False),
        ("https://de.wikipedia.org/wiki/Halo_2", False),
        ("https://example.com/help:center", False),
    ],
)
def test_wiki_housekeeping_pages_are_recognised(url: str, meta: bool) -> None:
    assert crawl._wiki_meta_page(url) is meta
