# Übergabe an Antigravity: Audit vollständig bearbeiten

## Auftrag

Implementiere die Korrekturen aus `docs/audit-2026-09-20.md` im aktuellen CraCha-Arbeitsstand. Liefere getesteten Code, Migrationen, aktualisierte Betriebsdokumentation und einen überprüfbaren Abschlussbericht. Der Nutzer lässt die Umsetzung anschließend separat durch Codex prüfen.

Dieser Plan ist ein Arbeitsauftrag, keine bloße Empfehlungsliste. Arbeite die Pakete selbstständig ab. Bei einem blockierten Paket bearbeite die unabhängigen Pakete weiter und dokumentiere den konkreten fehlenden Nachweis. Berichte einen Punkt nur als erledigt, wenn seine Abnahmekriterien erfüllt sind.

**Umfang:** A1–A6 des Audits sowie Crawl-Löschung, Migrationsvoraussetzungen, Vitest-Update und Dokumentationskorrekturen. Alte Secret-Rotation und produktive Konfiguration müssen als Betriebsnachweise erfasst werden; fehlender Zugang darf nicht durch eine Erfolgsmeldung ersetzt werden.

**Lieferzustand:** lokal bzw. in isolierter Testumgebung geprüft und zur unabhängigen Review bereit. Keine Produktionsmigration, Veröffentlichung oder Secret-Rotation im Rahmen dieses Auftrags. Diese Schritte folgen erst nach der vereinbarten Review. Keine kostenpflichtigen Live-Modellaufrufe für Regressionstests.

## Verbindliche Arbeitsregeln

1. Lies `AGENTS.md`, den Auditbericht und relevante lokale Anweisungen. Prüfe den tatsächlichen Code; Zeilennummern im Audit können sich verschieben. Bei Next.js-Änderungen die passende Dokumentation in `node_modules/next/dist/docs/` lesen.
2. Der Arbeitsbaum enthält umfangreiche bestehende Änderungen und neue Dateien. Nicht zurücksetzen, bereinigen, überschreiben oder pauschal committen. Zu Beginn HEAD, `git status --short`, Diffstat und eine Liste deiner anschließend berührten Dateien erfassen. Prüfe den gesamten Arbeitsstand, nicht nur HEAD.
3. Vorhandene Graph-Werkzeuge zur Navigation verwenden, falls verfügbar. Fehlende Werkzeuge sind kein Blocker: gezielt im Quellcode suchen. Keine neue Graph-Infrastruktur aufbauen.
4. Kleinste wartbare Lösung wählen. Keine großen Refactorings, neue Review-Plattform oder pauschalen Dependency-Upgrades. Die beiden diskutierten Audit-Skills nicht installieren; dieser Auftrag benötigt sie nicht.
5. Unsichere Transport-/Browser-/Provider-API-Annahmen anhand der installierten Version und offizieller Quellen prüfen. Bei aufwendigem SSRF-Eigenbau zuerst vorhandene geeignete Komponenten untersuchen; Eignung und Lizenz dokumentieren.
6. Pro Paket: Fehler reproduzieren, gezielt korrigieren, Regression prüfen, Ergebnis notieren. Sicherheits- und Konkurrenztests müssen Verhalten belegen, nicht lediglich prüfen, ob eine Schutzfunktion aufgerufen wurde.
7. Keine echten Schlüssel in Tests, Ausgaben oder Report. Nur Dummy-Konten und Dummy-Daten verwenden. Eine fehlende Infrastrukturprüfung ausdrücklich als „nicht ausgeführt“ ausweisen.

## Reihenfolge und Fortschrittsführung

Arbeite in dieser Reihenfolge: **P0 → P1 → P2 → P3 → P4 → P5 → P6 → P7**. P1/P2 sind bewusst kleine, klar begrenzte Änderungen. P3/P4 enthalten die schwierigeren Sicherheits- und Konsistenzfragen; reduziere dort den Testumfang nicht aus Zeit- oder Kontextgründen.

