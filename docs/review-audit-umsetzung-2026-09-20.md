# Unabhängige Review der Audit-Umsetzung · 20. September 2026

## Ergebnis

**Nicht abgenommen.** Die Aussage „alle Punkte A1–A6 und P0–P7 vollständig umgesetzt“ ist durch Code und Nachweise nicht gedeckt. P1/P2/P5 zeigen sinnvolle Verbesserungen. Bei P3, P4 und P6 bestehen wesentliche Fehler und nicht erfüllte Abnahmekriterien.

Geprüft: aktueller Arbeitsbaum, der übergebene Bericht, betroffene Anwendungspfade, Migrationen, Testcode und installierter Crawl4AI-Code. Keine Anwendungskorrekturen, kein Deployment, keine produktiven Zugriffe. HEAD allein beschreibt wegen der bestehenden uncommitteten Änderungen nicht die geprüfte Umsetzung.

## R1 · Hoch · Robots-Abruf umgeht weiterhin den SSRF-Schutz

**Anwendungsstelle:** `services/crawler/cracha_crawler/crawl.py:642` aktiviert `check_robots_txt`.

**Tatsächlicher Aufrufpfad in der installierten Abhängigkeit:** `venv/Lib/site-packages/crawl4ai/async_webcrawler.py:384–386` → `RobotsParser.can_fetch()` → `venv/Lib/site-packages/crawl4ai/utils.py:343–344`.

Der Parser verwendet eine eigene `aiohttp.ClientSession()` und `session.get(..., ssl=False)`. Dieser Abruf läuft weder durch `SafeAsyncHTTPTransport` noch durch den Chromium-Proxy. Er findet vor dem Browserabruf statt. Auch die Redirects dieses Abrufs sind durch den neuen Schutz nicht abgesichert.

**Lokal reproduziert:** Nach erfolgreichem `assert_public_url()` mit öffentlicher DNS-Antwort antwortet der Resolver für denselben Testhost mit Loopback. Der echte `RobotsParser` erreicht einen ausschließlich lokalen Dummy-Server; beobachtet wurde `GET /robots.txt HTTP/1.1`. Ein `SafeEgressProxy` war parallel aktiv und verhinderte den separaten Abruf nicht. DNS war kontrolliert, HTTP-Client und Server waren echt; keine externe Zieladresse wurde kontaktiert. Die abschließende Wiederholung endete mit Exit-Code 0. Dies ist ein Komponentennachweis des real im Crawl aktivierten Pfades, kein vollständiger Chromium-End-to-End-Test.

**Erforderliche Nacharbeit:** Robots-Prüfung über den sicheren Transport ausführen und den ungeschützten Bibliothekspfad zuverlässig ersetzen/deaktivieren, ohne Robots-Regeln zu ignorieren. Alle weiteren von Crawl4AI selbst eröffneten Clients prüfen. Regression muss den lokalen Serverkontakt verhindern, einschließlich Redirect-Fall.

**Zusätzliche Nachweislücke:** Die beiden neuen Proxytests schreiben HTTP/CONNECT direkt auf einen Socket. Sie starten keinen Browser und belegen deshalb weder Chromium-Unterressourcen noch WebSockets/Service Worker/Proxy-Bypässe. Der im Plan verlangte Browsernachweis fehlt. HTTPX-Pinning ist eine Verbesserung, aber A1 insgesamt nicht geschlossen. Private Bibliotheksattribute (`_pool._network_backend`, `_backends.auto`) und korrektes TLS/SNI benötigen außerdem gezielte Kompatibilitäts-/Positivtests.

## R2 · Hoch · Quota wird bei jedem RPC-Fehler wieder unsicher

**Stelle:** `src/lib/server/credits.ts:291–313`, `allocateDatabaseSlot()`.

Jeder SQL-/Transportfehler führt zum KV-Fallback. Dieser zählt und erlaubt eine Neuanlage ohne atomare Reservierung. Damit tritt das ursprüngliche Rennen bei Störungen oder fehlender Migration wieder auf. Der Fallback gilt nicht nur für einen kontrollierten Migrationszustand. Ein bestehender Test verlangt diesen unsicheren Erfolg ausdrücklich.

**Nachweis:** Quellpfad sowie ausgeführter Test `falls back to KV count when RPC throws an error (transition fallback)` in `database-allocation.test.ts`.

