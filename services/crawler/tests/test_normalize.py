from types import SimpleNamespace

from cracha_crawler.normalize import (
    canonical_url,
    matches_patterns,
    page_from_result,
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