Lege `docs/audit-umsetzung-report-2026-09-20.md` früh an und pflege eine kompakte Tabelle: Paket, Status, Dateien, Testnachweis, offene Punkte. Dies ist zugleich der Fortsetzungsstand bei einem Kontextwechsel. Wiederhole nicht nach jedem Paket alle Prüfungen; am Ende einmal den vollständigen Prüfblock ausführen.

## P0 · Ausgangsstand und Prüfmittel

- Versionen von Node, Python, Next, HTTPX/Crawl4AI, Vitest und relevanten Adaptern festhalten.
- Vorhandene Tests und Konfigurationen für Frontend, RAG, Crawler und Billing lesen.
- Isoliertes PostgreSQL für `scripts/test-billing.py` bereitstellen, bevorzugt über einen verfügbaren Container. Ausschließlich neue, wegwerfbare Testdatenbank verwenden. Das Skript darf niemals gegen Supabase/Produktivdaten laufen.
- Browser-Testmöglichkeit für den realen Crawl4AI/Playwright-Pfad klären. Falls lokal nicht verfügbar, einen ausführbaren isolierten CI-Test bereitstellen und dessen Lauf nachweisen, sofern CI zugänglich ist.
- Ausgangswerte aus dem Audit: 201 Frontend-, 70 RAG-, 105 Python-Tests erfolgreich; ESLint 21 Fehler/19 Warnungen. Das sind Vergleichswerte, keine Garantie für deinen aktuellen Stand.

**Abnahme:** Ausgangsrevision, vorhandene Änderungen, verfügbare Laufzeiten und Testinfrastruktur sind im Report festgehalten.

## P1 · Kontotrennung für BYOK und serverseitige Modellwahl (A2, A3)

**Einstieg:** `src/stores/chat-store.ts`, zugehörige Tests, `src/hooks/use-chat-store.ts`, Chat-UI, `src/app/api/chat/route.ts`, `src/lib/server/generation.ts`.

### Umsetzung

- BYOK-Key nur im Arbeitsspeicher halten. Er darf nicht mehr in `localStorage`, `sessionStorage` oder andere persistierte Stores geschrieben werden.
- Bei Logout und tatsächlichem Besitzerwechsel Key und kontobezogene BYOK-Modellwahl löschen. Wiederholtes `claimFor()` für denselben angemeldeten Besitzer darf laufende Nutzung nicht unnötig zurücksetzen.
- Bereits persistierte Schlüssel aktiv entfernen. Nur `partialize()` zu ändern reicht nicht: auch alte Store-Versionen und die bisherige `merge()`-/Hydration-Logik berücksichtigen. Alte Keys dürfen beim Start nicht kurzzeitig in Requests gelangen. Unkritische bestehende Chatverläufe des passenden Kontos möglichst erhalten.
- Die UI darf einen alten Key nicht durch lokalen Formularzustand, spätes Speichern oder späte Hydration wiederherstellen. Kontowechsel bei geöffnetem BYOK-Dialog und laufender Antwort berücksichtigen.
- Ohne gültig normalisierten, nicht leeren BYOK-Key wird ausschließlich das serverseitig konfigurierte Modell verwendet. Client-Modellangaben können in diesem Fall ignoriert werden; keinen neuen kostenpflichtigen Modellauswahlmechanismus bauen.
- Mit BYOK die bestehenden vorgesehenen Gemini-Modelloptionen erhalten. JSON und bestehende Header müssen dieselbe Validierung durchlaufen; Größenbegrenzungen nicht über Header umgehbar machen.
- Fallback bleibt serverseitig festgelegt. Ein fehlerhafter BYOK-Aufruf darf keinen beliebigen vom Client bestimmten Betreiber-Modellaufruf auslösen. Bestehendes Erstattungs-/Abbruchverhalten erhalten.

### Pflichtnachweise

