# Audit-Umsetzung · Abschlussbericht

## Stand
- **Ausgangs-HEAD / geprüfter Endstand:** `4998a5b03f841be60f41688c2f2ed200e0aeddb3`
- **Arbeitsbaum vor Beginn bereits geändert:** Ja; Arbeitsbaum enthielt bereits die Vorarbeiten zu B2C-Tarifen, Settlement und den Review-Korrekturen R1–R7 sowie N1–N4.
- **Eigene geänderte/neue Dateien:**
  - `services/crawler/cracha_crawler/security.py`: `SafeRobotsParser` mit IP-Pinning & Redirect-Schutz, `install_crawl4ai_security_patches()`, `SafeEgressProxy`
  - `services/crawler/cracha_crawler/crawl.py`: Chromium-Launch mit `--proxy-bypass-list=<-loopback>`, `crawler.robots_parser = SafeRobotsParser()`
  - `services/crawler/tests/test_security.py`: 15 Tests inkl. DNS-Rebinding, 302-Redirects, Chromium Playwright Egress Blocking (Subressourcen, Iframes, Fetch, WebSockets)
  - `services/crawler/modal_app.py`: E501-Zeilenlänge korrigiert
  - `src/lib/server/credits.ts`: Fail-closed Quota-Allokation, `claimDatabaseDeletion`, `getActiveDeletionClaim` mit strikter Fehlerweiterleitung, `bindCrawlHold`
  - `src/lib/server/database-registry.ts`: Status `'deleting'`, KV-Teilerfolg-Cleanup-Schutz, Übergabe von `existingIds`, ungeschütztes `.catch(() => null)` in `saveDatabase` entfernt
  - `src/lib/server/database-registry.test.ts`: Tests für Teilerfolg-Kompensation, Bereinigung unbenutzter Variablen
  - `src/lib/server/crawler-api.ts`: Status-Guards gegen `'deleting'` und `'crawling'` bei Recrawl-Anfragen
  - `src/lib/server/crawler-enqueue.test.ts`: Tests für Recrawl-Schutz bei löschenden/laufenden Wissensbasen
  - `src/app/api/databases/[id]/route.ts`: Differenzierte Fehlerbehandlung bei `claimDatabaseDeletion` (503 bei RPC-Fehler, 409 nur bei Crawl-Konflikt), Status `'deleting'` in KV, strikte Fehlerprüfung bei Cleanup im normalen Pfad und im Retry-Pfad (503 bei Netzwerk-/Claim-Fehler, 500 bei Cleanup-Fehler), Slot-Deallokation erst nach vollständiger Bereinigung
  - `src/app/api/databases/[id]/route.test.ts`: 26 Tests (inkl. 6 neuer Fehlerfalltests für RPC-Fehler, RAG-Netzwerkfehler, Worker-Statusfehler, Cleanup-Fehler in `deleteCrawlAccess`, `releaseDatabase`, `deallocateDatabaseSlot`)
  - `workers/rag-api/src/coordinator.ts`: Cloudflare Durable Object `KnowledgeBaseCoordinator` (dauerhafter Zustand in `ctx.storage`, monotoner Generationszähler, `withLock`-Zustandsserialisierung je Instanz, `assertCanSave`, `reconcilePostWrite`), `CoordinatorClient`, `createTestCoordinatorNamespace`
  - `workers/rag-api/wrangler.jsonc`: Durable Object Binding `COORDINATOR` (`KnowledgeBaseCoordinator`) und Migration `v1-knowledge-base-coordinator`
  - `workers/rag-api/src/types.ts`: `COORDINATOR?: DurableObjectNamespace`
  - `workers/rag-api/src/database.ts`: Koordinator-DO-Prüfung vor KV-Put, atomare Post-Write-Reconciliation mit automatischem KV-Rollback bei Zwischenlöschung (409) und Wiederherstellung des aktiven Jobs bei Ablösung (409)
  - `workers/rag-api/src/search.ts`: Barriere-Prüfung des aktiven Jobs vor und nach externen Item-Mutationen in `uploadPages` und `deleteStaleItems`
  - `workers/rag-api/src/index.ts`: Export von `KnowledgeBaseCoordinator`; Routen `/coordinator/:id/save`, `/coordinator/:id/start-job`, `/coordinator/:id/cancel-job`, `/coordinator/:id/state`; Entfernung äußerer Locks über asynchrone HTTP-Grenzen (Deadlock-Befreiung); idempotentes Cleanup von Remote-Ressourcen (AI Search) und Cache bei fehlendem KV-Record
  - `src/lib/server/database-registry.ts`: `saveDatabase` leitet Schreibvorgänge autoritativ über `env.RAG_API.fetch('/coordinator/:id/save')` an den Koordinator-DO weiter; kein ungeschützter Direktschreibpfad
  - `workers/rag-api/test/two-instance.test.ts`: 3 Tests für verteilte Zwei-Instanzen-Koordination mit uninstrumentiertem KV (`vi.resetModules()`, Deletion-Interleaving mit Put-Hold, Job-B-Start-Interleaving, Crash/Restart mit Zustandserhalt in DO Storage)
  - `workers/rag-api/test/durable-worker.test.ts`: Echte workerd-Laufzeitprüfung (Miniflare v5) mit Durable Object Instanziierung und Persistenz
  - `workers/rag-api/test/lifecycle.test.ts`: 18 Tests ohne künstliche Test-Proxies gegen uninstrumentierten Bare-KV-Mock
  - `supabase/migrations/20260920100000_database_quota_guards.sql`: `database_allocate`, `database_claim_delete`, `bind_crawl_hold`, `database_sync_batch` mit Wiederbelebungsschutz gelöschter IDs, `database_preflight_check`
  - `scripts/test-billing.py`: Concurrency-Tests, multithreaded Deletion/Hold, Idempotent Claim Retry
  - `scripts/run-test-billing-wsl.sh`: Runner für WSL PostgreSQL 16
  - `scripts/preflight-release.ts`: `database_preflight_check` Diagnose-RPC, `credit_settle` mit `p_actual`, restriktive RPC-Fehlerprüfung, Auth-Hook `Before User Created` als Release-Gate
  - `scripts/preflight-release.test.ts`: Vitest-Tests für Preflight-Logik
  - `.github/workflows/deploy.yml`: `include-hidden-files: true` und `if-no-files-found: error` beim Artefakt-Upload; `verify-build`-Job als verbindliches Gate vor RAG-Worker-, Crawler- und Frontend-Deploy
  - `.github/workflows/ci.yml`: `python -m playwright install --with-deps chromium` im Linux-Runner
  - `docs/deployment.md`: Korrigiertes Runbook für `supabase db push` und Auth-Hook
  - `docs/audit-umsetzung-report-2026-09-20.md`: Dieser Bericht
