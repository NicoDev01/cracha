# Runde 6 – Umsetzung der P1-Befunde aus Runde 5

Stand: 23.09.2026. Bezug: `docs/review-audit-runde5-2026-09-21.md`.

## P1: Jobwechsel zwischen Nachprüfung und Commit

**Ursache:** Prüfung, KV-Schreibvorgang und `commit-record` waren getrennte DO-Anfragen; `commitRecord` übernahm einen vollständigen Record ohne Job-/Generationsprüfung.

**Umsetzung:**

- `commit-record`, die `assert-*`-Einzelaufrufe und der `CoordinatorClient` sind entfernt. Der äußere Worker (`workers/rag-api/src/index.ts`) authentifiziert, liest die Wissensbasis-ID und leitet den ganzen Request per `forwardOperation` an das DO weiter.
- `KnowledgeBaseCoordinator` (`workers/rag-api/src/coordinator.ts`) führt jeden fachlichen Befehl (`ingest/pages`, `ingest/complete`, `ingest/failed`, `start-job`, `cancel-job`, `update-metadata`, `DELETE`) vollständig in einer DO-Queue aus: Job/Lebenszyklus prüfen, externe Indexoperation abwarten, Zustand verbindlich speichern, KV-Projektion schreiben. Erst danach läuft der nächste Befehl.
- Jeder Zustandswechsel mit Job-Bezug prüft `expectedJobId`/Generation am verbindlichen Übergang (`MutationContext.save`). Metadaten ändern nur Felder (`update-metadata`), kein Lebenszyklus-Rücksetzen.
- Vor der ersten externen Operation wird eine Absicht (`pending` mit Fingerprint und Job-ID) dauerhaft gespeichert. Nur ein identischer Wiederholungsaufruf setzt sie fort; ein anderer Job kann nicht starten.
- **Neu in dieser Runde:** Eine offene Crawl-Operation blockierte bisher auch `ingest/failed` und `cancel-job` desselben Jobs sowie Ownership-Abfragen des Chats. Nach drei erfolglosen Crawler-Retries blieb die Wissensbasis dauerhaft in `crawling` hängen. Jetzt dürfen Status, Ownership sowie Fehlschlag/Abbruch *des betroffenen Jobs* neben der offenen Operation laufen. Die Absicht bleibt offen, solange dieser Job aktiv ist. Eine offene Löschung lässt sich weiterhin nur durch Wiederholen der Löschung abschließen.

## P1: Fehlerhafte DO-Antworten als Erfolg

- Die Client-Methoden `markDeleting`, `markDeleted` und `commitRecord` gibt es nicht mehr. Alle verbleibenden DO-Aufrufe prüfen den HTTP-Status: `saveDatabase` und `databaseForUser` im Worker (`workers/rag-api/src/database.ts`), `coordinatorCommand` im Frontend (`src/lib/server/database-registry.ts`).
- Fehlt das `COORDINATOR`-Binding, antwortet der Worker mit 503. Es gibt keinen In-Memory-Fallback im Produktionspfad; der Testkoordinator liegt nur in `workers/rag-api/test/coordinator-fixture.ts`.

## Weitere Korrekturen

- Ein Python-Hilfsskript hatte in 11 Dateien `\r\r\n`-Zeilenenden erzeugt, unter anderem in `coordinator.ts`, `operations.ts` und `search.ts`. Das ließ die RAG-Typprüfung scheitern. Alle Dateien sind jetzt auf LF normalisiert, die Typfehler in `index.ts` sind behoben und die Einweg-Skripte `.edit-*.py`, `.fix-encoding.py` und `.refactor-coordinator.py` sind gelöscht.
- Die Release-Reihenfolge in `docs/deployment.md` ist präzisiert: Hook vor dem Preflight, DO-Migration nur über das reguläre Worker-Deployment.
- npm-Audit-Gate: `scripts/npm-audit.sh` wiederholt den Aufruf nur, wenn der Audit-Endpunkt selbst ausfällt, etwa bei npm-Wartung mit HTTP 503. Gefundene Schwachstellen brechen sofort ab. Bleibt der Endpunkt nicht erreichbar, schlägt der Schritt fehl (fail closed). Der letzte Deploy war nur an der npm-Wartung gescheitert; `npm audit` meldet lokal für Root und `workers/rag-api` 0 Schwachstellen.

## Nachträglich im ersten CI-Lauf gefunden