1. A setzt Dummy-Key → Logout → B meldet sich an → Bs Request enthält keinen Key von A.
2. Direktwechsel A → B sowie Key-Dialog über Kontowechsel hinweg sind sicher.
3. Alte gespeicherte Store-Daten mit Dummy-Key werden bereinigt; Reload hydriert keinen Key.
4. Derselbe Besitzer kann während der Sitzung BYOK weiterverwenden; kein Key in persistierten Daten oder Logs.
5. Frei gewähltes `model` ohne Key, per Body und Header, erreicht nicht das Betreiber-Binding.
6. Gültiges BYOK erreicht den vorgesehenen BYOK-Pfad; Fallback ist festgelegt.

**Wichtig:** Den existierenden Test, der Key-Erhalt über verschiedene Besitzer verlangt, inhaltlich ersetzen. Nicht bloß löschen.

## P2 · Konsistentes Eingabelimit (A5)

**Entscheidung für diesen Auftrag:** zunächst einheitlich maximal **4.000 Zeichen nach Trim** für Frage bzw. Prüftext in beiden Chatmodi. Das entspricht dem bestehenden Retrieval-Limit und vermeidet neue Suchlogik. Lange Texte werden verständlich abgewiesen, niemals still abgeschnitten.

- UI, Chat-API und RAG-API auf denselben Vertrag bringen. Ein kleines gemeinsam nutzbares Limit bevorzugen, soweit es ohne neue Paketarchitektur in beide Builds passt. Andernfalls die Übereinstimmung durch einen Vertragstest sichern.
- UI zeigt Limit und verständliche Fehlermeldung. Serverseitige Prüfung bleibt maßgeblich.
- Abweisung muss vor Credit-Abbuchung, Retrieval und Generation stattfinden.
- Verlaufslimits getrennt behandeln; keine unbeabsichtigte Änderung von Quellenkontext oder Nachrichtenhistorie.

**Abnahme:** Tests für 4.000/4.001 Zeichen, Trim, leere Eingabe und beide Modi. Zu lange Eingaben erzeugen weder Abbuchung noch Modellaufruf. Falls der aktuelle Produktstand nachweislich längere Prüftexte zwingend benötigt, vor einer abweichenden Architekturentscheidung diesen Zielkonflikt im Report benennen; keine heimliche Limit-Erhöhung im RAG-Service.

## P3 · SSRF an der tatsächlichen Netzwerkverbindung verhindern (A1)

**Einstieg:** `services/crawler/cracha_crawler/security.py`, `crawl.py`, `modal_app.py`, Crawler-Security-Tests und verwendete Transportversionen.

### Geforderte Invariante

Jeder aus Nutzer-URLs oder Website-Inhalten abgeleitete Netzwerkzugriff darf ausschließlich eine geprüfte öffentliche Zieladresse erreichen. Die Prüfung gilt für die tatsächlich aufgebaute Verbindung, einschließlich Redirects, Browser-Unterressourcen und Wiederholungen. Eine Prüfung des Hostnamens vor einer zweiten unabhängigen Auflösung erfüllt dies nicht.

### Umsetzungsvorgehen