**Erforderliche Nacharbeit:** Fehlende oder unbestätigte atomare Reservierung muss Neuanlagen mit einem verständlichen temporären Fehler sperren. Fallback entfernen; Übergang durch Migration/Preflight lösen. Fehler-/Paralleltest muss beweisen, dass kein Datensatz ohne bestätigte Reservierung angelegt wird.

## R3 · Hoch · Direkte API-Neuanlage ignoriert nicht übernommene Bestandsdaten

**Stellen:** `src/app/api/databases/route.ts:51–54`, `src/lib/server/database-registry.ts:207`, `src/lib/server/credits.ts:47–53`.

Die neue POST-Route ruft direkt `createDatabase()` und damit `database_allocate()` auf. Die bisherige Vorab-Abfrage wurde entfernt. Die Übernahme vorhandener KV-Datensätze geschieht ausschließlich bei `getCreditState()`. Ein direkter API-Aufruf muss diese Funktion jedoch nicht vorher aufrufen.

**Konkrete Folge:** Ein Bestandskonto mit 25 KV-Wissensbasen und noch leerem `user_databases` erhält für eine weitere Anlage eine erfolgreiche SQL-Reservierung. Das Konto hat anschließend 26 Wissensbasen, obwohl die SQL-RPC vollständig funktioniert. Eine spätere Guthabenabfrage repariert den bereits überschrittenen Bestand nicht. Dieser Kontrollfluss ist statisch nachgewiesen; keine echte SQL-Ausführung in dieser Review.

Auch das laufende erneute Importieren alter KV-Snapshots ist kein sauberer Cutover: Ein vor der Löschung gelesener Snapshot kann einen inzwischen freigegebenen SQL-Platz wieder eintragen.

**Erforderliche Nacharbeit:** Übernahmezustand verbindlich festhalten und vor jeder erstmaligen Platzvergabe absichern oder den gesamten Bestand vor Aktivierung übernehmen. Wiederholte Synchronisierung darf gelöschte Plätze nicht wiederbeleben. Tests: direkter POST ohne vorherigen Dashboard-/Credits-Aufruf sowie veralteter Snapshot parallel zu DELETE.

## R4 · Hoch · Crawl-Start und Löschen bleiben ein Check-then-act-Rennen

**Stellen:** `src/app/api/databases/[id]/route.ts:46–73`, `src/lib/server/crawler-api.ts:108–166`, `src/lib/server/credits.ts:272–288`.

DELETE prüft Status/Holds und löscht später unabhängig davon. Ein Crawl kann zwischen Prüfung und Löschung beginnen. Es gibt keinen gemeinsamen atomaren Zustandsübergang für „Crawl starten“ und „Löschung beanspruchen“.

**Zulässige problematische Reihenfolge:**

1. DELETE liest die aktive Wissensbasis und sieht keinen offenen Hold.
2. Ein paralleler Recrawl reserviert/bindet den Hold und startet die Arbeit.
3. DELETE löscht den Index; `deleteCrawlAccess()` findet den inzwischen angelegten Hold und gibt ihn frei, ohne den neuen Job zu stoppen.

Die zusätzliche SQL-Abfrage verbessert den normalen Fall, verhindert dieses Rennen aber nicht. RAG-Ingest besitzt weiterhin keinen aktuellen Job-/Generationsnachweis. Die neuen Tests prüfen nur einen bereits vorhandenen Hold bzw. Status, keine konkurrierenden Übergänge. Verspätete Uploads nach Abbruch wurden nicht abgesichert.

**Erforderliche Nacharbeit:** Crawl-Start und Löschfreigabe gemeinsam serialisieren; veraltete Schreibvorgänge zuverlässig ausschließen. Deterministischer Test der obigen Reihenfolge und verzögerter Upload/Complete nach Abbruch bzw. Generationenwechsel. Fehler bei Cleanup/Quota-Freigabe nicht verschlucken und anschließend uneingeschränkten Erfolg melden.

## R5 · Mittel · Die neue SQL-Teststrecke ist in der vorliegenden Form fehlerhaft

**Stellen:** `scripts/test-billing.py:46–75`; `supabase/migrations/20260920100000_database_quota_guards.sql:18`, `:41–46`.

