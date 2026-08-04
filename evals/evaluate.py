import argparse
import json
import urllib.request
from pathlib import Path


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
        expected = case.get("required_source_url_contains", "")
        ok = bool(result.get("context")) and any(
            expected in source.get("url", "") for source in sources
        )
        passed += int(ok)
        print(f"{'PASS' if ok else 'FAIL'}: {case['question']}")
    print(f"{passed}/{len(cases)} bestanden")
    return 0 if passed == len(cases) else 1


if __name__ == "__main__":
    raise SystemExit(main())