1. Alle tatsächlichen Zugriffswege erfassen: Sitemaps, robots.txt, HTTP-Fallback, dynamische Entdeckung, Browsernavigation, Frames/Unterressourcen sowie vom Browser oder Crawl4AI zusätzlich ausgelöste Abrufe.
2. Einen knappen Entwurf im Report festhalten: Wo wird DNS aufgelöst? Wo wird die IP geprüft? Wie wird exakt dieses Ziel verbunden? Welche Pfade können den Schutz umgehen?
3. Für HTTPX einen geeigneten Transport mit Bindung an geprüfte IPs oder einen kontrollierten Egress-Proxy verwenden. HTTPS-Zertifikatsprüfung, Host-Header und SNI des ursprünglichen Zielhosts korrekt erhalten. Keine globale DNS-Monkeypatch-Lösung im Produktionscode.
4. Für Browser einen echten Egress-Schutz vorsehen: geeigneter Proxy oder durchsetzbare Netzwerkregeln. `page.route()` plus Vorab-DNS-Prüfung allein genügt nicht. CONNECT, Redirects, Service Worker, WebSockets und mögliche Proxy-Bypässe prüfen. Nicht benötigte Netzwerkpfade dürfen explizit gesperrt werden.
5. Das Fehlen erforderlicher Schutzkonfiguration muss den unsicheren Crawlpfad zuverlässig sperren. Kein stiller Fallback auf ungeschützte Abrufe. Den Browserpfad dauerhaft abzuschalten ist keine vollständige Umsetzung des bestehenden Produkts; eine vorläufige Abschaltung muss als Einschränkung und offener Punkt ausgewiesen werden.
6. Zeitlimits, Größenlimits, Redirect-Limit, Robots-Verhalten und öffentliche HTTPS-Seiten weiterhin unterstützen. Keine TLS-Prüfung abschalten, um IP-Pinning zum Laufen zu bringen.

### Pflichtnachweise

- Die Audit-Reproduktion als Regression übernehmen: lokale Dummy-Antwort, erste DNS-Auflösung öffentlich, zweite privat. Mit echter Downloadfunktion und echtem lokalen Testserver nachweisen, dass der private Server keinen Request erhält.
- Private IPv4/IPv6, Loopback, Link-Local, gemischte DNS-Antworten und Redirect öffentlich → privat abweisen.
- Öffentlichen Kontrollfall sowie HTTPS-Host/SNI/Zertifikatsprüfung nachweisen. Tests dürfen keine echte beliebige Website oder Cloud-Metadatenadresse kontaktieren.
- Einen realen Browserpfad gegen kontrollierte Testseiten prüfen: Unterressource bzw. Frame zu privatem Ziel erreicht den Dummy nicht. Reines Mocking von `route.abort()` genügt nicht.
- Netzwerktest-Topologie erklären. Test-Ausnahmen/Allowlisten dürfen nicht in produktive Schutzlogik gelangen.

**Abnahme:** Beide aktiven Transportpfade sind geschützt und getestet. Wenn nur HTTPX belegt ist, Status „teilweise“, nicht „SSRF erledigt“.

## P4 · Atomare Wissensbasis-Quota und sicherer Crawl-Lebenszyklus (A4 und offenes Löschrisiko)

**Einstieg:** Datenbank-Routen, `database-registry.ts`, `crawler-api.ts`, `credits.ts`, Supabase-Migrationen/Tests, RAG-Ingest/Delete, Modal-Abbruch und Settlement.

### A. Quota verbindlich machen

- Die vorhandene PostgreSQL-Datenbank als maßgebliche Stelle für atomare Platzvergabe bevorzugen. Keine zusätzliche Koordinationsplattform einführen, wenn PostgreSQL die Aufgabe erfüllt.
- Eindeutige Zuordnung Benutzer/Wissensbasis und Transaktion/Sperre pro Benutzer: Prüfen und Platz reservieren dürfen nicht unabhängig erfolgen. Begrenzung gilt für alle Erstellungswege, insbesondere direkte POST-Route und Anlegen durch Crawl.
- Bestehende KV-Datensätze mit einer wiederholbaren, konservativen Übernahme berücksichtigen. Kein leeres SQL-Zählwerk aktivieren, das bestehende Wissensbasen ignoriert. Cutover/Reihenfolge und konkurrierende Neuanlagen erklären.
- Bereits überzählige Konten nicht automatisch löschen; Neuanlagen verweigern, bis wieder Platz besteht.
- Wiederholungen, KV-Schreibfehler und teilweise erfolgreiche Erstellung dürfen weder kostenlose zusätzliche Plätze noch unauflösbare Platzverluste erzeugen. Kompensation nur bei sicherem Ausgang; unsichere Teilergebnisse nachvollziehbar abgleichen.
- Nicht allein einen Prozess-Mutex oder KV-Read/Write verwenden: mehrere Worker müssen dieselbe Grenze einhalten.

