# Review Runde 3 – N1 bis N4

Stand: 21.09.2026, Arbeitsbaum auf HEAD `4998a5b03f841be60f41688c2f2ed200e0aeddb3`. Grundlage sind der neue Delegationsbericht, der aktuelle Code und eigene Tests. Keine Produktivänderungen oder Deployments.

## Entscheidung und Fortschritt

**Noch keine Abnahme. N1 und der konkrete Fehler aus N3 sind behoben; N2 und N4 bleiben teilweise offen. Hinzu kommen ein Fehler beim CI-Artefakt und ein Python-Lintfehler.**

- **N1 bestätigt:** `database_preflight_check()` prüft lesend die sechs Funktionen und deren Rechte. Die echte PostgreSQL-Suite besteht, einschließlich unveränderter Zeilenzahlen und Rechteentzug. Zusätzlich habe ich `database_allocate` innerhalb einer zurückgerollten Transaktion entfernt: Die Diagnose liefert korrekt `signature_valid=f, service_role_executable=f`.
- **N3 bestätigt:** `claimDatabase` und `releaseDatabase` warten mit ausgewertetem `Promise.allSettled` auf alle gestarteten Operationen. Damit ist das zuvor reproduzierte Rennen zwischen noch laufendem Put und Rollback geschlossen. Die Regressionstests bestehen.
- **N2 verbessert:** SQL-Claim und Abschluss sind getrennt, der Platz bleibt zunächst reserviert, eigene offene Claims sind wiederholbar. Die HTTP-Retry-Implementierung umgeht aber die erforderliche Fehlerbehandlung.
- **N4 verbessert:** Job-ID wird vom Frontend bis zu den Crawler-Callbacks weitergereicht. Offensichtlich veraltete Requests werden abgewiesen. Mehrere KV-Leseprüfungen ersetzen jedoch keine Koordination konkurrierender Schreiboperationen.

## F1 – P1: Lösch-Retry bestätigt Erfolg trotz fehlgeschlagener Bereinigung

**Ort:** `src/app/api/databases/[id]/route.ts:54–72`, Zweig ohne KV-Datensatz mit vorhandenem offenem Claim.

Der Worker-Aufruf ignoriert sowohl Netzwerkfehler als auch seinen HTTP-Status. Anschließend werden Fehler aus `deleteCrawlAccess` und `releaseDatabase` verschluckt. Solange `deallocateDatabaseSlot` gelingt, antwortet die Route mit `200 {success:true}` und schließt den SQL-Claim ab. Verbliebene Ressourcen verlieren damit ihren offenen Wiederaufnahmezustand.

**Eigene Reproduktion im Route-Test:** Kein KV-Datensatz, eigener offener Claim; Worker antwortet 500; Access-Cleanup und KV-Cleanup werfen Fehler; SQL-Freigabe gelingt. Ergebnis: HTTP 200, `success:true`, Quotenfreigabe wurde aufgerufen. Der Test verwendet die vorhandenen Route-Mocks und ruft die echte DELETE-Funktion auf.

**Reparaturauftrag:** Normalpfad und Retry müssen dieselben Erfolgskriterien haben. Netzwerkfehler, HTTP-5xx und notwendige Cleanup-Fehler erhalten Claim und Reservierung und ergeben einen Fehlerstatus. 404 nur dann als bereits erledigt behandeln, wenn die Löschschnittstelle wirklich die relevanten Ressourcen geprüft hat. Der Worker liest derzeit zuerst die Registry; deren Fehlen allein beweist keine vollständige Remote-Bereinigung. Speichere die für Wiederholungen benötigte Ressourcenidentität im Claim oder leite sie zuverlässig her und autorisiere über den eigenen Claim. SQL-Abschluss erst nach bestätigter Bereinigung.

**Abnahme:** Jeden Teilschritt einzeln fehlschlagen lassen, insbesondere Retry bei bereits fehlendem KV-Record. Kein Erfolg und kein Abschluss bei Fehler; derselbe Claim muss anschließend erfolgreich fortgesetzt werden können. Fremde Claims bleiben unzugänglich. Ein Fehler beim Lesen des Claims darf nicht als bewiesenes Nichtvorhandensein gelten.

## F2 – P1: Job-Prüfungen und finales Schreiben sind weiterhin nicht atomar