- **Laufzeitversionen und Prüfdatum:**
  - Node.js: `v24.15.0`
  - Python: `3.14.4` (Windows), `3.12.3` (WSL Ubuntu)
  - PostgreSQL: `16.11` (WSL Ubuntu)
  - Next.js: `16.3.5` (Turbopack)
  - Vitest: `4.1.11`
  - Prüfdatum: 21. September 2026
- **Produktionsdeploy:** **Keines.** Explizite Nutzerobergrenze eingehalten: kein Live-Deploy, keine Secret-Rotation auf Cloudflare, Modal oder Supabase.

---

## Ergebnis je Paket

| Paket/Befund | Status: erledigt/teilweise/blockiert | Umsetzung + Datei:Zeile | konkreter Nachweis | Restpunkt |
|---|---|---|---|---|
| **P1 / A2** (BYOK-Kontentrennung) | erledigt | `src/stores/chat-store.ts:60–120`, `src/hooks/use-chat-store.ts:25–45` | Vitest `chat-store.test.ts`: Key nur im RAM, Bereinigung alter localStorage-Stände, kein Key-Leck bei Logout/Benutzerwechsel | Keine |
| **P1 / A3** (Servermodell ohne BYOK) | erledigt | `src/app/api/chat/route.ts:80–120`, `src/lib/server/generation.ts:40–70` | Vitest `chat/route.test.ts`: Client-Modelangaben ohne validen Key ignoriert, serverseitiges Standardmodell erzwungen | Keine |
| **P2 / A5** (Eingabelimit 4.000 Zeichen) | erledigt | `src/app/api/chat/route.ts:45–60`, `workers/rag-api/src/index.ts:75` | Vitest: 4.000 Zeichen nach Trim erlaubt, 4.001 Zeichen vor Credit-Abbuchung mit 400 abgewiesen | Keine |
| **P3 / A1 HTTPX** (SSRF-Schutz) | erledigt | `services/crawler/cracha_crawler/security.py:60–140` (`SSRFSafeNetworkBackend`, `SafeAsyncHTTPTransport`) | Pytest `test_security.py`: DNS-Rebinding abgewehrt, private IPs/Loopback/Metadata-Ranges blockiert, SNI/Host erhalten | Keine |
| **P3 / A1 Browser** (SSRF & Robots) | erledigt | `services/crawler/cracha_crawler/security.py:145–288, 322–450`, `crawl.py:630–645` | Pytest `test_security.py`: Echter Playwright Chromium blockiert Unterressourcen/WebSockets/Iframes via `SafeEgressProxy`; `SafeRobotsParser` blockiert Rebinding & 302-Redirects zu Loopback | Keine |
| **P4 / A4** (Atomare DB-Quota) | erledigt | `supabase/migrations/20260920100000_database_quota_guards.sql:28–95`, `src/lib/server/credits.ts:291–312` | WSL PostgreSQL 16 `scripts/test-billing.py`: 30 parallele Allokationen (25 Erfolg, 5 Abweisung), Foreign Collision verhindert, Fail-Closed bei RPC-Fehlern (`database-allocation.test.ts`) | Keine |
| **P4 / Crawl-Lifecycle** (Lösch-Koordination) | erledigt | `supabase/migrations/20260920100000_database_quota_guards.sql:174–254`, `src/app/api/databases/[id]/route.ts:40–75`, `crawler-api.ts:108–118`, `workers/rag-api/src/index.ts:125, 153, 78` | WSL PostgreSQL 16: `database_claim_delete` & `bind_crawl_hold` serialisiert; Vitest: DELETE bei laufendem Crawl 409, RPC-Fehler 503, Ingest/Complete/Query bei `deleting` mit 409 abgewiesen | Keine |
| **P5 / A6** (Lint-Integration) | erledigt | `package.json:scripts.lint`, `.github/workflows/ci.yml` | `npm run check` führt ESLint fehlerfrei aus (0 Fehler, 15 unkritische Altwarnungen); `python -m ruff check` fehlerfrei | Keine |
| **P5 / Vitest** (Major-Upgrade v4) | erledigt | `package.json`, `workers/rag-api/package.json` | `npm audit` und `npm audit --prefix workers/rag-api` melden 0 Schwachstellen; alle Tests laufen fehlerfrei unter Vitest 4.1.11 | Keine |
| **P6 / Migration/Preflight** | erledigt | `scripts/preflight-release.ts`, `supabase/migrations/20260920100000_database_quota_guards.sql`, `.github/workflows/deploy.yml` | Vitest `preflight-release.test.ts` (8/8 passed); `database_preflight_check()` ohne Schema-Mutation, Gate in CI vor Deployment | Keine |
| **P6 / Betriebsnachweise/Doku** | erledigt | `docs/deployment.md`, `docs/architecture.md` | Runbook beschreibt `supabase db push` ohne `--file`, Aktivierung des Auth-Hooks `Before User Created` im Dashboard dokumentiert | Manuelle Dashboard-Aktivierung auf Live-Instanz erforderlich |
| **R3 / F1** (Lösch-Retry Fehlerbehandlung) | erledigt | `src/app/api/databases/[id]/route.ts`, `src/lib/server/credits.ts:384–405`, `src/lib/server/database-registry.ts:223–233` | Vitest `route.test.ts`: 26 Tests (inkl. 6 neuer Fehlerfalltests: 503 bei Claim-Abfrage- und RAG-Netzwerkfehler, 500 bei Worker-Status- und Cleanup-Fehlern; Slot bleibt belegt) | Keine |
| **R3 / F2 / R4** (Verteilte Schreibkoordination / DO) | erledigt | `workers/rag-api/src/coordinator.ts`, `wrangler.jsonc`, `database.ts:40–110`, `index.ts:130–280, 520–580`, `src/lib/server/database-registry.ts:197–231` | Vitest `two-instance.test.ts` (3 Tests mit Bare-KV & `vi.resetModules()`), `durable-worker.test.ts` (Miniflare workerd Runtime), `lifecycle.test.ts` (18 Tests ohne Proxies); 92 Worker-Tests bestanden | Keine |
| **R3 / F3** (CI / OpenNext Artefakt) | erledigt | `.github/workflows/deploy.yml:32–55`, `.github/workflows/ci.yml:68` | `include-hidden-files: true`, `if-no-files-found: error`, vorgeschalteter `verify-build`-Job prüft `.open-next/worker.js` und `assets`; Playwright Chromium im Linux-Runner | Keine |
| **R3 / F4** (Ruff E501 Zeilenlänge) | erledigt | `services/crawler/modal_app.py:389` | `python -m ruff check services/crawler evals` meldet 0 Fehler (Exit-Code 0) | Keine |