### B. Löschen und veraltete Jobs koordinieren

- Das im Audit vermutete Problem zuerst mit deterministischer Reihenfolge prüfen: Upload gestartet → Löschen → verspäteter Upload/Complete/Settlement.
- Löschung darf eine noch laufende Arbeit nicht einfach durch Freigabe des Holds und des Quota-Platzes als abgeschlossen behandeln.
- Bevorzugte einfache sichere Produktregel: laufende oder noch nicht abgerechnete Crawls lassen sich nicht löschen; API liefert einen verständlichen Konflikt und verweist auf Abbruch/Abschluss. Dabei reicht die Prüfung eines möglicherweise veralteten KV-Status nicht.
- Auch nach Abbruch dürfen alte Jobs keine gelöschte Wissensbasis wiederherstellen, einen neuen Crawl überschreiben oder dessen Freigabe verändern. Falls notwendig, aktuelle Job-/Generationsreferenz und Löschzustand an einer konsistenten Entscheidungsstelle prüfen. Das bloße Mitsenden einer Referenz oder eine einmalige KV-Prüfung vor langen Writes löst ein Rennen nicht.
- Credit-Settlement bleibt idempotent. Bereits bezahlte Arbeit wird durch Löschen nicht erstattet. Bei Abbruch die vorhandene Produktregel bewahren, aber Freigabe und Ende der Schreibberechtigung sauber koordinieren.
- API-Fehler nicht verschlucken und anschließend vollständigen Lösch-/Abrechnungserfolg melden.

### Pflichtnachweise

1. **Echte PostgreSQL-Konkurrenz:** bei 24/25 zwei gleichzeitige Reservierungen → exakt eine erfolgreich; bei 0 mindestens 30 parallele Anfragen → höchstens 25 Plätze.
2. Wiederholung derselben Reservierung, fremder Benutzer, Fehler nach Reservierung und sichere Freigabe testen.
3. Direkter Erstellungsweg und Crawl-Erstellungsweg können zusammen die Grenze nicht überschreiten.
4. Bestehende Datensätze werden vor Aktivierung gezählt; wiederholte Migration/Übernahme erzeugt keine Duplikate.
5. Verzögerter Upload/Complete nach Löschung oder neuer Crawl-Generation verändert keine aktuelle Wissensbasis.
6. Abbruch, Löschung, Status-Polling und Settlement-Callback unter Konkurrenz erzeugen weder doppelte Rückzahlung noch verloren gegangene Abbuchung.
7. Bestehende Billing-Transaktions- und Paralleltests bestehen gegen eine wegwerfbare SQL-Datenbank.

**Abnahme:** SQL- und Dienstgrenzen sind anhand echter Transaktionen und deterministisch gesteuerter Integrationstests belegt. Gemockte `getCreditState()`-Antworten allein reichen für den Fixnachweis nicht.

## P5 · Lint und Dependency-Prüfungen verbindlich machen (A6, Vitest)

- Vorhandene ESLint-Fehler prüfen und zielgerichtet beheben. Keine wirkungslosen `setTimeout`-/Microtask-Umwege nur zur Beruhigung des Linters.
- Für kontobezogenen UI-Zustand insbesondere vermeiden, dass entfernte Effects die Trennung zwischen Nutzern verschlechtern.
- Eng begrenzte, fachlich begründete Ausnahmen sind möglich; jede neue Deaktivierung im Report auflisten. Keine globalen Abschaltungen der Hooks-/Ref-/Purity-Regeln.
- `npm run lint` ergänzen, in `npm run check` und CI aufnehmen. Ziel: null Fehler, keine neuen Warnungen; verbleibende vorhandene Warnungen kurz einordnen. Nicht ohne Bereinigung `--max-warnings=0` aktivieren.
- Vitest in beiden npm-Projekten auf eine aktuell behobene, kompatible stabile Version bringen. Advisory und aktuelle Versionsanforderungen vor Auswahl verifizieren. Lockfiles aktualisieren; kein blindes `npm audit fix --force`.
- CI muss weiterhin beide Projekte und Crawler/Evals prüfen. Neue Tests dürfen nicht versehentlich durch Include-/Exclude-Muster entfallen.

