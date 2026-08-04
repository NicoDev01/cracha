from types import SimpleNamespace

from cracha_crawler.normalize import (
    canonical_url,
    matches_patterns,
    page_from_result,
    truncate_utf8,
)


def test_canonical_url_removes_fragment_and_trailing_slash() -> None:
    assert canonical_url("HTTPS://Example.COM/docs/#intro") == "https://example.com/docs"


def test_patterns_use_explicit_include_and_exclude_rules() -> None:
    assert matches_patterns("https://example.com/docs/api", ["*/docs/*"], ["*/private/*"])
    assert not matches_patterns("https://example.com/private/api", [], ["*/private/*"])


def test_page_normalization_prefers_filtered_markdown() -> None:
    result = SimpleNamespace(
        success=True,
        url="https://example.com/docs/",
        metadata={"title": "Docs", "depth": 1},
        markdown=SimpleNamespace(fit_markdown="# Docs\n\n" + "useful content " * 20),
    )
    page = page_from_result(result, [], [])
    assert page is not None
    assert page.url == "https://example.com/docs"
    assert page.title == "Docs"
    assert page.depth == 1
    assert len(page.checksum) == 64


def test_truncate_utf8_preserves_character_boundaries() -> None:
    assert truncate_utf8("äöü", 5) == "äö"