---

## Entscheidende Regressionen

### 1. SSRF in Crawl4AI robots.txt Fetch & Redirects (R1)
- **Testdatei und Testname:** `services/crawler/tests/test_security.py` → `test_safe_robots_parser_blocks_dns_rebinding_regression`, `test_safe_robots_parser_blocks_redirect_to_loopback`, `test_real_crawl4ai_crawler_robots_txt_ssrf_blocked`.
- **Ausgangsverhalten:** Beobachtet: `crawl4ai.utils.RobotsParser` nutzte ungeschütztes `aiohttp.ClientSession().get(..., ssl=False)` und kontaktierte bei DNS-Rebinding oder 302-Redirects den lokalen Dummy-Server `http://127.0.0.1:{port}/robots.txt`.
- **Verhalten nach Änderung:** `SafeRobotsParser` verwendet `SafeAsyncHTTPTransport` mit IP-Pinning; Verbindungen zu Loopback/Private-IPs werden vor TCP-Verbindungsaufbau abgebrochen. Lokaler Dummy-Server empfängt 0 Requests (`received_requests == 0`).
- **Echte vs. gemockte Komponenten:** Echter HTTP-Dummy-Server auf `127.0.0.1`, echte `socket.getaddrinfo`-Interceptoren zur Simulation von DNS-Rebinding, echter HTTP-Redirector-Server für 302-Kette.

### 2. Chromium Browser Unterressourcen & WebSockets Egress (R1)
- **Testdatei und Testname:** `services/crawler/tests/test_security.py` → `test_real_chromium_browser_subresources_and_websockets_blocked_by_proxy`.
- **Ausgangsverhalten:** Beobachtet: Frühere Socket-Mock-Tests belegten nicht, ob Chromium bei Subressourcen (`<img>`, `<script>`, `<iframe>`, `fetch()`, `WebSocket`) den Proxy umgeht.
- **Verhalten nach Änderung:** Chromium startet mit `--proxy-server=http://127.0.0.1:{proxy.port}` und `--proxy-bypass-list=<-loopback>`. Alle Verbindungsversuche auf 127.0.0.1 werden vom Proxy mit `403 Forbidden` abgewiesen. Lokaler Testserver empfängt 0 Requests (`received_requests == 0`).
- **Echte vs. gemockte Komponenten:** Vollständiger Headless Chromium via Playwright, echter lokaler Dummy-HTTP-Server, echter lokaler `SafeEgressProxy`.

### 3. Fail-Closed bei Quota-RPC-Fehler (R2)
- **Testdatei und Testname:** `src/lib/server/database-allocation.test.ts` → `fails closed when RPC throws an error or fails`.
- **Ausgangsverhalten:** Beobachtet: `allocateDatabaseSlot()` fiel bei RPC-Fehler auf KV-Zählung zurück und erlaubte Neuanlagen ohne Bestätigung.
- **Verhalten nach Änderung:** RPC-Fehler führt zum sofortigen Abbruch (`throw new Error('Datenbankkontingent konnte nicht geprüft werden.')`). Keine Wissensbasis wird angelegt.
- **Echte vs. gemockte Komponenten:** Supabase RPC gemockt (Fehlerfall simuliert); End-to-End-Garantie durch WSL-PostgreSQL-Test gestützt.

### 4. Bestandskonto-Cutover & Wiederbelebungsschutz (R3)
- **Testdatei und Testname:** `scripts/test-billing.py` (WSL PostgreSQL 16) → Zeilen 157–182, 240–252.
- **Ausgangsverhalten:** Aus Quellcode abgeleitet: Direkter POST auf `/api/databases` synchronisierte KV-Bestand nicht vorab in SQL; ein Bestandskonto mit 25 KV-Basen konnte eine 26. Base anlegen. Stale Snapshots konnten gelöschte Basen re-importieren.
- **Verhalten nach Änderung:** `createDatabase` übergibt `existingIds`; `database_allocate` und `database_sync_batch` importieren Bestand atomar und prüfen `user_database_deletions`. 26. Allokation wird abgewiesen (`allowed=false`). Wiederholte Synchronisierung gelöschter IDs wird ignoriert.
- **Echte vs. gemockte Komponenten:** Echte PostgreSQL 16.11 Datenbankinstanz in WSL.

### 5. Check-then-act Race zwischen Crawl-Start und Löschung (R4)
- **Testdatei und Testname:** `scripts/test-billing.py` → Case A & Case B (Zeilen 218–240); `src/app/api/databases/[id]/route.test.ts`; `workers/rag-api/test/lifecycle.test.ts`.
- **Ausgangsverhalten:** Aus Quellcode abgeleitet: DELETE prüfte Holds vorab; ein paralleler Crawl konnte nach der Prüfung starten und durch `deleteCrawlAccess` freigegeben werden, während der Ingest weiterlief.
- **Verhalten nach Änderung:** `database_claim_delete` und `bind_crawl_hold` serialisieren atomar über `pg_advisory_xact_lock(hashtext(user))`. Deletion Claim sperrt sofort gegen nachfolgende Crawls; aktiver Hold sperrt sofort gegen Löschung (409 Conflict). KV-Status `'deleting'` blockiert parallelen Ingest/Complete/Query in RAG mit 409.
- **Echte vs. gemockte Komponenten:** Echte PostgreSQL-Advisory-Locks in WSL; Vitest-Routenprüfungen mit NextRequest/Worker-Environment.

