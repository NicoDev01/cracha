import argparse
import json
import re
import unicodedata
import urllib.request
from pathlib import Path

_UMLAUTS = str.maketrans({"ä": "ae", "ö": "oe", "ü": "ue", "ß": "ss"})


def normalize(value: str) -> str:
    """Match the runtime grounding rules so an eval failure means a real gap.

    Hyphens, umlaut spellings and spacing differ between a page and the term
    written in a case file; none of those are retrieval defects.
    """
    folded = unicodedata.normalize("NFC", value).casefold().translate(_UMLAUTS)
    stripped = "".join(
        character
        for character in unicodedata.normalize("NFKD", folded)
        if not unicodedata.combining(character)
    )
    return f" {re.sub(r'[^0-9a-z]+', ' ', stripped).strip()} "


def query(endpoint: str, token: str, database_id: str, user_id: str, question: str) -> dict:
    request = urllib.request.Request(
        f"{endpoint.rstrip('/')}/query",
        data=json.dumps(
            {
                "tenant_id": database_id,
                "user_id": user_id,
                "question": question,
                "top_k": 6,
            }
        ).encode(),
        headers={
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
        },
        method="POST",
    )
    with urllib.request.urlopen(request, timeout=120) as response:
        return json.load(response)


def evaluate_case(case: dict, result: dict) -> tuple[bool, str]:
    """Check one case and return whether it passed plus a short explanation.

    Every assertion is optional, so a case file can describe what matters for
    that knowledge base: a company site cares about complete lists, a
    documentation site about landing on the right page with its code intact.
    """
    sources = result.get("sources", [])
    blocks = result.get("blocks", [])
    context = result.get("context", "")
    reasons: list[str] = []

    expected_url = case.get("required_source_url_contains", "")
    source_rank = next(
        (
            index + 1
            for index, source in enumerate(sources)
            if expected_url and expected_url in source.get("url", "")
        ),
        None,
    )
    if expected_url:
        max_source_rank = int(case.get("max_source_rank", len(sources) or 1))
        if source_rank is None:
            reasons.append(f"source {expected_url} not retrieved")
        elif source_rank > max_source_rank:
            reasons.append(f"source_rank={source_rank} > {max_source_rank}")

    normalized_context = normalize(context)

    required_terms = case.get("required_context_terms", [])
    missing_terms = [
        term for term in required_terms if normalize(term).strip() not in normalized_context
    ]
    coverage = (
        1.0
        if not required_terms
        else (len(required_terms) - len(missing_terms)) / len(required_terms)
    )
    if required_terms and coverage < float(case.get("min_context_coverage", 1.0)):
        shown = ", ".join(missing_terms[:5])
        extra = f" (+{len(missing_terms) - 5})" if len(missing_terms) > 5 else ""
        reasons.append(f"coverage={coverage:.0%} missing: {shown}{extra}")

    # "At least one of these" fits questions with several correct phrasings,
    # where demanding all of them would test the page, not the retrieval.
    any_terms = case.get("required_context_terms_any", [])
    if any_terms and not any(normalize(term).strip() in normalized_context for term in any_terms):
        reasons.append(f"none of {any_terms[:5]} in the context")

    present_forbidden = [
        term
        for term in case.get("forbidden_context_terms", [])
        if normalize(term).strip() in normalized_context
    ]
    if present_forbidden:
        reasons.append(f"forbidden terms present: {present_forbidden[:5]}")

    # Verbatim, because code samples and table rows must survive chunking and
    # link stripping character for character.
    missing_verbatim = [
        snippet for snippet in case.get("required_context_verbatim", []) if snippet not in context
    ]
    if missing_verbatim:
        reasons.append(f"verbatim snippet missing: {missing_verbatim[0][:60]!r}")

    if len(sources) < int(case.get("min_source_count", 1)):
        reasons.append(f"only {len(sources)} source(s)")

    expects_collection = case.get("expect_collection_page")
    if expects_collection is not None:
        has_collection = any(block.get("collection") for block in blocks)
        if bool(expects_collection) != has_collection:
            reasons.append(
                "expected a collection page" if expects_collection
                else "unexpectedly treated as an enumeration"
            )

    if case.get("expect_complete_collection") and any(
        block.get("collection") and block.get("truncated") for block in blocks
    ):
        reasons.append("the collection page did not fit the context budget")

    if not context:
        reasons.append("empty context")

    detail = f" [coverage={coverage:.0%}, source_rank={source_rank}, sources={len(sources)}]"
    if reasons:
        detail += " " + "; ".join(reasons)
    return not reasons, detail


def run_suite(path: Path, args: argparse.Namespace) -> tuple[int, int]:
    cases = json.loads(path.read_text(encoding="utf-8"))
    database_id = args.database_id
    user_id = args.user_id
    passed = 0
    print(f"\n=== {path.name} ({len(cases)} Fälle) ===")
    for case in cases:
        # A suite may target its own knowledge base, so one run can cover a
        # company site, a documentation site and a university site at once.
        try:
            result = query(
                args.endpoint,
                args.token,
                case.get("database_id", database_id),
                case.get("user_id", user_id),
                case["question"],
            )
        except Exception as error:  # noqa: BLE001 - one broken call must not hide the rest
            print(f"FAIL: {case['question']} [request failed: {type(error).__name__}: {error}]")
            continue
        ok, detail = evaluate_case(case, result)
        passed += int(ok)
        print(f"{'PASS' if ok else 'FAIL'}: {case['question']}{detail}")
    print(f"{passed}/{len(cases)} bestanden in {path.name}")
    return passed, len(cases)


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Deterministische CraCha Retrieval-Evaluation über mehrere Wissensbasen"
    )
    parser.add_argument("--endpoint", required=True)
    parser.add_argument("--token", required=True)
    parser.add_argument("--database-id", required=True)
    parser.add_argument("--user-id", required=True)
    parser.add_argument(
        "--cases",
        type=Path,
        nargs="+",
        default=[Path("evals/cases.example.json")],
        help="Eine oder mehrere Fall-Dateien.",
    )
    args = parser.parse_args()

    passed = 0
    total = 0
    for path in args.cases:
        suite_passed, suite_total = run_suite(path, args)
        passed += suite_passed
        total += suite_total
    print(f"\n{passed}/{total} bestanden insgesamt")
    return 0 if passed == total else 1


if __name__ == "__main__":
    raise SystemExit(main())