- `database_allocate()` liefert `RETURNS TABLE (allowed boolean, current_count integer)`. Das Skript behandelt die Ausgabe als JSON: `database_allocate(...)->>'allowed'`. Der JSON-Operator passt nicht zum Record-Rückgabetyp. Die Tabelle muss etwa mit `select allowed from public.database_allocate(...)` gelesen werden; dabei auch das psql-Booleanformat berücksichtigen.
- Der zweite Benutzer verwendet erneut `db-0` bis `db-23`, obwohl `database_id` global eindeutig ist. SQL ignoriert den Konflikt (`ON CONFLICT DO NOTHING`) und meldet trotzdem `allowed=true, v_count+1`. Eine fremde Zuordnung darf keinen falschen Reservierungserfolg liefern. Die Fixtures brauchen zusätzlich eindeutige IDs.
- Der Test „ohne credit_accounts“ legt einen `auth.users`-Datensatz an. Die geladenen Migrationen erzeugen per Signup-Trigger automatisch das Credit-Konto. Die behauptete Vorbedingung muss ausdrücklich hergestellt und geprüft werden.

**Einordnung:** Die SQL-Strecke wurde in dieser Review nicht gegen PostgreSQL ausgeführt. Die genannten Typ-/Fixture-/Kontrollflussfehler sind aus dem Code ableitbar. Die bloße Einbindung in CI ist kein erfolgreicher CI-Nachweis.

**Erforderliche Nacharbeit:** Skript und Kollisionsverhalten korrigieren, echte PostgreSQL-Ausführung liefern, zusätzlich 30 parallele Reservierungen ab Bestand 0 und Migration bestehender Benutzer testen. Die gemockte Route-Prüfung simuliert die richtige Reservierungsentscheidung bereits selbst und kann die Datenbankgarantie nicht beweisen.

## R6 · Mittel · Quota-Kompensation behandelt Teilerfolg als vollständigen Fehlschlag

**Stellen:** `src/lib/server/database-registry.ts:124–128`, `:231–236`.

`claimDatabase()` schreibt Record und Membership parallel. Scheitert ein Write, kann der andere bereits erfolgreich sein oder noch abschließen. Der Catch gibt trotzdem den SQL-Platz frei. Dadurch kann eine angelegte Wissensbasis ohne Reservierung verbleiben. Bei verloren gegangener Bestätigung ist dieselbe Annahme problematisch.

**Erforderliche Nacharbeit:** Mehrdeutige KV-Ergebnisse zunächst als reservierten, abzugleichenden Zustand behalten oder einen nachweislich sicheren Cleanup ausführen. Einen partiell erfolgreichen Write und einen verspätet erfolgreichen Write gezielt testen. Unbedingte Deallokation ist keine sichere Kompensation.

## R7 · Mittel · Preflight und Runbook sind kein verlässliches Release-Gate

**Stellen:** `scripts/preflight-release.ts:73`, `:108–123`, `:174–179`; `docs/deployment.md:8–45`; `.github/workflows/deploy.yml`.