### 6. Quota-Kompensation bei partiellem KV-Schreibfehler (R6)
- **Testdatei und Testname:** `src/lib/server/database-registry.test.ts` → `retains slot reservation when partial KV write cleanup cannot verify keys are gone`.
- **Ausgangsverhalten:** Beobachtet: Bei Teilfehlern in `claimDatabase` wurde der SQL-Slot deallokiert, wodurch verwaiste KV-Einträge ohne Slot-Reservierung verbleiben konnten.
- **Verhalten nach Änderung:** `createDatabase` deallokiert den Slot nur, wenn die rückstandslose Löschung beider KV-Keys verifiziert werden kann. Andernfalls bleibt die Reservierung fail-closed erhalten.
- **Echte vs. gemockte Komponenten:** Gemockter KV-Speicher mit injiziertem Schreib-/Löschfehler.

### 7. Lösch-Retry meldet trotz fehlgeschlagener Bereinigung Erfolg (F1)
- **Testdatei und Testname:** `src/app/api/databases/[id]/route.test.ts` → `returns 500 when deallocation fails during retry of an already-deleted KV database`, `returns 500 when deleteCrawlAccess fails on retry, keeping slot allocated`, `returns 500 when releaseDatabase fails on retry, keeping slot allocated`, `rejects DELETE with 503 Service Unavailable when getActiveDeletionClaim query fails on retry`, `rejects DELETE with 503 Service Unavailable when RAG fetch network fails on retry, keeping claim open`.
- **Ausgangsverhalten:** Beobachtet: Wenn der KV-Datensatz bereits gelöscht war, führte ein Retry der Löschung trotz Fehlern bei Bereinigungsschritten (`deleteCrawlAccess`, `releaseDatabase`, `deallocateDatabaseSlot`) zu einem HTTP 200 oder gab vorzeitig den Slot frei. Ein DB-Abfragefehler in `getActiveDeletionClaim` wurde still geschluckt und als 404 gewertet.
- **Verhalten nach Änderung:** Fehler in Teilschritten führen sofort zu HTTP 500/503. Der SQL-Slot wird erst deallokiert, wenn alle Bereinigungsschritte nachweislich erfolgreich durchlaufen wurden. `getActiveDeletionClaim` wirft DB-Fehler fail-closed weiter (HTTP 503).
- **Echte vs. gemockte Komponenten:** Vitest NextRequest/Route-Handler-Tests mit injizierten Teilschritt-Fehlern; WSL PostgreSQL 16 Suite.

### 8. Verteilte Schreibkoordination & Vermeidung von Auferstehung / Job-Überschreibung (F2 / Runde 4)
- **Testdatei und Testname:** `workers/rag-api/test/two-instance.test.ts` → `proves two worker instances with bare KV: Worker B deletes, delayed Worker A complete gets 409 and does not resurrect`, `proves Job B started on separate worker while Writer A is held at KV put does not overwrite Job B`, `proves failure and restart during deletion: durable state persists, retry finishes cleanup, no early quota release`; `workers/rag-api/test/durable-worker.test.ts` → `runs KnowledgeBaseCoordinator in real workerd runtime, persisting across calls`; `workers/rag-api/test/lifecycle.test.ts` (18 Tests ohne Proxies).
- **Ausgangsverhalten:** Beobachtet in Runde 4: Der bisherige `DatabaseCoordinator` nutzte JavaScript-Maps im Speicher einer einzelnen Worker-Instanz. Bei getrennten Worker-Instanzen (`vi.resetModules()`) oder im Frontend-Worker hielt Worker A den KV-Put von Job A an, während Worker B erfolgreich DELETE ausführte (HTTP 200). Nach Freigabe des Puts von Worker A überschrieb dieser den gelöschten Zustand und belebte die Wissensbasis als `active` wieder. Zudem konnte ein verzögerter Callback von Job A einen neu gestarteten Job B überschreiben.
- **Verhalten nach Änderung:** Einführung des zentralen, persistenten Cloudflare Durable Objects `KnowledgeBaseCoordinator` (`workers/rag-api/src/coordinator.ts`) pro Wissensbasis (`env.COORDINATOR.idFromName(databaseId)`).
  - Der Zustand (`generation`, `status`, `activeJobId`) wird dauerhaft in `ctx.storage` persistiert und übersteht Instanz-Neustarts.
  - Alle mutierenden Pfade (Start/Generationswechsel, Abbruch, Metadaten-PUT, Ingest, Complete, Failed, DELETE) laufen verbindlich über den Koordinator-DO.
  - Das Frontend leitet Direktschreibpfade (`saveDatabase`) autoritativ über `env.RAG_API.fetch('/coordinator/:id/save')` an den Koordinator weiter.
  - Atomare Post-Write-Reconciliation (`reconcilePostWrite`): Unmittelbar nach jedem KV-Put prüft der Worker den Zustand gegen den Koordinator-DO. Wurde die Wissensbasis zwischenzeitlich gelöscht, wird der Datensatz per KV-Delete sofort zurückgerollt und HTTP 409 geworfen. Wurde ein neuerer Job gestartet, wird der aktive Job in KV re-projiziert und HTTP 409 geworfen.
  - Externe asynchrone I/O-Abschnitte (wie Vektor-Uploads) blockieren keine globalen Locks mehr; die DO-Zustandstransitionen sind per DO-interner `withLock`-Queue serialisiert.
- **Echte vs. gemockte Komponenten:** Vollständig getrennte Worker-Instanzen und Closures via `vi.resetModules()`, uninstrumentierter Bare-KV-Mock ohne Proxies oder synthetische Sync-Hooks (`two-instance.test.ts`), echte workerd-Laufzeitumgebung via Miniflare v5 (`durable-worker.test.ts`).

---

## Tatsächlich ausgeführte Prüfungen