- `npm ci` in CI (Node 22, npm 10) lehnte die mit npm 11 erzeugte `package-lock.json` ab, weil verschachtelte esbuild-Einträge von vitest fehlten. Die Lockfiles sind jetzt mit npm 10 erzeugt; npm 10 und npm 11 installieren beide.
- Die RAG-Typprüfung fand in CI `@types/node` nicht, das lokal nur aus dem Root-Verzeichnis kam. `@types/node`, `esbuild` und `miniflare` sind jetzt Dev-Abhängigkeiten von `workers/rag-api`. Nachweis: sauberes `npm ci`, Typprüfung und Tests in einer isolierten Kopie.
- `type-check` führt vorher `next typegen` aus. Sonst fehlt in einem frischen Checkout `next-env.d.ts`, und die Bildimporte schlagen fehl.
- Die DO-Migration verwendet jetzt `new_sqlite_classes` statt `new_classes`. Laut Cloudflare-Changelog vom 09.07.2026 schlagen neue KV-gestützte DO-Namespaces fehl, wenn das Konto noch keinen besitzt; im Free-Plan gab es sie nie. Die Klasse nutzt nur die KV-API des Storage, die SQLite-gestützt gleich funktioniert. Die Migration war noch nie ausgerollt.

## Neue Tests

- `workers/rag-api/test/two-instance.test.ts`, Block „review round 5 regressions“:
  - Reproduktion aus Runde 5 als Regression: Job A hält während der Indexlöschung an, und eine zweite Worker-Instanz startet Job B. B wartet, bis A fertig ist, und bleibt danach im DO und in KV aktiv. Ein verspätetes Complete von A ergibt 409.
  - Ein fehlgeschlagener DO-Storage-Commit ergibt 503 und lässt den vorherigen Zustand stehen.
  - Nach einer unterbrochenen Crawl-Operation und einem Neustart bleibt Start B gesperrt. Ownership-Abfragen funktionieren, und ein Cancel für einen fremden Job hebt die Sperre nicht auf. `ingest/failed` des Jobs beendet ihn, danach startet B.
  - Eine offene Löschung sperrt Ownership und Start und lässt sich nur durch Wiederholen abschließen.
- `workers/rag-api/test/coordinator-errors.test.ts`: HTTP 500, 503 und 409 vom DO führen bei `saveDatabase` und `databaseForUser` zu einem Fehler. Ein fehlendes Binding ergibt 503.
- `workers/rag-api/test/durable-worker.test.ts` (echtes workerd/Miniflare):
  - Drei gleichzeitige Completes desselben Jobs ergeben genau einmal 200.
  - Nach einer unterbrochenen Indexoperation wird workerd mit persistiertem Storage neu gestartet. Die Absicht bleibt erhalten, Start B wird mit 503 abgewiesen, `ingest/failed` beendet den Job, danach startet B.
- `src/lib/server/database-registry.test.ts`: Fehlerstatus des Koordinators führt bei `saveDatabase` zu einem Fehler.

## Nachweise (lokal, 23.09.2026)

| Befehl | Ergebnis |
|---|---|
| `npm run check` | Exit 0. ESLint 0 Fehler/15 Warnungen, Typprüfung ok, 286 Frontend-Tests, RAG-Typprüfung ok, 104 Worker-Tests |
| `npm run build` | Exit 0 (Next.js 16.3.5) |
| `venv/Scripts/python.exe -m pytest services/crawler/tests` | 97 bestanden |
| `venv/Scripts/python.exe -m pytest evals -q` | 19 bestanden |
| `ruff check services/crawler evals` | ohne Befund |
| `npm audit --audit-level=high` (Root, `workers/rag-api`) | 0 Schwachstellen |
| `scripts/run-test-billing-wsl.sh` (PostgreSQL 16 in WSL) | `BILLING TRANSACTIONS AND CONCURRENCY PASSED` |

## Offene Grenzen

- Den Stopp *innerhalb* einer externen AI-Search-Operation prüfen nur die In-Process-Tests mit der echten Koordinatorklasse. Miniflare bietet kein AI-Search-Binding; der workerd-Test deckt den Neustart nach persistierter Absicht vor dem externen Effekt ab.
- Lesende Chat-Anfragen (`owned`) laufen durch dieselbe DO-Queue und warten während eines Ingest-Batches, bis dieser fertig ist. Das ist korrekt, kann aber die Antwortzeit während eines Crawls verlängern.
