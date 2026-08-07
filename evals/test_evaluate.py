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
    assert contradicting_totals(f"Die Mitglieder [1]:\n\n{LIST}\n\nDas sind 34 [1].", 34) == []


def test_numbers_inside_the_entries_are_not_totals() -> None:
    prices = "Die Pakete [1]:\n\n* Basis 19 EUR [1]\n* Pro 49 EUR [1]\n* Max 99 EUR [1]"
    assert contradicting_totals(prices, 3) == []


def test_citation_markers_are_not_read_as_numbers() -> None:
    # `[1]` and `[3]` in the framing sentence are source markers, not counts.
    answer = f"Hier sind alle Mitglieder [1][3]:\n\n{LIST}"
    assert contradicting_totals(answer, 34) == []


def test_an_answer_without_a_list_claims_nothing() -> None:
    assert contradicting_totals("Webmen wurde 1999 gegruendet [1].", 0) == []


def test_evaluate_answer_wires_the_check_up() -> None:
    case = {"answer_total_matches_list": True}
    assert evaluate_answer(case, f"Es sind 47 [1]:\n\n{LIST}") == [
        "answer claims [47] but lists 34 items"
    ]
    assert evaluate_answer(case, f"Es sind 34 [1]:\n\n{LIST}") == []
