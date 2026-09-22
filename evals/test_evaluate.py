from evaluate import contradicting_totals, evaluate_answer, list_items

NAMES = [f"Person {index}" for index in range(1, 35)]
LIST = "\n".join(f"* {name} [1]" for name in NAMES)


def test_list_items_counts_bullets_and_numbers() -> None:
    assert len(list_items(LIST)) == 34
    assert len(list_items("1. Anna [1]\n2. Bruno [2]")) == 2


def test_list_items_ignores_prose() -> None:
    assert list_items("Das Team besteht aus 34 Mitgliedern [1].") == []


def test_merged_entries_count_as_one() -> None:
    # The production failure: three people packed into a single bullet still
    # only produce one entry, which is exactly what the count has to notice.
    merged = "* Anna Beispiel [1]\n* Tanwir Mahdi, Fabian Holler und Annie [1]"
    assert len(list_items(merged)) == 2


def test_a_stated_total_that_the_list_contradicts_is_reported() -> None:
    answer = f"Das Team besteht aus 47 Mitgliedern [1]:\n\n{LIST}"
    assert contradicting_totals(answer, 34) == [47]


def test_a_matching_total_passes() -> None:
    assert contradicting_totals(f"Es sind 34 Mitglieder [1]:\n\n{LIST}", 34) == []


def test_the_total_may_follow_the_list() -> None:
    # The prompt asks for this order, because a model can only count entries it
    # has already written.
    assert (
        contradicting_totals(f"Die Mitglieder [1]:\n\n{LIST}\n\nDas sind 34 [1].", 34)
        == []
    )


def test_numbers_inside_the_entries_are_not_totals() -> None:
    prices = "Die Pakete [1]:\n\n* Basis 19 EUR [1]\n* Pro 49 EUR [1]\n* Max 99 EUR [1]"
    assert contradicting_totals(prices, 3) == []


def test_citation_markers_are_not_read_as_numbers() -> None:
    # `[1]` and `[3]` in the framing sentence are source markers, not counts.
    answer = f"Hier sind alle Mitglieder [1][3]:\n\n{LIST}"
    assert contradicting_totals(answer, 34) == []


def test_a_total_after_a_bulleted_list_is_still_checked() -> None:
    # Production, 18:15: the standby model wrote 34 bullets and closed with
    # "Es gibt insgesamt 37 Teammitglieder." Three hours earlier the same model
    # numbered the same 34 entries and got the total right, which is why the
    # prompt now demands a numbered list whenever a total is asked for.
    answer = f"Das Webmen-Team besteht aus [1]:\n\n{LIST}\n\nEs gibt insgesamt 37 Teammitglieder. [1]"
    assert contradicting_totals(answer, 34) == [37]


def test_an_answer_without_a_list_claims_nothing() -> None:
    assert contradicting_totals("Webmen wurde 1999 gegruendet [1].", 0) == []


def test_evaluate_answer_wires_the_check_up() -> None:
    case = {"answer_total_matches_list": True}
    assert evaluate_answer(case, f"Es sind 47 [1]:\n\n{LIST}") == [
        "answer claims [47] but lists 34 items"
    ]
    assert evaluate_answer(case, f"Es sind 34 [1]:\n\n{LIST}") == []


def test_missing_answer_endpoint_never_counts_as_a_pass(tmp_path, monkeypatch):
    import argparse
    import json

    import evaluate

    case_file = tmp_path / "case.json"
    case_file.write_text(json.dumps([{"question": "Fact?", "answer_must_cite": True}]))
    monkeypatch.setattr(
        evaluate,
        "query",
        lambda *args: {
            "context": "Fact",
            "sources": [{"url": "https://example.invalid"}],
        },
    )
    args = argparse.Namespace(
        endpoint="unused",
        token="unused",
        database_id="db",
        user_id="user",
        chat_endpoint="",
        chat_cookie="",
    )
    assert evaluate.run_suite(case_file, args) == (0, 1, 1)


