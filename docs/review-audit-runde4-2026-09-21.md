# Review Runde 4 – verbleibende Schreibkoordination

## Ergebnis

**Keine Freigabe: F2 bleibt als P1 offen.** Die konkreten Korrekturen an Lösch-Retry (F1), Artefakt-Konfiguration (F3) und Ruff (F4) sind nachvollziehbar. Der neue `DatabaseCoordinator` löst die verteilte Konkurrenz jedoch nicht. Ein zusätzlicher Test reproduziert weiterhin die Wiederherstellung nach erfolgreicher Löschung.

Prüfung des aktuellen Arbeitsbaums, ohne Produktivänderungen oder Deployment. Der Bericht ersetzt keine Prüfung eines tatsächlich ausgeführten CI-/Produktionslaufs.

## Geschlossene Punkte

- **F1:** Der Retry behandelt Netzwerk- und HTTP-Fehler; notwendige Cleanup-Schritte werden nacheinander ausgeführt. Der Claim wird erst anschließend abgeschlossen. Fehler beim Claim-Lesen werden weitergegeben. Der RAG-Worker kann bei fehlendem KV-Record die deterministische Index-ID herleiten und tatsächlich die Remote-Löschung durchführen, statt sofort 404 zu liefern. Die relevanten Route-Tests bestehen.
- **F3:** Upload setzt `include-hidden-files: true` und `if-no-files-found: error`. Ein separater `verify-build`-Job lädt das Artefakt herunter und prüft Worker-Datei sowie Assets-Verzeichnis vor dem ersten Deploy. Konfiguration geprüft; erfolgreicher GitHub-Actions-Lauf nicht selbst beobachtet.
- **F4:** Eigener Ruff-Lauf besteht. CI installiert jetzt außerdem explizit Chromium mit Systemabhängigkeiten.
- N1 und N3 aus früheren Runden werden durch diese Prüfung nicht erneut geöffnet.

## P1 – Der Koordinator gilt nur innerhalb einer Worker-Instanz

**Orte:** `workers/rag-api/src/coordinator.ts:12`, `:13`, `:133`, `:155`; `workers/rag-api/src/database.ts:48`; `workers/rag-api/src/index.ts:333` und `:410`.

`states` und `queues` sind JavaScript-Maps eines globalen Objekts. Instanz A besitzt andere Maps als Instanz B. `wrapRegistryWithCoordinator` beobachtet nur Schreibaufrufe durch den lokalen Wrapper. Änderungen aus anderen Instanzen oder dem separaten Frontend-Worker aktualisieren A nicht. `reconcilePostWrite` prüft wiederum nur diesen lokalen Speicher.