- `credit_settle` wird mit `p_spent` aufgerufen; die Migration definiert `p_actual`. Der Preflight kann damit auch bei korrektem Schema `PGRST202` melden und ein korrekt vorbereitetes Release blockieren.
- Umgekehrt bewertet die RPC-Prüfung jeden anderen zurückgegebenen Fehler als Erfolg, statt nur explizit erwartete Validierungsfehler zuzulassen. Sie weist weder die erforderliche Funktionalität noch die Bestandsübernahme nach.
- Der Hook heißt in der Migration `public.before_user_created`, nicht `signup_email_guard`; erforderlich ist **Before User Created**, nicht **Send Email**. Runbook, Preflight und Abschlussbericht nennen die falsche Konfiguration. [Offizielle Hook-Dokumentation](https://supabase.com/docs/guides/auth/auth-hooks/before-user-created-hook).
- Ein Hinweis wird mit `passed: true` als manuelles Gate gewertet, ohne dass ein Nachweis vorliegt.
- Das dokumentierte `supabase db push --file ...` entspricht nicht den dokumentierten Flags dieses Befehls. Die CLI spielt ausstehende Migrationen anhand der Migrationshistorie ein; Reihenfolge und Dry-Run korrekt beschreiben. [Offizielle CLI-Referenz](https://supabase.com/docs/reference/cli/supabase-db-push).
- Der automatische Deploy auf `main` ruft diesen Preflight nicht auf. Crawler-Protokoll, Settlement-Konfiguration und Quota-Cutover werden vom Skript ebenfalls nicht geprüft.

**Erforderliche Nacharbeit:** Preflight mit fehlerfreien und fehlerhaften Dummy-Antworten testen, richtigen RPC-Vertrag verwenden, Schema-/Protokoll-/Übernahmeprüfung vervollständigen und vor dem automatischen Deploy verbindlich ausführen. Manuelle Nachweise offen kennzeichnen und bei Fehlen den Release blockieren. Bestehende Produktionskonfiguration wurde nicht untersucht.

## Was ich bestätigen kann

| Bereich | Ergebnis dieser Review |
|---|---|
| BYOK-Kontowechsel und Persistenz | Relevante Store-/Hydration-/UI-Änderungen vorhanden; Regressionstests erfolgreich. Kein neuer konkreter Fehler in diesem geprüften Pfad festgestellt. |
| Servermodell ohne BYOK | Body/Header werden normalisiert; ohne Key wird das konfigurierte Modell gewählt. Tests erfolgreich. |
| 4.000-Zeichen-Limit | API weist zu lange Eingaben vor Abbuchung ab; Tests erfolgreich. |
| Lint-Integration | Bestandteil von `check`; 0 Fehler, 15 Warnungen. |
| Vitest | Beide npm-Audits aktuell ohne Treffer. |
| HTTPX-Schutz | IP-Pinning und Rebinding-Regression vorhanden; die Verbesserung schließt den ungeschützten Robots-Pfad nicht. |

## Selbst ausgeführte Prüfungen

- `npm run check`: Exit 0; **234 Frontend-Tests + 70 RAG-Tests**, beide Typechecks; ESLint 0 Fehler/15 Warnungen.
- `./venv/Scripts/python.exe -m pytest services/crawler/tests evals/test_evaluate.py -q`: Exit 0; **110 Tests**, zwei Modal/Python-Deprecation-Warnungen.
- `./venv/Scripts/python.exe -m ruff check services/crawler evals`: erfolgreich.
- `git diff --check`: erfolgreich; Git gibt zusätzlich CRLF-Konvertierungshinweise aus.
- `npm audit` und `npm audit --prefix workers/rag-api`: jeweils 0 Schwachstellen.
- Zusätzliche lokale Robots-Rebinding-Reproduktion: privater HTTP-Kontakt bestätigt; abschließender Lauf Exit 0.

Nicht erneut ausgeführt: Next-Produktionsbuild. Nicht verifiziert: PostgreSQL-/CI-Lauf, OpenNext-Build, produktive Voraussetzungen, vollständiger Browser-Netzwerktest und UI-End-to-End. Der übergebene Bericht enthält für OpenNext und den geforderten Browsernachweis ebenfalls keinen ausreichenden Laufnachweis.

## Verbindlicher Nacharbeitsauftrag für Antigravity

1. R1 zuerst schließen und den realen Browser-/Robots-Pfad testen. P3 bis dahin als **teilweise** führen.
2. R2/R3/R6 gemeinsam in der maßgeblichen Quota-Logik beheben; keine unsicheren Übergangsfallbacks. Migration vor direkter API-Neuanlage sicherstellen.
3. R4 durch koordinierte Zustandsübergänge und Tests erzwungener Rennen beheben. P4 nicht allein wegen eines 409-Tests als erledigt markieren.
4. R5 reparieren und tatsächliche erfolgreiche PostgreSQL-Testausgabe bzw. verifizierbaren CI-Lauf liefern.
5. R7 korrigieren und das Release-Gate durch Tests und Workflow-Einbindung belegen.
6. Die bereits gelungenen Änderungen beibehalten. Abschließend vollständige Prüfungen einschließlich OpenNext in geeigneter Umgebung durchführen; fehlende Nachweise ausdrücklich offen lassen.
7. Den ursprünglichen Abschlussbericht korrigieren: „verfügbarer Test“, „tatsächlich ausgeführter Test“, „implementiert“ und „abgenommen“ sauber unterscheiden. Vitest 3 → 4 ist ein Major-Upgrade, kein bloßer Patch. Keine pauschale Fertigmeldung bei offenen Gates.

Die ursprünglichen Abnahmekriterien in `docs/umsetzungsplan-audit-2026-09-20.md` bleiben gültig. Keine Produktionsänderungen vor der erneuten unabhängigen Review.
