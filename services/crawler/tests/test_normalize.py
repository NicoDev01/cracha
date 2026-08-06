from types import SimpleNamespace

from cracha_crawler.normalize import (
    canonical_url,
    clean_code_fences,
    extract_published_at,
    matches_patterns,
    normalize_markdown,
    page_from_result,
    strip_markdown_links,
    truncate_utf8,
)


def test_canonical_url_removes_fragment_and_trailing_slash() -> None:
    assert canonical_url("HTTPS://Example.COM/docs/#intro") == "https://example.com/docs"
    assert canonical_url(
        "HTTPS://Example.COM/docs/#intro", preserve_fragment=True
    ) == "https://example.com/docs#intro"


def test_patterns_use_explicit_include_and_exclude_rules() -> None:
    assert matches_patterns("https://example.com/docs/api", ["*/docs/*"], ["*/private/*"])
    assert not matches_patterns("https://example.com/private/api", [], ["*/private/*"])


def test_page_normalization_prefers_filtered_markdown() -> None:
    result = SimpleNamespace(
        success=True,
        url="https://example.com/docs/",
        metadata={"title": "Docs", "depth": 1},
        markdown=SimpleNamespace(
            raw_markdown="# Cookie settings\n\n" + "tracking consent " * 40,
            fit_markdown="# Docs\n\n" + "useful content " * 20,
        ),
    )
    page = page_from_result(result, [], [])
    assert page is not None
    assert page.url == "https://example.com/docs"
    assert page.title == "Docs"
    assert page.depth == 1
    assert len(page.checksum) == 64
    assert "useful content" in page.markdown
    assert "tracking consent" not in page.markdown


def test_page_normalization_uses_raw_markdown_when_filter_is_too_aggressive() -> None:
    result = SimpleNamespace(
        success=True,
        url="https://example.com/team",
        metadata={"title": "Team"},
        markdown=SimpleNamespace(
            raw_markdown="# Team\n\n" + "Person Example\n" * 30,
            fit_markdown="# Team\n",
        ),
    )
    page = page_from_result(result, [], [])
    assert page is not None
    assert "Person Example" in page.markdown


def test_page_normalization_preserves_spa_route_and_rejects_heading_only_content() -> None:
    spa_result = SimpleNamespace(
        success=True,
        url="https://example.com/legacy.html",
        redirected_url="https://example.com/docs/#AnimationAction",
        metadata={"title": "AnimationAction"},
        markdown=SimpleNamespace(fit_markdown="# AnimationAction\n\n" + "useful content " * 20),
    )
    page = page_from_result(spa_result, [], [])
    assert page is not None
    assert page.url == "https://example.com/docs#AnimationAction"

    heading_only = SimpleNamespace(
        success=True,
        url="https://example.com/headings",
        metadata={},
        markdown=SimpleNamespace(
            fit_markdown="\n".join(f"# Heading {index}" for index in range(40))
        ),
    )
    assert page_from_result(heading_only, [], []) is None


def test_truncate_utf8_preserves_character_boundaries() -> None:
    assert truncate_utf8("äöü", 5) == "äö"


def test_page_normalization_rejects_rendered_error_pages() -> None:
    # webmen.de/kontakt answers 404 with a styled page. Crawl4AI reports that as
    # success=True, so only the status code distinguishes it from real content.
    def result(status_code: int | None) -> SimpleNamespace:
        return SimpleNamespace(
            success=True,
            status_code=status_code,
            url="https://example.com/kontakt",
            metadata={"title": "404"},
            markdown=SimpleNamespace(
                fit_markdown="# 404 Seite nicht gefunden\n\n" + "zurueck zur startseite " * 20
            ),
        )

    assert page_from_result(result(404), [], []) is None
    assert page_from_result(result(410), [], []) is None
    assert page_from_result(result(500), [], []) is None
    assert page_from_result(result(200), [], []) is not None
    # The reported status belongs to the first response. A legacy permalink
    # answers 301 and still carries the destination's content, so rejecting it
    # removed every blog article behind such a redirect.
    assert page_from_result(result(301), [], []) is not None
    assert page_from_result(result(307), [], []) is not None
    # Sources without a status code (raw HTML, file input) stay indexable.
    assert page_from_result(result(None), [], []) is not None


def test_link_stripping_keeps_the_text_that_answers_questions() -> None:
    # The webmen team page reached the index as 34 link headings. AI Search
    # discarded the tail of that list, so four members were unanswerable.
    entries = "\n".join(
        f"## [Vorname Nachname{index} ](https://example.com/team/detail/person-{index})"
        for index in range(1, 35)
    )
    stripped = strip_markdown_links(entries)
    assert "](" not in stripped
    assert stripped.count("\n") == 33
    assert stripped.startswith("## Vorname Nachname1")
    assert stripped.endswith("## Vorname Nachname34")


def test_link_stripping_handles_images_titles_and_reference_style() -> None:
    assert strip_markdown_links("![Foto von Klaus](/img/klaus.webp)") == "Foto von Klaus"
    assert strip_markdown_links("![](/img/spacer.gif)") == ""
    assert strip_markdown_links('[Kontakt](/kontakt "Zum Kontakt")') == "Kontakt"
    assert strip_markdown_links("[![Logo](/logo.svg)](https://example.com)") == "Logo"
    assert strip_markdown_links("Siehe [Doku][1].\n\n[1]: https://example.com/doku") == (
        "Siehe Doku.\n\n"
    )
    # A URL that carries parentheses must not leak its tail into the text.
    assert strip_markdown_links("[Merkur](https://de.wikipedia.org/wiki/Merkur_(Planet))") == (
        "Merkur"
    )