**Ort:** `workers/rag-api/src/index.ts:193–217`, `workers/rag-api/src/database.ts:44`; analog Upload, Indexlöschung, Failed und Frontend-Metadatenupdates.

Nach `assertActiveJob` und dem zusätzlichen Lesen in `saveDatabase` folgt ein unbedingter KV-Put. Zwischen Prüfung und Abschluss des Puts können Löschung oder Jobwechsel stattfinden. Der Put enthält weiterhin die alte Kopie und kann sie danach zurückschreiben. `saveDatabase` vergleicht außerdem keine Job-Generation. Die zusätzlichen Prüfungen vor Upload und Indexlöschung haben dieselbe Lücke gegenüber nachfolgenden externen Operationen.

**Zwei eigene deterministische Worker-Tests:**

1. Complete für Job A bis zum finalen `DATABASE_REGISTRY.put` ausführen, den Put vor seinem tatsächlichen Schreiben anhalten. Record auf `deleting` setzen und entfernen. Put freigeben: Request antwortet 200, der Record ist wieder `active`.
2. Derselbe Haltepunkt; inzwischen Record mit `status:crawling, current_job_id:job-b` schreiben. Put von A freigeben: Request antwortet 200, Job B wird durch `active` ohne `current_job_id` überschrieben.

Dies sind Worker-Interleaving-Tests mit kontrolliertem Konkurrenzzustand, keine vollständigen Modal-/Abbruch-End-to-End-Tests. Sie beweisen, dass die neue Worker-Schutzlogik die geforderte Invariante nicht erzwingt. Die vorhandenen Tests halten früher an, sodass eine weitere Leseprüfung die Änderung noch bemerkt.

**Reparaturauftrag:** Diesen Punkt nicht erneut mit zusätzlichen KV-Reads reparieren. Vor Codeänderungen eine kurze technische Invariante festlegen: Wer entscheidet verbindlich über Generation und Löschzustand, und wodurch kann zwischen Prüfung und Mutation kein konkurrierender Übergang stattfinden? Alle betroffenen Mutationen einschließlich bereits laufender Indexoperationen müssen daran teilnehmen.

Eine mögliche Umsetzung ist ein Koordinator je Wissensbasis mit explizit serialisierten mutierenden Operationen; die Serialisierung muss auch über externe `await`-Aufrufe gelten. Eine bloße zusätzliche Instanz oder ein Lock, das vor dem externen Schreiben freigegeben wird, reicht nicht. Alternativ sind getrennte Indexgenerationen mit atomarer Veröffentlichung und verlässlicher Bereinigung möglich. Wähle eine Lösung, dokumentiere sie knapp und vermeide zwei parallele Koordinationssysteme. KV darf dabei eine Projektion sein, aber kein ungeschütztes Read-Modify-Write die verbindliche Zustandsentscheidung.

Frontend-PUT, Start, Abbruch, Ingest, Complete, Failed und DELETE berücksichtigen. Insbesondere `src/lib/server/database-registry.ts:199` behandelt einen Lesefehler derzeit wie einen fehlenden Record und schreibt trotzdem; das darf eine Löschsperre nicht umgehen.

**Abnahme:** Beide obigen Tests als dauerhaft erwartete Sicherheitsinvarianten übernehmen: A darf keinen Record wiederherstellen und B nicht überschreiben. Zusätzlich unmittelbar vor/nach externer Upload- und Delete-Mutation anhalten und Jobwechsel/Löschung einstreuen. Erfolgreicher Abschluss der Löschung muss bedeuten, dass kein zugelassener alter Writer anschließend Ressourcen wiederherstellen kann. Kein Test darf seine Konkurrenzänderung nur vor die letzte Leseprüfung legen.

## F3 – P1: Neuer Artefakt-Upload schließt `.open-next` aus

**Ort:** `.github/workflows/deploy.yml:51–55`.

Der Workflow lädt `.open-next` mit `actions/upload-artifact@v4` hoch, setzt aber `include-hidden-files` nicht. In dieser Version sind versteckte Dateien und Verzeichnisse standardmäßig ausgeschlossen. Der verwendete Globber überspringt bereits das Verzeichnis `.open-next`. Ohne Treffer warnt der Upload standardmäßig nur. Damit können Worker und Crawler bereits deployed werden, bevor der Frontend-Job am fehlenden Artefakt scheitert.