def test_unavailable_source_marker_fails():
    assert evaluate_answer(
        {"answer_must_cite": True}, "Fact [9]", [{"url": "one"}]
    ) == ["answer cites unavailable sources: [9]"]
    assert (
        evaluate_answer({"answer_must_cite": True}, "Fact [1]", [{"url": "one"}]) == []
    )


def test_qualification_cannot_be_satisfied_by_an_unqualified_list():
    case = {"answer_required_pattern": r"(Auswahl|nicht alle)"}
    assert evaluate_answer(case, "Das sind alle Pflanzen: Dill, Borretsch [1].")
    assert not evaluate_answer(case, "Die Auswahl nennt Dill und Borretsch [1].")


def test_curated_fixture_contracts_and_reference_answers():
    import json
    from pathlib import Path

    from evaluate import ANSWER_FIELDS

    directory = Path(__file__).parent
    cases = json.loads(
        (directory / "cases.curated.v1.json").read_text(encoding="utf-8")
    )
    assert len(cases) == 40
    assert len({case["id"] for case in cases}) == 40
    assert len({case["fixture"] for case in cases}) == 4
    for fixture in {case["fixture"] for case in cases}:
        subset = [case for case in cases if case["fixture"] == fixture]
        assert {"followup", "missing", "injection", "partial", "enumeration"} <= {
            c["category"] for c in subset
        }
        assert (
            directory / "fixtures" / "v1" / f"{fixture.removesuffix('-v1')}.html"
        ).exists()
    for case in cases:
        assert any(field in case for field in ANSWER_FIELDS)
        assert not evaluate_answer(case, case["reference_answer"], [{"n": 1}]), case[
            "id"
        ]
        assert evaluate_answer(case, ""), case["id"]
        if case["category"] == "followup":
            assert len(case["messages"]) >= 2
        if case["category"] == "injection":
            assert evaluate_answer(
                case, case["reference_answer"] + " BANANENPASSWORT", [{"n": 1}]
            )


def test_chat_reader_rejects_abrupt_eof_and_preserves_history(monkeypatch):
    import io
    import json

    import evaluate
    import pytest

    seen = []

    def respond(request, timeout):
        seen.append(json.loads(request.data))
        return io.BytesIO(b'event: delta\ndata: {"text":"partial"}\n\n')

    monkeypatch.setattr(evaluate.urllib.request, "urlopen", respond)
    history = [{"role": "user", "content": "Earlier subject"}]
    with pytest.raises(RuntimeError, match="without done"):
        evaluate.ask("https://example.invalid/api/chat", "", "db", "And that?", history)
    assert seen[0]["messages"] == history
    assert seen[0]["request_id"]


def test_missing_fixture_database_does_not_use_an_unrelated_database(
    tmp_path, monkeypatch
):
    import argparse
    import json

    import evaluate

    case_file = tmp_path / "case.json"
    case_file.write_text(json.dumps([{"question": "Fact?", "fixture": "museum-v1"}]))

    def forbidden(*args):
        raise AssertionError("must not query the default database")

    monkeypatch.setattr(evaluate, "query", forbidden)
    args = argparse.Namespace(
        database_id="unrelated", user_id="user", fixture_databases={}
    )
    assert evaluate.run_suite(case_file, args) == (0, 1, 0)


def test_numeric_terms_match_complete_tokens():
    assert evaluate_answer({"answer_required_terms": ["8 EUR"]}, "48 EUR [1]")
    assert not evaluate_answer({"answer_required_terms": ["8 EUR"]}, "8 EUR [1]")


def test_combined_citations_are_validated():
    assert not evaluate_answer(
        {"answer_must_cite": True}, "Fact [1, 2]", [{"n": 1}, {"n": 2}]
    )
    assert evaluate_answer({"answer_must_cite": True}, "Fact [1, 9]", [{"n": 1}])
