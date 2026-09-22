# Prüfung der Audit-Nacharbeit – 21.09.2026

## Entscheidung

**Noch nicht abnahmefähig.** Die Aussage „R1–R7 vollständig umgesetzt und verifiziert“ ist zu weitgehend. Vier konkrete Fehler bleiben. Die regulären Tests bestehen; zusätzliche Fehlerfallprüfungen reproduzieren Lücken, die diese Tests nicht abdecken.

Prüfgrundlage: aktueller uncommitteter Arbeitsstand auf HEAD `4998a5b03f841be60f41688c2f2ed200e0aeddb3`, eingereichter Bericht und Quellcode. Keine Produktivänderung, kein Deployment. Dieses Dokument ist zugleich der Folgeauftrag für Antigravity.

## Bestätigte Verbesserungen

- Quotenreservierung bricht bei RPC-Fehlern ab; der bisherige unsichere Fallback wurde entfernt.
- Direkte Neuanlage übergibt vorhandene KV-IDs zur initialen SQL-Übernahme. Sync-Marker und Löschmarker verhindern die erneute Übernahme derselben alten Momentaufnahme.
- Crawl-Bindung und Löschreservierung benutzen eine gemeinsame PostgreSQL-Sperre pro Nutzer. Das verbessert die Koordination des Starts.
- Robots-Abrufe verwenden den gepinnten HTTP-Transport. Chromium erhält den Proxy einschließlich ausgeschalteter Loopback-Ausnahme. Die einschlägigen Tests bestehen in der Projektumgebung.
- Die SQL-Suite läuft tatsächlich gegen PostgreSQL; Preflight-Parameter und Fehlerbehandlung sind verbessert und der Preflight ist im Deploy-Workflow eingebunden.

## N1 – P1: Preflight scheitert auf einer korrekt migrierten Datenbank

**Ort:** `scripts/preflight-release.ts:103` und `:111`; SQL-Funktionen `database_allocate` und `database_sync_batch`.

Beide Prüfaufrufe verwenden die Null-UUID ohne zugehörigen Eintrag in `auth.users`. Beide Funktionen schreiben beim ersten Aufruf in `user_database_syncs`. Der Fremdschlüssel lehnt dies ab. Der Preflight wertet den Fehler korrekt als Fehler, blockiert dadurch aber ein ansonsten korrekt vorbereitetes Release.

**Reproduziert:** Frische PostgreSQL-16-Testinstanz, vollständige Migrationen und erfolgreiche Billing-Suite. Anschließend:

```sql
select allowed from database_allocate(
  '00000000-0000-0000-0000-000000000000', 'preflight-dummy-slot', 25);
select database_sync_batch(
  '00000000-0000-0000-0000-000000000000', array[]::text[]);
```

Beide Aufrufe scheitern mit `user_database_syncs_user_id_fkey` / SQLSTATE `23503`.

**Auftrag:** Gestalte die Prüfung bewusst ohne dauerhafte Testmutation in Produktion. Beispielsweise eine eng berechtigte, lesende Diagnose-RPC für benötigte Signaturen und Berechtigungen; Funktionsverhalten separat mit gültigen Fixtures in der isolierten SQL-Suite prüfen. Nicht pauschal beliebige Fremdschlüsselfehler als Erfolg behandeln und keinen Dummy-Produktivnutzer anlegen.

**Abnahme:** Vollständig migrierte Datenbank besteht die Prüfung; fehlende Funktion, falsche Signatur und fehlendes Ausführungsrecht schlagen fehl. Vorher/nachher keine zusätzlichen Nutzer, Slots oder Sync-Marker. Test muss reale SQL-Struktur einbeziehen, nicht nur `supabase.rpc` überall erfolgreich mocken.

## N2 – P1: Löschreservierung verhindert Wiederholung nach Teilfehler

**Ort:** `supabase/migrations/20260920100000_database_quota_guards.sql:178`, insbesondere `:216`; `src/app/api/databases/[id]/route.ts:58`.

`database_claim_delete` entfernt den Quotenplatz bereits vor KV-Schreibvorgang und Remote-Löschung. Schlägt danach das Markieren als `deleting`, der Worker-Aufruf oder dessen Bereinigung fehl, bleiben Ressourcen zurück. Beim nächsten DELETE fehlt der Platz: Der Claim liefert `not_found`, die Route antwortet 404 und erreicht die Bereinigung nicht mehr. Der Löschmarker wird nicht als wiederaufnehmbarer eigener Vorgang erkannt. Gleichzeitig ist der Quotenplatz schon frei.

