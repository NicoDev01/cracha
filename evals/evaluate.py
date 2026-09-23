import argparse
import json
import re
import time
import unicodedata
import urllib.request
import uuid
from datetime import UTC, datetime
from pathlib import Path
from urllib.parse import urlsplit

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


LIST_ITEM = re.compile(r"^\s*(?:[-*+]|\d+[.)])\s+(.*)$")
CITATION_MARKER = re.compile(r"\[\d+(?:\s*,\s*\d+)*\]")
INTEGER = re.compile(r"\b(\d{1,6})\b")
ANSWER_FIELDS = (
    "answer_min_list_items",
    "answer_required_terms",
    "answer_forbidden_terms",
    "answer_must_cite",
    "answer_total_matches_list",
    "answer_required_terms_any",
    "answer_required_pattern",
)


def list_items(answer: str) -> list[str]:
    """The entries an enumerating answer actually produced.

    Counting them is the check the context assertions cannot make: retrieval
    delivered all 34 team members and the answer still listed 32, because it
    packed three people into one bullet.
    """
    items = []
    for line in answer.splitlines():
        match = LIST_ITEM.match(line)
        if not match:
            continue
        body = CITATION_MARKER.sub("", match.group(1)).strip(" .;,")
        if body:
            items.append(body)
    return items


def contradicting_totals(answer: str, item_count: int) -> list[int]:
    """Counts the answer claims in prose that its own list does not support.

    A model that announces "47 members" and then names 34 has contradicted
    itself in the same breath, and no assertion about the list alone sees it.
    Only the sentences framing the list are read: a number elsewhere in the
    answer is a price, a year or a version, not a count of the entries.
    """
    lines = answer.splitlines()
    positions = [index for index, line in enumerate(lines) if LIST_ITEM.match(line)]
    if not positions or item_count < 1:
        return []

    framing = [
        line
        for index, line in enumerate(lines)
        if line.strip() and not LIST_ITEM.match(line)
        and (index < positions[0] or index > positions[-1])
    ]
    claimed = {
        int(match)
        for line in framing
        for match in INTEGER.findall(CITATION_MARKER.sub("", line))
        # Below two it is prose ("one of them"), above six digits a serial.
        if 2 <= int(match) <= 100_000
    }
    return sorted(claimed - {item_count})


# Recall is reported at these cut-offs. 8 is what /api/chat asks for, so
# Recall@8 is the share of cases whose expected page reached the model.
RECALL_KS = (1, 3, 5, 8)
DEFAULT_TOP_K = 8


def source_rank(sources: list, expected_url: str) -> int | None:
    """1-based position of the first source whose URL contains `expected_url`."""
    if not expected_url:
        return None
    return next(
        (
            index + 1
            for index, source in enumerate(sources)
            if expected_url in str(source.get("url", ""))
        ),
        None,
    )


def retrieval_metrics(ranks: list[int | None], ks: tuple[int, ...] = RECALL_KS) -> dict:
    """Recall@k and MRR over the cases that name an expected source.

    One expected URL per case, so Recall@k is the share of cases whose source
    appeared within the first k results and MRR the mean of 1/rank. A case
    whose source never appeared, or whose request failed, is a miss and adds 0
    to both; dropping it would flatter the numbers.
    """
    count = len(ranks)
    if not count:
        return {"cases": 0, "mrr": None, **{f"recall@{k}": None for k in ks}}
    found = [rank for rank in ranks if rank is not None]
    return {
        "cases": count,
        "mrr": round(sum(1 / rank for rank in found) / count, 4),
        **{f"recall@{k}": round(sum(1 for rank in found if rank <= k) / count, 4) for k in ks},
    }


def summarize(records: list[dict]) -> dict:
    """The numbers a run is judged by, over any set of case records."""
    total = len(records)
    passed = sum(1 for record in records if record["passed"])
    return {
        "cases": total,
        "passed": passed,
        "pass_rate": round(passed / total, 4) if total else None,
        "request_errors": sum(1 for record in records if record.get("error")),
        "answer_checks_skipped": sum(1 for record in records if record.get("answer_skipped")),
        "fallback_answers": sum(1 for record in records if record.get("fallback")),
        "retrieval": retrieval_metrics(
            [record["source_rank"] for record in records if record.get("expected_url")]
        ),
    }