Das ist anhand der Workflow-Konfiguration und offiziellen Implementierung geprüft, nicht durch einen produktiven GitHub-Actions-Lauf. Quellen: [upload-artifact v4: Vorgaben und Verhalten ohne Treffer](https://github.com/actions/upload-artifact/blob/v4/README.md), [Upload-Suchoptionen](https://github.com/actions/upload-artifact/blob/v4/src/shared/search.ts), [Globber: Ausschluss versteckter Verzeichnisse](https://github.com/actions/toolkit/blob/main/packages/glob/src/internal-globber.ts).

**Reparaturauftrag:** Für den eng begrenzten Build-Pfad `include-hidden-files: true` und `if-no-files-found: error` setzen oder den Build in ein explizites Archiv packen. Keine pauschale Freigabe des gesamten Repositorys. Vor dem ersten Deployment muss das Artefakt in einer frischen Umgebung heruntergeladen und auf benötigte Dateien/Assets geprüft sein.

**Abnahme:** Reiner Build-/Artefakt-Test ohne Deployment: Upload und Download erfolgreich; `.open-next/worker.js` und Assets vorhanden, Dateiinhalte stimmen überein. Fehlendes oder leeres Artefakt blockiert alle Deploy-Jobs.

## F4 – P2: Behaupteter Ruff-Erfolg trifft auf den aktuellen Stand nicht zu

**Ort:** `services/crawler/modal_app.py:389`.

Eigener Lauf von `./venv/Scripts/python.exe -m ruff check services/crawler evals` endet mit Exit 1: `E501 Line too long (106 > 100)`. Die CI führt denselben Check aus und bricht hier ab.

**Reparaturauftrag:** Aufruf passend umbrechen, Ruff erneut ausführen. Keine globale Regelabschaltung. Bericht auf den tatsächlich getesteten finalen Dateistand beziehen.

## Eigene Verifikation

| Prüfung | Ergebnis |
|---|---|
| `npm run check` | bestanden: 264 Frontend-Tests, 83 Worker-Tests, beide Typprüfungen; ESLint 0 Fehler / 15 Warnungen |
| Preflight-Unit-Tests | 8 bestanden |
| Python im Projekt-venv inkl. Evals | 116 bestanden, 2 Deprecation-Warnungen |
| Ruff | **fehlgeschlagen**, E501 an `modal_app.py:389` |
| Billing-Suite gegen eigene frische PostgreSQL-16-Instanz | bestanden, einschließlich echter konkurrierender Bind-/Delete-Aufrufe |
| Zusätzlicher Diagnose-Test mit entfernter Funktion | fehlende Funktion korrekt erkannt; Transaktion zurückgerollt |
| Route-Fehlerfall F1 | falschen Erfolg und Quotenfreigabe reproduziert |
| Worker-Interleavings F2 | Wiederherstellung und Überschreiben von Job B reproduziert |

Die temporären Reproduktionstests wurden entfernt; ihre genauen Haltepunkte und Erwartungen stehen oben. PostgreSQL lief isoliert und wurde danach gestoppt. Next-/OpenNext-Build und Live-Preflight wurden in dieser Runde nicht erneut ausgeführt; die Build-Erfolgsangabe stammt aus dem eingereichten Bericht.

## Eng begrenzter Folgeauftrag

1. N1 und N3 geschlossen lassen; keine erneute Gesamtüberarbeitung.
2. F1 und F4 gezielt korrigieren; F3 mit einem Deployment-freien Artefakttest absichern.
3. Für F2 zuerst die gemeinsame Koordination festlegen, dann genau diese implementieren und an den letzten möglichen Schreibstellen testen. Weitere Reads allein erfüllen den Auftrag ausdrücklich nicht.
4. Die bereits offene saubere Linux-CI-Ausführung des Chromium-Tests nachweisen. Der Workflow installiert bisher nur Python-Pakete, keinen explizit passenden Playwright-Browser samt Systemabhängigkeiten; lokale Browserverfügbarkeit ist dafür kein Nachweis.
5. Abschließend Checks auf unverändertem finalem Stand ausführen und Ergebnisse mit Exit-Codes berichten. „Implementiert“, „lokal geprüft“, „CI geprüft“ und „produktiv geprüft“ getrennt halten. Kein Deployment; keine erneute pauschale Abnahmebehauptung.