**Abnahme:** Lint und beide Vitest-Projekte erfolgreich; die konkrete Vitest-Advisory in beiden Lockfiles beseitigt; keine Testlöschung oder pauschale Skip-Markierung als Reparatur.

## P6 · Migration, Betriebsnachweise und Dokumentation

- Neue produktive Schemaänderungen als zusätzliche Migrationen anlegen; bereits möglicherweise angewendete Migrationen nicht still umschreiben. Vorhandene neue Migrationen vollständig in die Testreihenfolge einbeziehen.
- Release-Reihenfolge dokumentieren: kompatible Schema-Erweiterung → Bestandsübernahme/Preflight → Dienste in erforderlicher Reihenfolge → Smoke-Test. Bei Protokollwechseln zwischen Crawler und RAG eine sichere Übergangsstrategie angeben.
- Einen reproduzierbaren Preflight bereitstellen, der erforderliche Migrationen/RPCs, Quota-Übernahme und Crawl-/Settlement-Protokoll prüft. Fehlende Voraussetzung muss den Release blockieren. Statische Suche nach Funktionsnamen im Repository ist kein Laufzeitnachweis.
- Supabase-E-Mail-Hook: zwischen vorhandener SQL-Funktion und tatsächlich aktivierter Hook-Konfiguration unterscheiden. Aktivierung im Runbook beschreiben. Falls technisch nicht automatisiert prüfbar, explizites manuelles Release-Gate mit konkretem Nachweis vorsehen.
- Secret-Rotation: Tabelle der betroffenen Anbieter, erforderlicher Nachweis, Status „verifiziert/unbekannt“. Keine Schlüsselwerte sammeln, alte Keys ausprobieren oder pauschal „rotiert“ behaupten.
- `docs/architecture.md`, `docs/deployment.md`, gegebenenfalls `SECURITY.md` und überholte Kommentare aktualisieren: tatsächliche Service-Token-Vertrauensgrenze, aktuelle Abrechnung/Idempotenz, neue Quota und Egress-Schutz.
- Keinen automatischen Produktions-Deploy als Test auslösen. Ein bereitgestellter Preflight ohne Lauf gegen die Zielumgebung muss als noch nicht produktiv verifiziert ausgewiesen werden.

**Abnahme:** Der nächste Betreiber kann anhand des Runbooks eindeutig feststellen, ob ein Release sicher vorbereitet ist. Unzugängliche produktive Fakten bleiben sichtbar offen.

## P7 · Abschließende Verifikation und Übergabe

Nach der letzten Codeänderung folgende Prüfungen ausführen. Bereits erfolgreiche Prüfungen erst nach relevanten weiteren Änderungen wiederholen.

| Prüfung | Erwartung |
|---|---|
| `npm run check` | Lint, Frontend-Typecheck/Tests, RAG-Typecheck/Tests erfolgreich |
| `python -m ruff check services/crawler evals` | Erfolgreich |
| `python -m pytest services/crawler/tests evals/test_evaluate.py` | Erfolgreich; neue Sicherheits-/Lifecycle-Tests enthalten |
| `python scripts/test-billing.py` | Mit ausschließlich wegwerfbarer PostgreSQL-Datenbank erfolgreich |
| Zusätzliche Quota-/Migrations-/Konkurrenztests | Gegen echte SQL-Engine erfolgreich |
| `npm run build` | Erfolgreich |
| `npm run build:cf` | Erfolgreich in unterstützter isolierter Umgebung; kein Deploy |
| `npm audit` und `npm audit --prefix workers/rag-api` | Vollständige Befunde dokumentieren; konkrete Vitest-Lücke behoben |
| HTTPX- und Browser-Netzwerkregressionen | Tatsächliche Verbindungssperre belegt |
| UI-Smoke-Test | Logout/Kontowechsel, BYOK-Dialog, lange Eingabe, Crawl-Abbruch/Löschen geprüft |
| `git diff --check` | Keine durch die Umsetzung eingeführten Whitespace-Fehler |

