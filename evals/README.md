# Evaluation

Prüfung gegen eine echte, indexierte Wissensbasis, in zwei Stufen:

1. **Retrieval** — der Kontext, den `/query` liefert. Deterministisch, braucht
   nur den Query-Token, läuft immer.
2. **Antwort** — der Text, den das Modell daraus schreibt. Läuft nur mit
   `--chat-endpoint` und kostet einen echten Modellaufruf pro Fall.

Stufe 2 ist nicht optional aus Bequemlichkeit. Sie deckt eine ganze Fehlerklasse
ab, die Stufe 1 nicht sehen kann: Auf `webmen.de` lieferte das Retrieval alle 34
Teammitglieder in den Kontext, und die Antwort zählte trotzdem 32 auf, weil das
Modell drei Personen in einen Aufzählungspunkt gepackt hatte.

```bash
python evals/evaluate.py --endpoint https://<rag-api> --token <RAG_QUERY_SECRET> --database-id <id> --user-id <uid> --cases evals/cases.webmen.json evals/cases.example.json
```

## Antworten mitbewerten

`/api/chat` verlangt eine angemeldete Sitzung, deshalb braucht der Lauf das
Cookie aus dem Browser: Entwicklertools → Netzwerk → ein `/api/chat`-Request →
Request-Header → `Cookie` kopieren.

```bash
python evals/evaluate.py --endpoint https://<rag-api> --token <RAG_QUERY_SECRET> --database-id <id> --user-id <uid> --cases evals/cases.webmen.json --chat-endpoint https://<app>/api/chat --chat-cookie "<cookie>"
```

Fälle mit Antwort-Feldern können ohne `--chat-endpoint` nicht bestehen. Sie werden
als unvollständig gezählt; der Prozess endet mit Exit-Code 2. Exit-Code 0 setzt
mindestens einen Fall und alle angeforderten Antwortprüfungen voraus.
Antwortet das Ersatzmodell, steht das am Fall: dann misst der Lauf das
Ersatzmodell, nicht das primäre.

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
| `answer_min_list_items` | Wie viele verschiedene Aufzählungspunkte die Antwort mindestens haben muss. |
| `answer_required_terms` | Begriffe, die in der Antwort stehen müssen — nicht nur im Kontext. |
| `answer_forbidden_terms` | Begriffe, die in der Antwort nicht stehen dürfen. |
| `answer_must_cite` | Die Antwort muss mindestens einen Quellenmarker `[n]` tragen. |
| `answer_total_matches_list` | Eine genannte Gesamtzahl muss der Anzahl der aufgezählten Einträge entsprechen. |
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


## Versionierte Testquellen und 40 kuratierte Fälle

`fixtures/v1/*.html` enthält vier **fiktive, eigens geschriebene** Quellen:
Museum, CLI-Dokumentation, Kurskatalog und Gartenhandbuch. Sie sind keine
Produktversprechen, echten Organisationen oder gemessenen Modellausgaben.
`cases.curated.v1.json` deckt je Quelle Fakten, Negation, Zahlen, Vergleiche,
Aufzählungen, Englisch, Folgefragen, fehlendes Wissen, eingeschleuste Anweisungen
und unvollständige Übersichten ab. Die absichtlich bösartigen Kommentare sind
Testdaten. Befehle der fiktiven CLI nicht installieren oder ausführen.

1. Die vier HTML-Dateien unverändert auf einer kontrollierten Testseite mit den
   Dateinamen `museum.html`, `docs.html`, `courses.html`, `garden.html` bereitstellen.
2. Jede Quelle separat über den normalen Crawl in eine eigene Test-Wissensbasis
   indexieren. So bleibt die Nutzer-/Datenbanktrennung Teil des echten Tests.
3. Eine lokale JSON-Datei mit der Zuordnung anlegen, zum Beispiel:
   `{"museum-v1":"<id>","docs-v1":"<id>","courses-v1":"<id>","garden-v1":"<id>"}`.
4. Die Suite mit `--cases evals/cases.curated.v1.json --fixture-databases <datei>`
   sowie den oben beschriebenen Retrieval-, Benutzer- und Chatparametern starten.
   Fehlende Zuordnungen sind Fehler; sie fallen nicht auf irgendeine Datenbank zurück.
   Ein vollständiger Lauf erzeugt 40 echte Chat-Anfragen und verbraucht Guthaben.

`messages` wird für Folgefragen an Retrieval und Chat weitergereicht. Jeder
Chat-Aufruf erhält eine neue UUID als `request_id`. Ein SSE-Abbruch ohne `done`
zählt als Fehler. Quellenmarker dürfen nur tatsächlich gelieferte Quellen nennen.
`answer_required_pattern` prüft notwendige Einschränkungen/Verweigerungen;
`answer_required_terms_any` erlaubt mehrere zutreffende Formulierungen.

Die `reference_answer`-Texte sind handgeschriebene Beispiele zur Prüfung des
**Evaluators**, keine aufgezeichneten Antworten eines Modells. `pytest evals`
prüft ausschließlich diese Prüfmechanik und die Integrität der Testfälle. Es
belegt weder Retrievalqualität noch Modelltreue. Für eine Freigabe zusätzlich
echte Antworten auf sachlich richtige Zuordnung jeder Behauptung zur Quelle,
plausible Einschränkungen und natürliche Sprache prüfen. Schlagwort- und
Markerprüfungen können diese inhaltliche Kontrolle nicht ersetzen. Live-Ergebnisse
mit Modell, Datum, Quellenversion, Fallbackanteil und Fehlern dokumentieren;
keine Qualitätsquote aus Offline-Tests ableiten.