Cloudflare garantiert nicht, dass zwei Requests dieselbe Worker-Instanz erreichen. Diese Begrenzung ist Teil des dokumentierten Laufzeitmodells, kein ungewöhnlicher Sonderfall. [Cloudflare: Distributed execution](https://developers.cloudflare.com/workers/reference/how-workers-works/#distributed-execution)

### Eigene deterministische Reproduktion

Die echten Worker-Handler wurden zweimal über getrennte Modulimporte geladen (`vi.resetModules()` zwischen den Imports). Damit besitzen A und B getrennte Koordinatoren, aber dasselbe einfache KV-Testbackend. Dieses Backend benachrichtigt keinen Koordinator automatisch.

1. Record ist `crawling`, Job A aktiv.
2. Complete-Request in Worker A bis zum finalen KV-Put laufen lassen. Den tatsächlichen Schreibabschluss an einer Promise-Barriere anhalten.
3. Im gemeinsamen KV den vom Frontend gesetzten Löschzustand modellieren: Record auf `deleting` setzen.
4. Echten DELETE-Request durch Worker B ausführen: **HTTP 200**, Record ist entfernt.
5. Den ausstehenden Put von A freigeben: **Complete antwortet HTTP 200**, Record ist wieder **`active`**.

Damit hilft die neue Nachprüfung in genau dem relevanten Fall nicht: A kennt den Löschzustand aus B nicht und betrachtet sein Schreiben als gültig. Der Test modelliert den Frontend-Übergang nach Abbruch/Freigabe; er ist kein vollständiger End-to-End-Test des Modal-Abbruchs. Die zwei getrennten Worker-Handler, das erfolgreiche DELETE und der verspätete Complete sind tatsächlich ausgeführt.

Auch die Frontend-Funktion `saveDatabase` schreibt weiterhin unmittelbar nach einer KV-Leseprüfung. Sie nimmt an der RAG-Mutex-Queue nicht teil. Mehrere lokale Koordinatoren oder nachträgliche Rückschreibversuche erzeugen daher keine gemeinsame verbindliche Zustandsentscheidung.

### Warum die bestehenden Tests das übersehen

`workers/rag-api/test/lifecycle.test.ts:27–55` ergänzt das Test-Store um einen Proxy: Bereits `store.set` und `store.delete` rufen `registerJob` beziehungsweise `markDeleted` auf demselben Koordinator auf. Dadurch kennt dieser fremde Änderungen sofort – diese Benachrichtigung existiert zwischen echten Worker-Instanzen nicht.

Der zusätzliche Test mit uninstrumentiertem KV ab Zeile 891 prüft überwiegend bereits abgeschlossene Zustandswechsel und danach eintreffende Callbacks. Er hält keinen bereits zugelassenen Put in A über eine erfolgreiche Löschung in B hinweg an. Beide Testarten sind für Teilaspekte brauchbar, belegen aber keine verteilte Serialisierung.

## Enger Folgeauftrag: nur F2 reparieren

Die nächste Änderung braucht eine gemeinsame Zustandsinstanz pro Wissensbasis. Ein weiteres Nachprüfen oder Zurückschreiben aus lokalen Maps erfüllt den Auftrag nicht.

**Architekturvorgabe für die Umsetzung:** Einen zentral adressierten, dauerhaft gespeicherten Koordinator pro Wissensbasis verwenden, beispielsweise ein Cloudflare Durable Object. Alle mutierenden Pfade müssen diese Instanz erreichen: Start/Generationswechsel, Abbruch, Metadaten-PUT, Ingest, Complete, Failed und DELETE. KV kann als Leseprojektion erhalten bleiben. Bestehende PostgreSQL-Billing-Reservierungen bleiben für Guthaben und Quoten zuständig; keine zweite Billing-Implementierung bauen.

Die konkrete Umsetzung muss folgende Eigenschaften ausdrücklich sicherstellen:

1. Gleiche Wissensbasis wird unabhängig vom eintreffenden Worker immer derselben Koordinationsinstanz zugeordnet.
2. Zulassung, Generation und Löschzustand sind dauerhaft rekonstruierbar; Neustart verliert keine Löschentscheidung.
3. Mutierende Operationen werden auch über externe `await`-Aufrufe hinweg koordiniert. Die Verwendung eines Durable Objects allein ersetzt keine korrekte Behandlung dieser asynchronen Abschnitte.
4. Erfolgreiches DELETE bedeutet: Kein bereits zugelassener alter Writer kann anschließend Record oder Index wiederherstellen. Bei unklarem Abschluss bleibt der Vorgang wiederholbar offen.
5. Ein Generationenwechsel darf keine noch laufende Operation des alten Jobs an neuen Indexinhalten arbeiten lassen. Bei gemeinsamem Index muss der Wechsel entsprechend warten; alternativ sauber getrennte Indexgenerationen verwenden, falls erforderlich.
6. Frontend-Direktschreibpfade dürfen den Koordinator nicht umgehen. Migration und kompatible Ausrollreihenfolge dokumentieren.

Die heutige lokale Reparaturlogik nicht als zusätzliche Wahrheitsquelle neben dem neuen Mechanismus behalten. Test-Proxies dürfen keine produktiv fehlenden Benachrichtigungen simulieren. Keine fachfremden Refactorings und kein Deployment.

### Verbindliche Abnahme

- Den oben beschriebenen Zwei-Instanzen-Test mit gemeinsamem uninstrumentiertem Speicher dauerhaft übernehmen. Nach erfolgreichem DELETE bleibt der Record gelöscht, auch nachdem A fortgesetzt wurde.
- Job B über einen getrennten Aufrufer starten, während ein Schreibvorgang von A angehalten ist; A darf B weder überschreiben noch dessen Index verändern.
- Konkurrenz unmittelbar vor tatsächlichem KV-/Index-Schreibabschluss testen, nicht nur vor einer weiteren Leseprüfung.
- Fehler und Neustart während Löschung testen: dauerhafter Zustand bleibt erhalten, Wiederholung beendet Cleanup, keine vorzeitige Quotenfreigabe.
- Mindestens einen Test in einer lokalen Worker-/Durable-Object-Laufzeit ergänzen, nicht ausschließlich gemeinsame Node-Modul-Singletons testen.
- Erst danach reguläre Checks und Build auf dem finalen Stand ausführen. Keine pauschale Vollständigkeitsbehauptung ohne diesen verteilten Nachweis.

## Eigene Prüfungen und Grenzen

- `npm run check`: Exit 0; Frontend 284 Tests, Typprüfungen bestanden, ESLint 0 Fehler / 15 Warnungen. Während dieses Laufs lag zusätzlich mein temporärer Worker-Reproduktionstest vor.
- RAG-Suite nach Entfernen des temporären Tests separat ausgeführt: 88 Tests bestanden.
- Temporäre Lifecycle-Datei: 18 vorhandene Tests plus der zusätzliche Zwei-Instanzen-Test bestanden. Der zusätzliche Test bestätigt ausdrücklich das fehlerhafte Ist-Verhalten; er ist kein Sicherheits-Pass.
- `./venv/Scripts/python.exe -m ruff check services/crawler evals`: Exit 0.
- Python-Funktionstests, PostgreSQL, Preflight und Builds in dieser Runde nicht erneut ausgeführt; deren Erfolg ist dem eingereichten Bericht entnommen und hier nicht als eigene Verifikation ausgewiesen.
- Kein Deployment, keine Secret-Änderung. Temporärer Test entfernt; Produktivcode unverändert.