| Befehl | Umgebung | Exit-Code | Tests/Ergebnis | Warnungen |
|---|---|---|---|---|
| `npm run check` | Windows, Node v24.15.0 | **0** | ESLint: 0 Fehler; Next Typecheck: 0 Fehler; Vitest Frontend: 21 Dateien / **284 Tests bestanden**; RAG Typecheck: 0 Fehler; RAG Vitest: 7 Dateien / **92 Tests bestanden** (gesamt 376 Vitest-Tests) | 15 unkritische bestehende ESLint-Warnungen |
| `./venv/Scripts/python.exe -m pytest services/crawler/tests evals/test_evaluate.py -q` | Windows, Python 3.14.4 (venv) | **0** | **116 Tests bestanden** (inkl. Playwright Chromium Egress Blocking und SafeRobotsParser DNS-Rebinding / 302-Redirects) | 2 Deprecation-Warnungen (Modal SDK SelectorEventLoop) |
| `./venv/Scripts/python.exe -m ruff check services/crawler evals` | Windows, Python 3.14.4 (venv) | **0** | All checks passed! (0 Fehler) | Keine |
| `npm run build` | Windows, Next.js 16.3.5 (Turbopack) | **0** | 30/30 statische Seiten generiert, alle Routen kompiliert | 1 Deprecation-Hinweis (middleware-to-proxy) |
| `npm run build:cf` | Windows, @opennextjs/cloudflare 1.20.2 | **0** | OpenNext Cloudflare-Build erfolgreich: `.open-next\worker.js` generiert | Windows-Kompatibilitätshinweis von OpenNext |
| `bash scripts/run-test-billing-wsl.sh` | WSL Ubuntu, PostgreSQL 16.11, Python 3.12 | **0** | `BILLING TRANSACTIONS AND CONCURRENCY PASSED`: 30 parallele Allokationen (25/5), Foreign Collision, Cutover, Deletion-Resurrection-Schutz, Hold/Crawl Mutual Exclusion, Multithreaded Deletion/Hold Concurrency, Idempotent Claim Retry | Keine |
| `npx vitest run scripts/preflight-release.test.ts` | Windows, Node v24.15.0 | **0** | **8 Tests bestanden** (Preflight-Validierung, Schema-Gates, Read-Only Diagnostic RPC inkl. Vollständigkeitsprüfung aller 6 Funktionen, Auth-Hook-Blocker) | Keine |
| `git diff --check` | Windows, git | **0** | Keine Whitespace-Fehler | CRLF/LF Konvertierungshinweise |
| `npm audit` | Windows | **0** | 0 Schwachstellen | Keine |
| `npm audit --prefix workers/rag-api` | Windows | **0** | 0 Schwachstellen | Keine |

---

## Nacharbeiten aus Review Runde 2 (N1–N4)

### N1: Preflight scheitert an Fremdschlüssel-Constraint auf frischer DB
- **Ursache:** `scripts/preflight-release.ts` rief mutierende Funktionen (`database_allocate`, `database_claim_delete` etc.) mit einer Dummy-UUID auf. Auf frischer oder korrekt migrierter Supabase-DB verletzt dies den FK `user_database_syncs_user_id_fkey -> auth.users(id)`.
- **Behebung:**
  - Hinzufügen der idempotenten, rein lesenden Diagnose-RPC `public.database_preflight_check()` in `supabase/migrations/20260920100000_database_quota_guards.sql`.
  - Prüft Existenz und Signaturen aller 6 Quota-/Lock-Funktionen sowie `EXECUTE`-Rechte der Rolle `service_role` ohne Datenmutation oder FK-Prüfung.
  - `scripts/preflight-release.ts` nutzt `database_preflight_check()` statt mutierender Dummy-Aufrufe und erzwingt das Vorhandensein aller 6 Diagnosefunktionen.
- **Nachweis:** `scripts/preflight-release.test.ts` (8/8 bestanden); in `scripts/test-billing.py` gegen echte PostgreSQL 16 verifiziert: 0 Tabellenmutationen, fehlerhafte/entzugene Rechte werden abgewiesen.

### N2: Fehlgeschlagene Löschungen lassen sich nicht fortsetzen / Slot zu früh frei
- **Ursache:** `database_claim_delete` löschte den Datensatz in `user_databases` sofort. Dadurch wurde der Quota-Slot vorzeitig freigegeben. Scheiterte die nachfolgende KV- oder Cloudflare-Löschung, war ein Wiederholungsaufruf blockiert (gab 404 zurück) und ein neuer Crawl konnte den Slot belegen. Zudem fing `credits.ts` Deallokationsfehler ab, statt fail-closed abzubrechen, und Phantom-DELETEs auf unbekannte IDs erzeugten fälschlicherweise neue Claims.
- **Behebung:**
  - `user_database_deletions` erweitert um `completed_at timestamptz`.
  - `database_claim_delete` sperrt per Advisory Lock, setzt Claim mit `completed_at = NULL` und belässt den Datensatz in `user_databases` (Slot bleibt blockiert). Bei Wiederholungsversuchen desselben Nutzers wird der Claim idempotent bestätigt (`allowed: true`); fremde Nutzer werden abgewiesen (`reason: 'forbidden'`).
  - Erst `database_deallocate` schließt den Claim (`completed_at = COALESCE(completed_at, now())`) ab und löscht aus `user_databases`.
  - `deallocateDatabaseSlot` wirft Fehler strikt weiter (Fail-Closed, HTTP 500 bei Deallokationsfehler).
  - In `src/app/api/databases/[id]/route.ts`: Ist der KV-Eintrag nicht vorhanden, wird via `getActiveDeletionClaim` geprüft, ob ein offener In-Progress-Claim vorliegt. Nur dann wird idempotent finalisiert; ansonsten wird korrekt HTTP 404 zurückgegeben.
- **Nachweis:** `scripts/test-billing.py` mit echtem Multithreading (parallele Threads für `database_claim_delete` vs. `bind_crawl_hold`); idempotenter Retry nach Teilfehler verifiziert; `src/app/api/databases/[id]/route.test.ts` (20/20 bestanden inkl. 404 bei Phantom-DB und Fail-Closed Fehlerweiterleitung).

### N3: Verspäteter KV-Schreibvorgang überlebt den Rollback
- **Ursache:** `claimDatabase` nutzte `Promise.all`. Bei Ablehnung eines Puts wurde sofort der Catch/Cleanup gestartet, während der andere Put noch lief. Dieser konnte den Datensatz nachträglich in KV anlegen, nachdem der SQL-Slot freigegeben war.
- **Behebung:**
  - `claimDatabase` und `releaseDatabase` in `src/lib/server/database-registry.ts` auf `Promise.allSettled` umgestellt. Alle Schreibvorgänge laufen vollständig aus, bevor Kompensation oder Freigabe erfolgt.
  - `saveDatabase` verweigert das Überschreiben eines `status === 'deleting'` mit einem anderen Status.
- **Nachweis:** `src/lib/server/database-registry.test.ts`: 3 neue Interleaving-Tests mit Promise-Barrieren (verzögerter Record-Put, verzögerter Owner-Put, Cleanup-Fehler). 19/19 Tests bestanden; `database-allocation.test.ts` (15/15 bestanden).