def test_link_stripping_leaves_prose_and_bare_urls_intact() -> None:
    # Bare URLs index without trouble; only the `[text](url)` form is harmful.
    text = "Schreiben Sie an info@example.com oder besuchen Sie https://example.com/kontakt."
    assert strip_markdown_links(text) == text
    assert strip_markdown_links("Ein Array-Zugriff wie data[0] (siehe oben) bleibt.") == (
        "Ein Array-Zugriff wie data[0] (siehe oben) bleibt."
    )
    assert strip_markdown_links("<https://example.com/feed>") == "https://example.com/feed"


def test_link_stripping_leaves_fenced_code_verbatim() -> None:
    # On a documentation site the link syntax inside a sample is the subject.
    markdown = (
        "Siehe [die Doku](https://example.com/doku).\n\n"
        "```markdown\n"
        "[Anker](#abschnitt) und ![Bild](/logo.svg)\n"
        "```\n\n"
        "Danach [weiter](https://example.com/mehr)."
    )
    stripped = strip_markdown_links(markdown)
    assert "[Anker](#abschnitt) und ![Bild](/logo.svg)" in stripped
    assert "Siehe die Doku." in stripped
    assert "Danach weiter." in stripped

    # A page truncated inside a fence must not lose its remaining content.
    unclosed = "Text [a](/b)\n\n~~~\ncode [c](/d)\n"
    assert strip_markdown_links(unclosed) == "Text a\n\n~~~\ncode [c](/d)\n"


def test_normalize_markdown_strips_links_on_every_ingest_path() -> None:
    assert normalize_markdown("## [Klaus Becker ](https://example.com/k)") == "## Klaus Becker"


def test_publication_date_prefers_the_stated_publication_over_a_modification() -> None:
    html = (
        '<meta property="article:modified_time" content="2026-07-01T10:00:00Z">'
        '<meta property="article:published_time" content="2026-03-14T09:30:00+01:00">'
    )
    assert extract_published_at(html) == "2026-03-14T09:30:00+01:00"


def test_publication_date_falls_back_to_json_ld_and_time_elements() -> None:
    assert extract_published_at(
        '<script type="application/ld+json">{"@type":"Article",'
        '"datePublished":"2025-11-02"}</script>'
    ) == "2025-11-02T00:00:00+00:00"
    assert extract_published_at('<time datetime="2024-01-05">5. Januar</time>') == (
        "2024-01-05T00:00:00+00:00"
    )


def test_pages_that_state_no_date_get_none() -> None:
    # Guessing a date would rank sources by a number nobody wrote.
    assert extract_published_at("<p>Veröffentlicht im Frühjahr</p>") is None
    assert extract_published_at('<meta name="date" content="demnächst">') is None
    assert extract_published_at("") is None


def test_page_from_result_carries_the_publication_date() -> None:
    result = SimpleNamespace(
        success=True,
        status_code=200,
        url="https://example.com/blog/eintrag",
        html='<meta property="article:published_time" content="2026-02-01T00:00:00Z">',
        markdown=SimpleNamespace(
            fit_markdown="# Eintrag\n\n" + "Ein ausführlicher Absatz zum Thema. " * 12,
            raw_markdown="",
        ),
        metadata={"title": "Eintrag"},
    )

    page = page_from_result(result, [], [])

    assert page is not None
    assert page.published_at == "2026-02-01T00:00:00+00:00"


def test_code_fences_lose_the_duplicated_line_number_copy() -> None:
    # laravel.com renders every sample twice: once through a line-number gutter
    # that glues the number to the code and eats the spaces, once clean.
    markdown = (
        "```\n"
        "1php artisanqueue:work--queue=high\n"
        "2\n"
        "3ProcessPodcast::dispatch();\n"
        "php artisan queue:work --queue=high\n"
        "\n"
        "ProcessPodcast::dispatch();\n"
        "```\n"
    )
    cleaned = clean_code_fences(markdown)

    assert "php artisanqueue:work" not in cleaned
    assert "php artisan queue:work --queue=high" in cleaned
    assert "ProcessPodcast::dispatch();" in cleaned
    # The gutter entry for a blank line of code leaves only its number behind.
    assert "\n2\n" not in cleaned


def test_code_fences_keep_a_sample_that_only_looks_numbered() -> None:
    # Without an intact copy in the same fence, nothing may be dropped.
    markdown = "```\n1st place goes to the winner\n2nd place is runner up\n```"
    assert clean_code_fences(markdown) == markdown

    numbered_list = "```\n1. erster Schritt\n2. zweiter Schritt\n```"
    assert clean_code_fences(numbered_list) == numbered_list


def test_code_fences_collapse_the_blank_line_flood() -> None:
    # The highlighter emitted two blank lines between every line of code, which
    # was more than half of a documentation page.
    markdown = "```python\nfirst = 1\n\n\n\nsecond = 2\n\n\n```"
    assert clean_code_fences(markdown) == "```python\nfirst = 1\n\nsecond = 2\n```"


def test_code_fences_leave_prose_alone() -> None:
    prose = "Ein Absatz.\n\n\n\nEin zweiter Absatz mit 1meiner Zahl.\n"
    assert clean_code_fences(prose) == prose


def test_normalize_markdown_cleans_fences_and_extra_blank_lines() -> None:
    markdown = "# Titel\n\n\n\nEin Absatz.\n\n```\n1use App;\nuse App;\n```\n"
    normalized = normalize_markdown(markdown)

    assert "\n\n\n" not in normalized
    assert "1use App;" not in normalized
    assert "use App;" in normalized
