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
    with urllib.request.urlopen(request, timeout=60) as response:
        return json.load(response)


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Deterministische CraCha Retrieval-Evaluation"
    )
    parser.add_argument("--endpoint", required=True)
    parser.add_argument("--token", required=True)
    parser.add_argument("--database-id", required=True)
    parser.add_argument("--user-id", required=True)
    parser.add_argument("--cases", type=Path, default=Path("evals/cases.example.json"))
    args = parser.parse_args()

    cases = json.loads(args.cases.read_text(encoding="utf-8"))
    passed = 0
    for case in cases:
        result = query(
            args.endpoint, args.token, args.database_id, args.user_id, case["question"]
        )
        sources = result.get("sources", [])
        context = result.get("context", "")
        expected_url = case.get("required_source_url_contains", "")
        source_rank = next(
            (
                index + 1
                for index, source in enumerate(sources)
                if expected_url in source.get("url", "")
            ),
            None,
        )
        required_terms = case.get("required_context_terms", [])
        forbidden_terms = case.get("forbidden_context_terms", [])
        max_source_rank = int(case.get("max_source_rank", len(sources) or 1))
        min_coverage = float(case.get("min_context_coverage", 1.0))

        normalized_context = normalize(context)
        missing_terms = [
            term for term in required_terms if normalize(term).strip() not in normalized_context
        ]
        coverage = (
            1.0
            if not required_terms
            else (len(required_terms) - len(missing_terms)) / len(required_terms)
        )
        ok = (
            bool(context)
            and source_rank is not None
            and source_rank <= max_source_rank
            and coverage >= min_coverage
            and not any(normalize(term).strip() in normalized_context for term in forbidden_terms)
        )
        passed += int(ok)
        details = f" [coverage={coverage:.0%}, source_rank={source_rank}]"
        if missing_terms:
            details += f" missing={missing_terms[:5]}"
            if len(missing_terms) > 5:
                details += f" (+{len(missing_terms) - 5})"
        print(f"{'PASS' if ok else 'FAIL'}: {case['question']}{details}")
    print(f"{passed}/{len(cases)} bestanden")
    return 0 if passed == len(cases) else 1


if __name__ == "__main__":
    raise SystemExit(main())