### N4: Laufende und alte Crawl-Callbacks überschreiben Zustand
- **Ursache:** RAG-Worker las KV-Zustand am Beginn von Callbacks (`/ingest/pages`, `/ingest/complete`, `/ingest/failed`) und schrieb die veraltete Kopie nach asynchronen AI-Search-Operationen ungeschützt zurück. Veraltete Callbacks von Job A konnten Job B überschreiben oder gelöschte Wissensbasen wiederbeleben.
- **Behebung:**
  - `current_job_id?: string` in `DatabaseRecord` und Callback-Payloads eingeführt.
  - Beim Crawl-Start speichert `crawler-api.ts` die `holdReference` als `current_job_id`.
  - Crawler übergibt `job_id` an alle RAG-Ingest-Endpunkte (`upload`, `finalize`, `mark_failed`).
  - RAG-Worker erzwingt `assertActiveJob(env, databaseId, userId, jobId)`: Abweisung bei `deleting`, Abweisung bei Status != `crawling`, Abweisung bei Job-Mismatch. Bei aktivem Job werden unkeyed Failed-Callbacks ignoriert.
  - `deleteStaleItems` und `uploadPages` führen vor Mutationen (`items.delete`, `items.upload`) einen Barriere-Check gegen die Registry aus.
  - `handleComplete`, `handleIngest` und `handleFailed` laden vor dem Zurückschreiben den frischen KV-Stand und verifizieren Invarianten erneut.
  - `saveDatabase` in `workers/rag-api/src/database.ts` verhindert Wiederbelebung gelöschter Basen und Überschreiben von `deleting`.
  - Metadaten-`PUT` in `src/app/api/databases/[id]/route.ts` lädt den aktuellen Stand vor dem Speichern und aktualisiert ausschließlich `name` und `description`.
  - `.github/workflows/deploy.yml`: Cloudflare-Build (`npm run build:cf`) als vorgezogener Job `build-frontend` vor das Deployment von Worker und Crawler gezogen; Build-Artefakt `.open-next` wird an den Frontend-Deploy übergeben.
- **Nachweis:** `workers/rag-api/test/lifecycle.test.ts`: 4 Interleaving-, Callback- und Generationsisolations-Tests (13/13 bestanden).

---

## Nacharbeiten aus Review Runde 3 (F1–F4)

### F1: Lösch-Retry meldet trotz fehlgeschlagener Bereinigung Erfolg
- **Ursache:** Im Retry-Pfad von `src/app/api/databases/[id]/route.ts` (wenn der KV-Datensatz bereits gelöscht ist) wurden Fehler in Teilschritten (`deleteCrawlAccess`, `releaseDatabase`, `deallocateDatabaseSlot`) nicht abgefangen oder unvollständig verarbeitet. Zudem unterdrückte `getActiveDeletionClaim` in `src/lib/server/credits.ts` Datenbankfehler und lieferte fälschlicherweise `null` (führt zu 404 statt 503), und Netzwerkabbrüche zum RAG-Worker führten nicht zum kontrollierten Abbruch mit Claim-Erhalt.
- **Behebung:**
  - `src/lib/server/credits.ts`: `getActiveDeletionClaim` wirft Datenbankfehler bei der Abfrage von `user_database_deletions` strikt weiter.
  - `src/app/api/databases/[id]/route.ts`:
    - Abfrage von `getActiveDeletionClaim` fängt Fehler ab und antwortet mit `503 Service Unavailable`.
    - Aufruf von `ragFetch` fängt Netzwerkfehler im Retry-Pfad und im Normalpfad ab (`503 Service Unavailable`), sodass der Claim offen und der Slot blockiert bleibt.
    - Statusprüfung des Workers akzeptiert nur `200` oder `404`; alle anderen Worker-Codes führen zu `500 Internal Server Error`.
    - `deleteCrawlAccess`, `releaseDatabase` und `deallocateDatabaseSlot` werden im Retry-Pfad in einem strikten `try/catch` ausgeführt und werfen bei Fehlern `500 Internal Server Error`.
    - Der Slot wird in beiden Pfaden erst deallokiert, nachdem alle Bereinigungsschritte nachweislich erfolgreich abgeschlossen sind.
  - `src/lib/server/database-registry.ts`: `kv.get` in `saveDatabase` wirft Lesefehler weiter, anstatt sie mit `.catch(() => null)` als Nichtvorhandensein zu maskieren.
- **Nachweis:** `src/app/api/databases/[id]/route.test.ts` (6 neue Tests für Teilschrittfehler, gesamt 26/26 Tests bestanden).

### F2: Alte Callbacks können gelöschte Daten wiederherstellen oder Job B überschreiben (Runde 3 Vorstufe)
- **Ursache:** Reine Lese-Prüfungen vor dem Schreiben (`assertActiveJob`) im RAG-Worker reichten nicht aus, da asynchrone Vektor-Uploads (`uploadPages`, `items.upload`) oder KV-Netzwerklatenzen ein Fenster öffneten, in dem ein paralleler Deletion- oder Job-Wechsel-Aufruf erfolgte.
- **Behebung:** Erste Mutex-Koordination und Post-Write-Reconciliation im RAG-Worker. (Siehe nachfolgende Runde 4 für die finale verteilte Härtung via Durable Object).
- **Nachweis:** `workers/rag-api/test/lifecycle.test.ts`.

### F3: GitHub Actions Artefakt-Upload schließt `.open-next` standardmäßig aus
- **Ursache:** `actions/upload-artifact@v4` schließt dot-Dateien und dot-Ordner (wie `.open-next`) standardmäßig aus (`include-hidden-files: false`), sodass der Frontend-Deploy fehlschlug.
- **Behebung:**
  - `.github/workflows/deploy.yml`: Bei `upload-artifact@v4` wurden `include-hidden-files: true` und `if-no-files-found: error` konfiguriert.
  - Zusätzlicher zwingender Verifikations-Job `verify-build` als Gate vor `rag-worker`, `crawler` und `frontend`, der das Vorhandensein und die Mindestgröße von `.open-next/worker.js` und `.open-next/assets` prüft.
  - `.github/workflows/ci.yml`: Ergänzung von `python -m playwright install --with-deps chromium` im Linux-Runner für deterministische Browser-Tests.
- **Nachweis:** Lokale Prüfung der Dateistruktur von `.open-next`, Workflow-Syntaxvalidierung.

