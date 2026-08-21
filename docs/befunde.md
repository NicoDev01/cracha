# Offene Befunde aus der Code-Review

Stand: 21. August 2026. Reihenfolge nach Schwere. Jeder Befund ist ein Kandidat
für eine eigene Änderung, keiner blockiert die anderen.

## 1. Bug: Cancel gibt Credit-Hold nicht frei

`src/app/api/admin/crawl-queue/cancel/[jobId]/route.ts:35` löscht den
Job-Key, ruft aber nie `releaseCrawlCredits()` auf — obwohl der Job-Record den
`hold_reference` trägt (Zeile 13 liest ihn nicht einmal). Nach einem Abbruch
bleiben die Credits bis zu 24 Stunden reserviert; der Reaper in `credit_state`
(Supabase-Migration 20260813120000) befreit sie nur, wenn der User seinen
Kontostand wieder abfragt.

Fix-Umfang: Hold-Referenz lesen, bei erfolgreichem Cancel freigeben.

## 2. Credit-Settlement hängt am Browser

Die Settlement läuft nur im Status-Polling des Frontends
(`src/app/api/admin/crawl-queue/status/[jobId]/route.ts:66`). Schließt der User
den Tab nach dem Crawl-Start, bleibt der Hold ebenfalls bis zum 24-h-Reaper
hängen. Robuster wäre ein serverseitiger Callback (Modal → Frontend-Worker)
oder eine Settlement beim nächsten beliebigen Kontostand-Lesezugriff.

## 3. Deploy ohne CI-Gate

`.github/workflows/deploy.yml` triggert bei jedem Push auf `main`, parallel zu
CI — kein `needs:`, keine Branch Protection erkennbar. Roter CI-Test verhindert
das Production-Deploy nicht.

Fix-Umfang: Deploy-Jobs auf CI-Erfolg koppeln oder Branch Protection mit
erforderlichen Checks auf GitHub setzen.

## 4. KV read-modify-write ohne Concurrency-Control

Muster `getOwnedDatabase()` → Feld ändern → `saveDatabase()` überschreibt den
kompletten Record (z. B.
`src/app/api/admin/crawl-queue/cancel/[jobId]/route.ts:26-34`). Gleichzeitige
Writes (RAG-Worker setzt Crawl-Status, während der User klickt) können Updates
verlieren — last-write-wins. Abhilfe wären optimistische Concurrency
(`updated_at` als Vergleichswert) oder feinere Keys je Feldgruppe.

## 5. Chat-Credits verbraucht trotz Fehlschlag

`spendChatCredits` läuft vor Retrieval und Generierung
(`src/app/api/chat/route.ts:64`). Schlägt die Suche fehl (409/500) oder findet
nichts Relevantes, sind die 5 Credits trotzdem weg — es gibt keinen
Refund-Pfad. Das Vorab-Buchen ist bewusst so gebaut (Kommentar vor Ort), die
Frage ist, ob „nichts gefunden“ und Infrastrukturfehler genauso kosten dürfen
wie eine echte Antwort.

Entscheidung nötig: Refund bei technischem Fehler einführen oder so lassen und
in den Nutzungsbedingungen klarstellen.

## 6. Leichen im Repo

- `src/app/debug/` — leer, nicht getrackt
- `src/lib/ingestion/` — leer, nicht getrackt

Können gelöscht werden, sobald sicher ist, dass nichts dorthin zurück soll.