Bei fehlender lokaler Cloudflare-/Browser-/SQL-Unterstützung geeignete isolierte CI-Umgebung verwenden, sofern verfügbar. Fehlende Prüfmöglichkeit nicht durch eine schwächere Prüfung mit gleichem Namen ersetzen. Einen vollständigen Build oder Testlauf nicht allein aus einem begonnenen Prozess ableiten: Exit-Code und Abschlussausgabe erfassen.

## Verbindliche Abschlussberichtsvorlage

Speichere den Bericht unter `docs/audit-umsetzung-report-2026-09-20.md`. Halte ihn überprüfbar und vermeide ungekürzte Tool-Logs.

```markdown
# Audit-Umsetzung · Abschlussbericht

## Stand
- Ausgangs-HEAD / geprüfter Endstand:
- Arbeitsbaum vor Beginn bereits geändert: ja/nein; Kurzbeschreibung
- Eigene geänderte/neue Dateien:
- Laufzeitversionen und Prüfdatum:
- Produktionsänderungen: keine / genaue Abweichung

## Ergebnis je Paket
| Paket/Befund | Status: erledigt/teilweise/blockiert | Umsetzung + Datei:Zeile | konkreter Nachweis | Restpunkt |
|---|---|---|---|---|
| P1 / A2 | | | | |
| P1 / A3 | | | | |
| P2 / A5 | | | | |
| P3 / A1 HTTPX | | | | |
| P3 / A1 Browser | | | | |
| P4 / A4 | | | | |
| P4 / Crawl-Lifecycle | | | | |
| P5 / A6 | | | | |
| P5 / Vitest | | | | |
| P6 / Migration/Preflight | | | | |
| P6 / Betriebsnachweise/Doku | | | | |

## Entscheidende Regressionen
Für jeden Sicherheits-/Konkurrenzfehler:
- Testdatei und Testname
- Ausgangsverhalten: beobachtet oder nur aus Quellcode abgeleitet?
- Verhalten nach Änderung
- Welche echten Komponenten liefen, welche waren gemockt?
- Bei Race-Tests: wie wurde die problematische Reihenfolge erzwungen?

## Tatsächlich ausgeführte Prüfungen
| Befehl | Umgebung | Exit-Code | Tests/Ergebnis | Warnungen |
|---|---|---|---|---|

## Migration und Release
- Neue Migrationen und Reihenfolge:
- Übernahme bestehender Wissensbasen:
- Kompatibilität alter/neuer Dienste:
- Fehlerbehandlung/Rollback ohne Datenverlust:
- Noch erforderliche produktive Nachweise:

## Abweichungen und offene Punkte
- Abweichung vom Plan + Begründung:
- Neue Abhängigkeiten/Lizenzen bzw. neue Lint-Ausnahmen:
- Nicht ausgeführte Prüfungen + konkreter Grund:
- Bekannte Einschränkungen:

## Review-Einstieg
- Wichtigste Dateien/Funktionen für die unabhängige Prüfung:
- Reproduktionsbefehle:
- Ehrliche Bewertung: implementiert / lokal verifiziert / produktiv verifiziert
```

**Fertig bedeutet:** Alle implementierbaren Pakete bearbeitet, jede verbleibende Einschränkung explizit, tatsächliche Nachweise verlinkt und keine Anwendungssicherheit aus bloß grünen Mock-Tests abgeleitet. Produktive Nachweise können offen bleiben, verhindern aber die Behauptung „produktionsbereit“. Der Nutzer übergibt diesen Bericht anschließend zusammen mit dem geänderten Arbeitsstand zur unabhängigen Prüfung.