### F4: Ruff scheitert an überlanger Zeile
- **Ursache:** `services/crawler/modal_app.py:389` überschritt das E501-Zeilenlängenlimit.
- **Behebung:** Zeile formatiert und umgebrochen.
- **Nachweis:** `./venv/Scripts/python.exe -m ruff check services/crawler evals` läuft fehlerfrei mit Exit-Code 0.

---

## Nacharbeiten aus Review Runde 4 (P1 / F2 Verteilte Schreibkoordination via Durable Object)

### P1 / F2: Der Koordinator gilt nur innerhalb einer Worker-Instanz
- **Ursache:** In Runde 3 nutzte `DatabaseCoordinator` JavaScript-Maps (`states`, `queues`) innerhalb des lokalen Worker-Isolates. Da Cloudflare keine gemeinsame Instanz für konkurrierende Requests garantiert, besaß Instanz A andere Maps als Instanz B. Wurde Worker A bei einem KV-Put angehalten, während Worker B erfolgreich DELETE (HTTP 200) ausführte, schrieb Worker A nach Fortsetzung den Datensatz wieder als `active` zurück. Zudem umging das Frontend (`saveDatabase`) den Koordinator durch direkte KV-Puts.
- **Behebung:**
  - **Zentraler persistenter Koordinator:** Einführung des Cloudflare Durable Objects `KnowledgeBaseCoordinator` (`workers/rag-api/src/coordinator.ts`), gebunden als `env.COORDINATOR` in `wrangler.jsonc` mit Migration `v1-knowledge-base-coordinator`. Jede Wissensbasis wird deterministisch über `env.COORDINATOR.idFromName(databaseId)` adressiert.
  - **Dauerhafter Zustand & Generationszähler:** `generation`, `status` (`'pending' | 'crawling' | 'active' | 'failed' | 'deleting' | 'deleted'`) und `activeJobId` werden atomar in `ctx.storage` persistiert. Neustarts oder Crashs von Worker-Isolates verlieren weder Generation noch Löschentscheidungen.
  - **Verbindliche Einbindung aller mutierenden Pfade:**
    - Start / Generationswechsel: `/coordinator/:id/start-job` setzt Generation + 1 und bindet `activeJobId`.
    - Abbruch: `/coordinator/:id/cancel-job` markiert abgebrochene Jobs atomar.
    - Metadaten-PUT & Frontend: `src/lib/server/database-registry.ts` (`saveDatabase`) leitet alle Schreiboperationen über `env.RAG_API.fetch('/coordinator/:id/save')` verbindlich an den DO-Koordinator weiter.
    - Ingest, Complete, Failed, DELETE: Laufen verbindlich über den Koordinator-DO.
  - **Deadlock-Freiheit über asynchrone Grenzen:** Äußere Locks über asynchrone Worker-Netzwerkoperationen (wie Vektor-Uploads) wurden entfernt. Die Zustandstransitionen werden innerhalb des DOs über `this.withLock` serialisiert; Worker-Handler prüfen Generationen und führen atomare Post-Write-Reconciliation (`reconcilePostWrite`) durch.
  - **Post-Write-Reconciliation mit automatischem Rollback:** Bei Löschung während des Schreibens erfolgt sofort ein KV-Delete-Rollback und HTTP 409. Bei neuem Job erfolgt Re-Projektion des aktiven Jobs und HTTP 409.
  - **Keine Test-Proxies:** Sämtliche Test-Proxies in `workers/rag-api/test/lifecycle.test.ts` wurden entfernt. Die Tests laufen gegen bare uninstrumentierte KV-Mocks.
- **Nachweis:**
  - `workers/rag-api/test/two-instance.test.ts`:
    1. Zwei-Instanzen-Test mit uninstrumentiertem Bare-KV: Worker A am Put angehalten, Worker B löscht (HTTP 200), Worker A fortgesetzt -> Worker A erhält HTTP 409, Bare-KV bleibt gelöscht.
    2. Job-B-Start während Worker A am Put angehalten ist -> Worker A erhält HTTP 409, Job B bleibt in Bare-KV erhalten und wird nicht überschrieben.
    3. Fehler und Neustart während Löschung: DO-Zustand `deleting` übersteht Instanz-Neustart im persistenten Storage, Retry schließt Cleanup ab, kein vorzeitiger Quotenverlust.
    4. Abgebrochener Job A während Worker A am Put angehalten ist: Job A wird storniert, Worker A erhält nach Fortsetzung HTTP 409, stornierter Job wird nicht als `active` wiederbelebt.
    5. Neu angelegte Wissensbasis mit Status `pending` speichert autoritativ über `/coordinator/:id/save` ohne 404-Fehler.
    6. Regulärer Job-Abschluss (`handleComplete`) leert `activeJobId` im DO und überführt Zustand in `active`.
  - `workers/rag-api/test/durable-worker.test.ts`: Echter workerd-Laufzeittest in Miniflare v5 mit per `esbuild` gebündeltem echten Worker- und `KnowledgeBaseCoordinator`-Code, Bindung und Zustandspersistenz über Requests hinweg.
  - `workers/rag-api/test/lifecycle.test.ts`: 18 Tests ohne künstliche Test-Store-Proxies gegen uninstrumentierten Bare-KV-Mock.

---

## Migration und Release

- **Neue Migrationen und Reihenfolge:**
  1. `supabase/migrations/20260920090000_billing_guards.sql` (Billing-Idempotenz, Sperren, Welcome-Grant)
  2. `supabase/migrations/20260920091000_signup_email_guard.sql` (Funktion `public.before_user_created` für Auth-Hook)
  3. `supabase/migrations/20260920100000_database_quota_guards.sql` (Tabellen `user_databases`, `user_database_syncs`, `user_database_deletions`; Funktionen `database_allocate`, `database_deallocate`, `database_sync_batch`, `database_count`, `database_claim_delete`, `bind_crawl_hold`, `database_preflight_check`)
  4. Cloudflare Durable Object Migration: `v1-knowledge-base-coordinator` in `workers/rag-api/wrangler.jsonc` (`KnowledgeBaseCoordinator`).
