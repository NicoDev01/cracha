# Retrieval-Evaluation

Deterministische Prüfung des Retrievals gegen eine echte, indexierte Wissensbasis.
Bewertet wird der Kontext, den `/query` liefert — nicht der Text des Sprachmodells.
Damit misst der Lauf genau das, was CraCha selbst entscheidet.

```bash
python evals/evaluate.py --endpoint https://<rag-api> --token <RAG_QUERY_SECRET> --database-id <id> --user-id <uid> --cases evals/cases.webmen.json evals/cases.example.json
```

## Vor dem Deploy messen

`workers/rag-api/src/eval-harness.ts` stellt dasselbe `/query` ohne Token bereit
und läuft gegen den echten Index. Damit lässt sich eine Änderung am Retrieval
bewerten, bevor sie live geht:

```bash
npx wrangler dev --config wrangler.eval.jsonc --port 8801
```

Der Harness ist nie `main` des Workers und daher in Produktion nicht erreichbar.

Mehrere Fall-Dateien sind erlaubt. Jede Datei bekommt ihre eigene Bilanz, der
Exit-Code ist 0, wenn alle Fälle bestanden sind. Ein Fall darf `database_id` und
`user_id` selbst setzen — so deckt ein Lauf mehrere Wissensbasen gleichzeitig ab,
etwa eine Firmenseite, eine Doku-Seite und eine Hochschulseite.

## Felder eines Falls

| Feld | Wirkung |
| --- | --- |
| `question` | Pflicht. Die Frage, wie ein Mensch sie stellen würde. |
| `required_source_url_contains` | Teilstring der URL, die als Quelle auftauchen muss. |
| `max_source_rank` | Auf welchem Platz diese Quelle spätestens stehen muss. |
| `required_context_terms` | Begriffe, die im Kontext stehen müssen (umlaut- und bindestrichtolerant). |
| `min_context_coverage` | Anteil davon, der genügt. Standard 1.0. |
| `required_context_terms_any` | Mindestens einer dieser Begriffe muss vorkommen. |
| `required_context_verbatim` | Zeichengenau, ohne Normalisierung — für Code, Befehle, Tabellenzeilen. |
| `forbidden_context_terms` | Begriffe, die nicht vorkommen dürfen. |
| `min_source_count` | Wie viele Quellen mindestens zurückkommen. Standard 1. |
| `expect_collection_page` | `true`/`false`: ob die Frage als Aufzählung behandelt werden soll. |
| `expect_complete_collection` | Die Übersichtsseite muss vollständig in den Kontext passen. |
| `database_id`, `user_id` | Überschreiben die Werte der Kommandozeile für diesen Fall. |

## Welche Fragetypen eine neue Wissensbasis abdecken sollte

CraCha soll auf jeder Art von Quelle funktionieren, nicht auf einer. Eine neue
Fall-Datei ist erst aussagekräftig, wenn sie diese Typen enthält:

1. **Aufzählung** — „Wer ist im Team?", „Welche Befehle gibt es?" Prüft, ob die
   Übersichtsseite vollständig gelesen wird (`expect_complete_collection`).
2. **Einzelfakt** — eine Zahl, ein Datum, eine Adresse. Prüft Präzision.
3. **Definition** — „Was ist X?" Muss auf der Sachseite landen, nicht auf einem
   Inhaltsverzeichnis (`expect_collection_page: false`).
4. **Strukturierter Inhalt** — Preise, Versionen, Code. `required_context_verbatim`
   deckt auf, wenn Chunking oder Link-Bereinigung etwas zerlegt haben.
5. **Aktualität** — „Was ist der neueste Beitrag?" Prüft die Datumsauswertung.
6. **Andere Sprache** — dieselbe Frage in einer Sprache, in der die Seite nicht
   geschrieben ist.
7. **Nicht beantwortbar** — etwas, das die Seite nicht enthält.
   `forbidden_context_terms` fängt ab, dass eine thematisch ähnliche Seite als
   Antwort durchgeht.

Die Archetypen ohne Live-Index sind zusätzlich als Offline-Szenarien in
`workers/rag-api/test/scenarios.test.ts` abgedeckt und laufen bei jedem Commit.