**Reproduziert:** Nach erfolgreichem Claim liefert derselbe Aufruf für denselben Eigentümer in PostgreSQL `allowed=f, reason=not_found`. Die im Code nachfolgenden externen Schritte können fehlschlagen; der Retry ist damit bereits auf SQL-Ebene blockiert.

**Auftrag:** Trenne Reservierung und Abschluss. Eigene bestehende Löschreservierung muss idempotent fortsetzbar sein, fremde Eigentümer bleiben ausgeschlossen. Quotenplatz erst nach erfolgreichem Abschluss freigeben. Fehler müssen einen wiederholbaren Zustand hinterlassen. Prüfe auch direkte Löschung einer alten KV-Wissensbasis vor ihrer ersten SQL-Synchronisation.

**Abnahme:** Fehler jeweils beim KV-Markieren, Remote-DELETE und abschließenden Cleanup injizieren; erneutes DELETE beendet den Vorgang. Keine verwaisten Ressourcen, keine vorzeitige Quotenfreigabe. Ein fremder Nutzer darf fremde Löschvorgänge weder fortsetzen noch bestätigen.

## N3 – P1: Verspäteter KV-Schreibvorgang überlebt den Rollback

**Ort:** `src/lib/server/database-registry.ts:124` und `:233`.

`claimDatabase` benutzt weiterhin `Promise.all`. Sobald ein Schreibvorgang scheitert, beginnt der Catch bereits die Bereinigung, obwohl der andere Schreibvorgang noch läuft. Beide Schlüssel können bei der Kontrollabfrage fehlen, woraufhin der SQL-Platz freigegeben wird. Der noch laufende Schreibvorgang kann anschließend den Datensatz wieder anlegen.

**Deterministisch im Vitest-Mock reproduziert:** Record-Put an einer Promise-Barriere anhalten; Owner-Put sofort ablehnen; `createDatabase` bis zum Fehler und zur Quotenfreigabe ausführen; Kontrollabfrage sieht keinen Datensatz; danach Record-Put freigeben. Der Datensatz ist wieder vorhanden, obwohl `deallocateSlot` bereits aufgerufen wurde. Die bestehenden Tests lassen den erfolgreichen Put sofort abschließen und verfehlen diesen Ablauf.

**Auftrag:** Alle gestarteten Schreiboperationen vor der Kompensation vollständig abwarten, beispielsweise mit ausgewerteten `Promise.allSettled`-Ergebnissen. Bei unklarem tatsächlichem Speicherzustand Reservierung erhalten und Wiederbereinigung ermöglichen. Eine unmittelbare KV-Leseprobe ist kein Ersatz für eine definierte Fehlerstrategie.

**Abnahme:** Den beschriebenen verzögerten Put und die umgekehrte Fehlerreihenfolge testen. Nach Abschluss aller Operationen gilt entweder vollständiger Datensatz mit Reservierung oder vollständige Bereinigung; nie Datensatz ohne Reservierung. Auch Cleanup-Fehler abdecken.

## N4 – P1: Laufende und alte Crawl-Callbacks können Zustand überschreiben

**Ort:** `workers/rag-api/src/index.ts:147` bis `:188`, analog Ingest und Fehler-Callback; Crawl-Protokoll und Registry.

Der Worker prüft `deleting` und `crawling` nur anhand der beim Einstieg gelesenen KV-Kopie. Danach folgen asynchrone Indexoperationen und ein unbedingtes Schreiben dieser alten Kopie. Die SQL-Sperre am Crawl-Start schützt diesen Abschnitt nicht. Eine aktuelle Job-Generation wird in den Callback-Payloads nicht verbindlich geprüft. Bei Abbruch/Freigabe oder einem später gestarteten Crawl können bereits laufende oder verspätete Callbacks deshalb den falschen Zustand bearbeiten.

**Deterministisch im Worker-Test reproduziert:** `/ingest/complete` bei `items.list` anhalten; Registry zwischenzeitlich auf `deleting` setzen und entfernen; Callback fortsetzen. Antwort ist 200, Registry enthält wieder `status: active`. Dies ist ein gezielter Worker-Interleaving-Test, kein vollständiger End-to-End-Nachweis des Abbruchpfads.

**Auftrag:** Führe eine verbindliche Job-/Generationskennung über Start, Ingest, Complete und Failed. Koordiniere mutierende Worker-Operationen und Löschung über einen gemeinsamen belastbaren Mechanismus. Auch Indexänderungen alter Jobs müssen verhindert werden; eine zweite ungeschützte KV-Leseprüfung allein beseitigt die Race Condition nicht. Wähle die kleinste wartbare Lösung und dokumentiere ihre Invariante. Prüfe ebenfalls den Metadaten-PUT, der eine alte Registry-Kopie zurückschreibt.