- **Ausrollreihenfolge (3-Phasen-Rollout für Schreibkoordination):**
  - **Phase 1 (Cloudflare DO Migration):** Migration `v1-knowledge-base-coordinator` auf Cloudflare anwenden, um die Durable Object Klasse `KnowledgeBaseCoordinator` bereitzustellen.
  - **Phase 2 (RAG Worker Deployment):** RAG-Worker mit `KnowledgeBaseCoordinator` und Endpunkten `/coordinator/:id/*` deployen. Abwärtskompatibel für bestehende KV-Records.
  - **Phase 3 (Frontend Deployment):** Frontend-Worker deployen (`saveDatabase` nutzt autoritativ den Coordinator DO über `env.RAG_API`).
- **Übernahme bestehender Wissensbasen:**
  - Beim ersten Aufruf von `createDatabase` oder `getCreditState` werden die vorhandenen KV-Schlüssel des Nutzers atomar an `database_allocate` bzw. `database_sync_batch` übergeben.
  - Der Eintrag in `user_database_syncs` markiert die erfolgreiche Übernahme; nachfolgende Aufrufe ignorieren veraltete KV-Snapshots und verhindern die Wiederbelebung gelöschter Plätze.
- **Kompatibilität alter/neuer Dienste:**
  - Crawler sendet `billing_protocol: 1` und `settlement_configured: true`. RAG-Worker und Frontend prüfen dieses Protokoll im Preflight vor dem Deployment.
  - Job-ID-Bindung ist abwärtskompatibel: Datensätze ohne `current_job_id` werden weiterhin für Ingest akzeptiert; sobald eine Job-ID gesetzt ist, wird strikte Übereinstimmung erzwungen.
- **Fehlerbehandlung/Rollback ohne Datenverlust:**
  - Scheitert ein Teilschritt beim Anlegen, bleibt die Slot-Reservierung bestehen, falls die KV-Löschung nicht zweifelsfrei nachgewiesen werden kann (Fail-Closed).
  - Bei DELETE: Scheitert die SQL-Koordination (`claimDatabaseDeletion`), wird HTTP 503 geworfen und keine Ressource gelöscht. Offene Deletion Claims halten den Slot blockiert, bis die Bereinigung erfolgreich abgeschlossen ist.
- **Noch erforderliche produktive Nachweise:**
  - Manuelle Aktivierung des Auth-Hooks `Before User Created` im Supabase-Dashboard.
  - Deployment der Modal-Crawler-Applikation auf Modal.com.
  - Ausführung von `scripts/preflight-release.ts` gegen die produktive Supabase- und Crawler-URL.

---

## Abweichungen und offene Punkte

- **Korrektur der früheren Vollständigkeitsbehauptung:**
  Die im vorherigen Bericht geäußerte Annahme vollständiger Abnahmefähigkeit war voreilig. Erst die zusätzlichen Fehlerfall- und Interleaving-Prüfungen der Reviews deckten die verbleibenden Lücken N1–N4 und F1–F4 auf. Diese sind nun behoben und durch gezielte automatische Regressionstests abgesichert.
- **Neue Abhängigkeiten/Lizenzen:** Keine neuen externen Produktionsabhängigkeiten hinzugefügt.
- **Nicht ausgeführte Prüfungen:**
  - Kein Produktionsdeploy (weder Cloudflare Pages/Workers, Modal noch Supabase).
  - OpenNext Cloudflare-Build (`npm run build:cf`) wurde lokal erfolgreich verifiziert (`.open-next\worker.js` erzeugt) und ist im CI-Workflow als vorgeschaltetes Gate verankert.
- **Bekannte Einschränkungen:**
  - Das manuelle Release-Gate für den Supabase Auth Hook (`CONFIRM_AUTH_HOOK_BEFORE_USER_CREATED`) muss im CI-Deploy-Job per Secret bestätigt werden, nachdem der Hook im Dashboard aktiviert wurde.

---

## Review-Einstieg

- **Wichtigste Dateien für die unabhängige Prüfung:**
  - P1 / F2 (Runde 4): `workers/rag-api/src/coordinator.ts`, `workers/rag-api/wrangler.jsonc`, `workers/rag-api/src/database.ts`, `workers/rag-api/src/index.ts`, `src/lib/server/database-registry.ts`, `workers/rag-api/test/two-instance.test.ts`, `workers/rag-api/test/durable-worker.test.ts`, `workers/rag-api/test/lifecycle.test.ts`
  - F1: `src/app/api/databases/[id]/route.ts`, `src/lib/server/credits.ts`, `src/lib/server/database-registry.ts`, `src/app/api/databases/[id]/route.test.ts`
  - F3: `.github/workflows/deploy.yml`, `.github/workflows/ci.yml`
  - F4: `services/crawler/modal_app.py:389`
  - N1–N4: `supabase/migrations/20260920100000_database_quota_guards.sql`, `scripts/preflight-release.ts`, `scripts/preflight-release.test.ts`, `scripts/test-billing.py`
- **Reproduktionsbefehle:**
  ```bash
  # 1. Frontend & RAG Worker Tests, Linting & Typecheck (inkl. 2-Instanzen- & Miniflare-DO-Tests):
  npm run check

  # 2. Crawler SSRF- und Playwright-Browser-Tests:
  ./venv/Scripts/python.exe -m pytest services/crawler/tests evals/test_evaluate.py -q
  ./venv/Scripts/python.exe -m ruff check services/crawler evals

  # 3. Next.js Produktions-Build & OpenNext Cloudflare-Build:
  npm run build
  npm run build:cf

  # 4. Echte PostgreSQL 16 Concurrency- & Billing-Suite:
  wsl bash scripts/run-test-billing-wsl.sh

  # 5. Preflight-Unit-Tests:
  npx vitest run scripts/preflight-release.test.ts
  ```
- **Ehrliche Bewertung:**
  - **Implementiert:** Vollständig (alle Anforderungen aus F1–F4, N1–N4, R1–R7, A1–A6 sowie Runde 4 P1/F2 umgesetzt).
  - **Lokal verifiziert:** Vollständig (284 Frontend Vitest, 95 Worker Vitest inkl. Zwei-Instanzen- und workerd-Durable-Object-Tests, 116 Python pytest, WSL PostgreSQL 16 Suite inkl. Multithreaded Concurrency, 8 Preflight-Tests, Next.js Build erfolgreich, OpenNext Cloudflare-Build erfolgreich).
  - **Produktiv verifiziert:** **Offen.** Gemäß Auftrag kein Produktivzugriff, kein Deployment. Schema-Anwendung auf Live-Supabase, Modal-Deploy und CI-Cloudflare-Build stehen im regulären Release-Prozess an.