def format_retrieval(metrics: dict) -> str:
    if not metrics["cases"]:
        return "Retrieval: keine Fälle mit required_source_url_contains"
    recalls = ", ".join(
        f"Recall@{key.split('@')[1]}={value:.2f}"
        for key, value in metrics.items()
        if key.startswith("recall@")
    )
    return f"Retrieval ({metrics['cases']} Fälle mit Soll-URL): {recalls}, MRR={metrics['mrr']:.3f}"


def default_output_path(now: datetime) -> Path:
    return Path("evals") / "results" / f"{now.strftime('%Y%m%dT%H%M%SZ')}.json"


def write_results(path: Path, run: dict) -> Path:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(run, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    return path


def query(
    endpoint: str,
    token: str,
    database_id: str,
    user_id: str,
    question: str,
    messages: list | None = None,
    top_k: int = DEFAULT_TOP_K,
    rerank: bool | None = None,
) -> dict:
    body: dict = {
        "tenant_id": database_id,
        "user_id": user_id,
        "question": question,
        "top_k": top_k,
        "messages": messages or [],
    }
    # Absent means the deployed default, so a run without --rerank measures
    # exactly what users get.
    if rerank is not None:
        body["rerank"] = rerank
    request = urllib.request.Request(
        f"{endpoint.rstrip('/')}/query",
        data=json.dumps(body).encode(),
        headers={
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
        },
        method="POST",
    )
    with urllib.request.urlopen(request, timeout=120) as response:
        return json.load(response)


def ask(chat_endpoint: str, cookie: str, database_id: str, question: str, messages: list | None = None) -> dict:
    """Read one answer off the chat endpoint's SSE stream.

    This is the deployed pipeline, generation included — the only place where a
    weak enumeration or a dropped citation becomes visible.
    """
    request = urllib.request.Request(
        chat_endpoint,
        data=json.dumps(
            {"tenant_id": database_id, "question": question, "top_k": 8, "messages": messages or [], "request_id": str(uuid.uuid4())}
        ).encode(),
        headers={"Content-Type": "application/json", "Cookie": cookie},
        method="POST",
    )
    answer = ""
    fallback = False
    event = ""
    complete = False
    sources = []
    with urllib.request.urlopen(request, timeout=300) as response:
        for raw in response:
            line = raw.decode("utf-8").rstrip("\r\n")
            if line.startswith("event:"):
                event = line[6:].strip()
            elif line.startswith("data:"):
                payload = json.loads(line[5:].strip())
                if event == "delta":
                    answer += payload.get("text", "")
                elif event in {"meta", "done"}:
                    fallback = payload.get("fallback", fallback) is True
                    if event == "meta":
                        sources = payload.get("sources", [])
                    if event == "done":
                        complete = True
                        if payload.get("incomplete"):
                            raise RuntimeError("incomplete answer")
                elif event == "error":
                    raise RuntimeError(payload.get("message", "generation failed"))
    if not complete:
        raise RuntimeError("chat stream ended without done event")
    return {"answer": answer, "fallback": fallback, "sources": sources}


def evaluate_answer(case: dict, answer: str, sources: list | None = None) -> list[str]:
    """Assertions about the text the reader sees, not the context behind it."""
    reasons: list[str] = []
    normalized = normalize(answer)

    minimum = case.get("answer_min_list_items")
    if minimum is not None:
        items = list_items(answer)
        # Distinct, because a model that repeats an entry has not found more.
        unique = {normalize(item) for item in items}
        if len(unique) < int(minimum):
            reasons.append(f"answer listed {len(unique)} items, expected {minimum}")

    missing = [
        term
        for term in case.get("answer_required_terms", [])
        if normalize(term) not in normalized
    ]
    if missing:
        shown = ", ".join(missing[:5])
        extra = f" (+{len(missing) - 5})" if len(missing) > 5 else ""
        reasons.append(f"answer missing: {shown}{extra}")

    present = [
        term
        for term in case.get("answer_forbidden_terms", [])
        if normalize(term) in normalized
    ]
    if present:
        reasons.append(f"answer contains forbidden: {present[:5]}")

    if case.get("answer_must_cite") and not CITATION_MARKER.search(answer):
        reasons.append("answer carries no citation marker")

    any_terms = case.get("answer_required_terms_any", [])
    if any_terms and not any(normalize(term) in normalized for term in any_terms):
        reasons.append("answer misses all accepted alternative terms")
    pattern = case.get("answer_required_pattern")
    if pattern and not re.search(pattern, answer, re.IGNORECASE):
        reasons.append("answer does not match required qualification/refusal")
    if sources is not None:
        cited = {int(number.strip()) for marker in CITATION_MARKER.findall(answer)
                 for number in marker[1:-1].split(",")}
        allowed = {int(source.get("n", index + 1)) for index, source in enumerate(sources)}
        if cited - allowed:
            reasons.append(f"answer cites unavailable sources: {sorted(cited - allowed)}")

    if case.get("answer_total_matches_list"):
        listed = len({normalize(item) for item in list_items(answer)})
        wrong = contradicting_totals(answer, listed)
        if wrong:
            reasons.append(f"answer claims {wrong} but lists {listed} items")

    if not answer.strip():
        reasons.append("empty answer")
    return reasons


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
    rank = source_rank(sources, expected_url)
    if expected_url:
        max_source_rank = int(case.get("max_source_rank", len(sources) or 1))
        if rank is None:
            reasons.append(f"source {expected_url} not retrieved")
        elif rank > max_source_rank:
            reasons.append(f"source_rank={rank} > {max_source_rank}")

    normalized_context = normalize(context)

    required_terms = case.get("required_context_terms", [])
    missing_terms = [
        term for term in required_terms if normalize(term) not in normalized_context
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
    if any_terms and not any(normalize(term) in normalized_context for term in any_terms):
        reasons.append(f"none of {any_terms[:5]} in the context")

    present_forbidden = [
        term
        for term in case.get("forbidden_context_terms", [])
        if normalize(term) in normalized_context
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

    if not context and not case.get("allow_empty_context"):
        reasons.append("empty context")

    detail = f" [coverage={coverage:.0%}, source_rank={rank}, sources={len(sources)}]"
    if reasons:
        detail += " " + "; ".join(reasons)
    return not reasons, detail


def run_suite(
    path: Path, args: argparse.Namespace, records: list[dict] | None = None
) -> tuple[int, int, int]:
    """Run one case file; each case's outcome is appended to `records` if given."""
    cases = json.loads(path.read_text(encoding="utf-8"))
    database_id = args.database_id
    user_id = args.user_id
    top_k = getattr(args, "top_k", DEFAULT_TOP_K)
    rerank = getattr(args, "rerank", None)
    passed = 0
    skipped_answers = 0
    print(f"\n=== {path.name} ({len(cases)} Fälle) ===")
    for case in cases:
        record: dict = {
            "suite": path.name,
            "id": case.get("id"),
            "question": case["question"],
            "expected_url": case.get("required_source_url_contains") or None,
            "source_rank": None,
            "passed": False,
        }
        if records is not None:
            records.append(record)
        # A suite may target its own knowledge base, so one run can cover a
        # company site, a documentation site and a university site at once.
        fixture_id = case.get("fixture")
        fixture_database = getattr(args, "fixture_databases", {}).get(fixture_id)
        if fixture_id and not fixture_database:
            record["error"] = f"no database mapping for fixture {fixture_id}"
            print(f"FAIL: {case['question']} [no database mapping for fixture {fixture_id}]")
            continue
        case_database = case.get("database_id", fixture_database or database_id)
        started = time.monotonic()
        try:
            result = query(
                args.endpoint,
                args.token,
                case_database,
                case.get("user_id", user_id),
                case["question"],
                case.get("messages", []),
                top_k=top_k,
                rerank=rerank,
            )
        except Exception as error:  # noqa: BLE001 - one broken call must not hide the rest
            record["error"] = f"{type(error).__name__}: {error}"
            print(f"FAIL: {case['question']} [request failed: {type(error).__name__}: {error}]")
            continue
        sources = result.get("sources", [])
        record["latency_ms"] = round((time.monotonic() - started) * 1000)
        # A cached retrieval says nothing about a changed search setting.
        record["cached"] = bool((result.get("usage") or {}).get("cached"))
        record["retrieved_urls"] = [str(source.get("url", "")) for source in sources]
        record["source_rank"] = source_rank(sources, record["expected_url"] or "")
        ok, detail = evaluate_case(case, result)

        wants_answer = any(case.get(field) is not None for field in ANSWER_FIELDS)
        if wants_answer and not args.chat_endpoint:
            skipped_answers += 1
            record["answer_skipped"] = True
            ok = False
            detail += " [answer checks skipped: no --chat-endpoint]"
        elif wants_answer:
            try:
                spoken = ask(args.chat_endpoint, args.chat_cookie, case_database, case["question"], case.get("messages", []))
            except Exception as error:  # noqa: BLE001
                ok = False
                record["error"] = f"chat: {type(error).__name__}: {error}"
                detail += f" [chat failed: {type(error).__name__}: {error}]"
            else:
                answer_reasons = evaluate_answer(case, spoken["answer"], spoken["sources"])
                record["fallback"] = spoken["fallback"]
                # A run against the standby model measures the standby model.
                # Saying so beats an unexplained regression in the numbers.
                if spoken["fallback"]:
                    detail += " [answered by the fallback model]"
                if answer_reasons:
                    ok = False
                    detail += " " + "; ".join(answer_reasons)

        passed += int(ok)
        record["passed"] = ok
        record["detail"] = detail.strip()
        print(f"{'PASS' if ok else 'FAIL'}: {case['question']}{detail}")
    print(f"{passed}/{len(cases)} bestanden in {path.name}")
    return passed, len(cases), skipped_answers


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
    parser.add_argument(
        "--chat-endpoint",
        default="",
        help="Voll qualifizierte /api/chat-URL. Fehlende Antwort-Prüfungen machen den Lauf unvollständig (Exit 2).",
    )
    parser.add_argument(
        "--chat-cookie",
        default="",
        help="Session-Cookie für --chat-endpoint, wie im Browser gesendet.",
    )
    parser.add_argument("--fixture-databases", type=Path,
                        help="JSON object mapping versioned fixture IDs to their indexed database IDs.")
    parser.add_argument("--top-k", type=int, default=DEFAULT_TOP_K,
                        help=f"top_k für /query (Standard {DEFAULT_TOP_K}, wie /api/chat).")
    parser.add_argument(
        "--rerank",
        choices=("default", "on", "off"),
        default="default",
        help="Reranking für diesen Lauf erzwingen. 'default' sendet nichts und misst die Deploy-Einstellung.",
    )
    parser.add_argument(
        "--output",
        type=Path,
        nargs="?",
        const=True,
        default=None,
        help="Ergebnisse als JSON speichern. Ohne Pfad: evals/results/<UTC-Zeitstempel>.json.",
    )
    args = parser.parse_args()
    args.fixture_databases = json.loads(args.fixture_databases.read_text(encoding="utf-8")) if args.fixture_databases else {}
    args.rerank = {"default": None, "on": True, "off": False}[args.rerank]

    started_at = datetime.now(UTC)
    records: list[dict] = []
    suites: dict[str, dict] = {}
    passed = 0
    total = 0
    skipped = 0
    for path in args.cases:
        suite_records: list[dict] = []
        suite_passed, suite_total, suite_skipped = run_suite(path, args, suite_records)
        suites[path.name] = summarize(suite_records)
        print(format_retrieval(suites[path.name]["retrieval"]))
        records.extend(suite_records)
        passed += suite_passed
        total += suite_total
        skipped += suite_skipped
    summary = summarize(records)
    print(f"\n{passed}/{total} bestanden insgesamt")
    print(format_retrieval(summary["retrieval"]))
    if args.output is not None:
        target = write_results(
            default_output_path(started_at) if args.output is True else args.output,
            {
                "started_at": started_at.isoformat(),
                "finished_at": datetime.now(UTC).isoformat(),
                # Hosts only: the token and the chat cookie never go to disk.
                "endpoint_host": urlsplit(args.endpoint).hostname,
                "chat_endpoint_host": urlsplit(args.chat_endpoint).hostname if args.chat_endpoint else None,
                "top_k": args.top_k,
                "rerank": args.rerank,
                "cases_files": [str(path) for path in args.cases],
                "summary": summary,
                "suites": suites,
                "cases": records,
            },
        )
        print(f"Ergebnisse gespeichert: {target}")
    if skipped:
        # Loud, because a green run that never asked the model proves less than
        # it looks like it does.
        print(f"{skipped} Fall/Fälle ohne Antwort-Prüfung — --chat-endpoint fehlt.")
        return 2
    return 0 if total > 0 and passed == total else 1


if __name__ == "__main__":
    raise SystemExit(main())