**Abnahme:** Laufenden Complete/Ingest mit Barriere anhalten, Abbruch und Löschung durchführen, Callback fortsetzen: kein Wiederanlegen, keine nachträglichen Indexschreibvorgänge. Anschließend Job B starten und Callback von Job A senden: A darf weder B abschließen noch dessen Inhalte löschen oder Fehlerstatus setzen. Tatsächlich konkurrierende Start-/Delete-Tests ergänzen; die jetzigen SQL-Fälle A und B prüfen nur beide sequentiellen Reihenfolgen.

## Eigene Prüfungen

| Prüfung | Ergebnis |
|---|---|
| `npm run check` | bestanden: 253 Frontend- und 79 Worker-Tests; Typprüfungen bestanden; Lint 0 Fehler, 15 Warnungen |
| `./venv/Scripts/python.exe -m pytest services/crawler/tests evals/test_evaluate.py -q` | 116 bestanden, 2 Deprecation-Warnungen; einschließlich Chromium-Test |
| `scripts/test-billing.py` gegen eigene frische PostgreSQL-16-Instanz in WSL | bestanden; Server anschließend gestoppt |
| Preflight-Unit-Tests | 6 bestanden; erfassen N1 nicht |
| Zusätzlicher KV-Interleaving-Test | fehlerhaftes Verhalten N3 reproduziert |
| Zusätzlicher Worker-Interleaving-Test | fehlerhaftes Verhalten N4 reproduziert |
| Zusätzliche SQL-Aufrufe | N1 und nicht idempotenter Claim aus N2 reproduziert |

Ein erster Lauf mit dem globalen Python scheiterte an fehlendem `crawl4ai`; maßgeblich ist der anschließend erfolgreiche Lauf im Projekt-venv. Temporäre Reproduktionstests wurden nach Ausführung entfernt; deren Abläufe sind oben dokumentiert. Kein produktiver Preflight, kein Deployment, kein neuer Next-/OpenNext-Build in dieser Review-Runde.

## Ergänzende Release-Nachweise

- `npm run build:cf` fehlt weiterhin als vorgezogener Nachweis. Der bestehende Workflow baut OpenNext erst nach dem Deployment von Worker und Crawler. Ein Buildfehler kann deshalb einen teilweise aktualisierten Stand hinterlassen. Cloudflare-Build vor den ersten produktiven Schreibschritt ziehen und Artefakt anschließend verwenden.
- Browser-Test in einer frischen Linux-CI-Umgebung verifizieren. Die CI installiert Python-Pakete, enthält aber keinen expliziten Schritt zur Bereitstellung des passenden Playwright-Chromiums samt Systemabhängigkeiten. Lokale Browserinstallation belegt die CI-Verfügbarkeit nicht.
- Browser-Sicherheitstest um positive Kontrolle und Nachweis ergänzen, dass die jeweiligen Anfragen den Proxy erreichen. Nur „Dummy-Server erhält null Anfragen“ unterscheidet Proxy-Schutz nicht zuverlässig von anderen Browserblockaden. Der als SNI-Test bezeichnete Test prüft derzeit Backend-Pinning, keinen echten TLS-Handshake mit Hostnamenprüfung.
- Vor Änderungen bestehender Migrationen klären, ob diese bereits irgendwo angewendet wurden. Angewendete Migrationen benötigen eine zusätzliche Vorwärtsmigration. Bei bestätigtem rein lokalem Stand keine unnötige Migrationskette erzeugen.

## Arbeitsauftrag und Bericht für Antigravity

1. N1–N4 jeweils zuerst durch einen gezielten Regressionstest sichtbar machen, dann die Ursache beheben. Bestehende Änderungen und Benutzerarbeit erhalten; keine fachfremden Refactorings.
2. Migrationen und Laufzeitprotokoll gemeinsam aktualisieren. Sichere Reihenfolge für alte/neue Komponenten dokumentieren. Keine Produktivzugriffe oder Deployments durchführen.
3. Reguläre Checks, SQL-Suite samt neuen Fehlerfällen, Preflight-Integration und Cloudflare-Build ausführen. Falls eine Umgebung fehlt, den Nachweis ausdrücklich offenlassen.
4. Für jeden Befund berichten: konkrete Änderung, Dateien, Testbefehl, Ergebnis und verbleibende Grenze. „Implementiert“, „lokal geprüft“ und „produktiv geprüft“ getrennt bewerten. Die pauschale Vollständigkeitsbehauptung im alten Report korrigieren.
5. Report und vollständigen Diff zur erneuten unabhängigen Prüfung übergeben. Keine weitere Gesamtprüfung oder neue Skill-Installation als Ersatz für diese konkreten Reparaturen.
