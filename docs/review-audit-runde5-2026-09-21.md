# Review Runde 5 – Durable Object vorhanden, Mutation weiterhin aufgeteilt

## Ergebnis

**Noch keine Freigabe.** Das Durable Object und der echte workerd-Test sind Fortschritte. Die gewünschte Serialisierung des gesamten Schreibvorgangs ist aber noch nicht umgesetzt. Zwei gezielte eigene Tests bestätigen verbleibende Fehler.

Die geschlossenen Befunde aus den früheren Runden bleiben geschlossen. Dieses Review betrifft ausschließlich die neue Koordination und deren Nachweise. Keine Produktivänderung, kein Deployment.

## P1: Jobwechsel zwischen Nachprüfung und Commit überschreibt den neuen Job

**Orte:** `workers/rag-api/src/database.ts:74–101`, `workers/rag-api/src/coordinator.ts:301`.

Der Ablauf ist weiterhin:

1. Separate DO-Anfrage zur Prüfung.
2. KV-Schreibvorgang außerhalb des DO.
3. Separate DO-Anfrage zur Nachprüfung.
4. Separate DO-Anfrage `commit-record`.

`commitRecord(record)` übernimmt den Zustand ohne erwartete Job-ID oder Generation. Sein lokaler DO-Lock schützt nur diesen einzelnen Aufruf; ein zwischenzeitlicher `startJob` ist bereits beendet und wird anschließend überschrieben. Die clientseitige `withLock`-Methode verwendet zudem eine lokale Queue je neuem Client und umspannt keinen verteilten Vorgang. Die produktiven Ingest-/Complete-Handler benutzen diese Queue nicht.

### Eigene Reproduktion

Zwei getrennte Worker-Modulinstanzen, gemeinsamer Test-DO-Namespace mit echter Koordinatorklasse, gemeinsames uninstrumentiertes KV:

1. Complete von Job A ausführen, bis KV-Put und Nachprüfung erfolgreich beendet sind.
2. Den folgenden Request `commit-record` vor seiner Zustellung anhalten.
3. Über Worker B den echten Endpoint `start-job` für Job B aufrufen: HTTP 200.
4. Alten Commit von A freigeben: Complete antwortet ebenfalls HTTP 200.
5. Ergebnis: DO-Zustand ist `active`, `activeJobId` fehlt. KV enthält dagegen weiterhin `crawling` mit Job B.

Der autoritative Zustand hat Job B verloren und widerspricht seiner Projektion. Das ist nicht bloß eine vorübergehende fehlerhafte KV-Anzeige. Der Reproduktionstest ist im Anhang vollständig enthalten.

Auch die Indexoperationen laufen weiterhin außerhalb des DO zwischen einzelnen Guards. Eine Prüfung nach einem alten Upload oder Delete kann eine bereits erfolgte Änderung am gemeinsamen Index nicht rückgängig machen. Der bisherige Test am angehaltenen KV-Put belegt nur, dass eine nachfolgende erfolgreiche Kompensation diesen einen Ablauf bereinigt.

## P1: Fehlerhafte DO-Antworten werden als erfolgreiche Zustandsänderung behandelt

**Ort:** `workers/rag-api/src/coordinator.ts:513–532`, Methoden `markDeleting`, `markDeleted`, `commitRecord` des Clients.

Diese Methoden warten auf `stub.fetch`, prüfen aber `response.ok` nicht. Die DO-Fetch-Methode wandelt interne Fehler in HTTP 500 um. Ein fehlgeschlagener persistenter Zustandswechsel kann deshalb dem aufrufenden Worker als erfolgreich erscheinen. Bei `commitRecord` kann `saveDatabase` normal zurückkehren, obwohl der dauerhafte Zustand nicht übernommen wurde.

**Eigener Test:** Stub liefert HTTP 500; alle drei Methoden erfüllen ihre Promises erfolgreich mit `undefined`. Auch `cancelJob` und `getState` auf konsistente Unterscheidung zwischen Fehler und regulärem Ergebnis prüfen. Eine fehlende DO-Bindung darf im Produktivpfad nicht stillschweigend auf den eingebauten In-Memory-Testkoordinator zurückfallen.

## Konkreter Folgeauftrag – keine weitere Schicht von Nachprüfungen

### 1. Ganze Mutationen in das Durable Object verlegen

Der äußere RAG-Worker übernimmt Authentifizierung, Eingabeprüfung und Routing. Danach erhält das DO einen vollständigen fachlichen Befehl für die Wissensbasis, beispielsweise `startJob`, `ingest`, `complete`, `fail`, `cancel`, `updateMetadata` oder `delete`. Nicht nur `assert-*` und später `commit-record` einzeln dorthin schicken.

Innerhalb der einen DO-Queue muss der Befehl folgende Teile umfassen:

- Job/Generation und Lebenszyklus prüfen;
- erforderliche externe Indexoperationen ausführen und deren tatsächlichen Abschluss abwarten;
- verbindlichen Zustand aktualisieren;
- KV-Projektion schreiben beziehungsweise löschen;
- erst danach den nächsten konkurrierenden mutierenden Befehl zulassen.

Vorhandene reine Such-/Upload-Hilfsfunktionen wiederverwenden. Die AI-Search- und KV-Bindings stehen dem DO über sein `env` zur Verfügung. Ein Start- oder Löschbefehl darf nicht während einer noch laufenden alten Mutation erfolgreich abschließen. Wartezeiten sind dabei Teil der gewählten Serialisierung, kein Grund, den Lock vorzeitig freizugeben.

Für Fehler/Neustart einen dauerhaften Operationszustand und idempotente Wiederaufnahme definieren. DO-Storage und externe Dienste bilden keine gemeinsame Transaktion: Bei unklarem externem Abschluss darf kein endgültiger Erfolg gemeldet werden. Diesen Fall explizit behandeln, statt nur den letzten Status aus KV zu importieren.

`commit-record` als ungeschützten Zustandsschreiber entfernen oder vollständig in den fachlichen Befehl einschließen. Job-ID/Generation am tatsächlichen verbindlichen Übergang prüfen. Frontend-Metadatenänderungen nur als Feldänderungen übergeben, damit ein alter vollständiger Record keinen Lebenszyklus zurücksetzt. Eine weitere separate Prüfung unmittelbar vor dem Commit reicht nicht.

### 2. Fehler konsequent weitergeben

Für alle DO-Clientaufrufe den HTTP-Status auswerten. Persistenzfehler ergeben einen Fehler nach außen und lassen einen wiederholbaren Zustand bestehen. Test-Fallback und Test-Namespace aus dem Produktionspfad entfernen; fehlende Bindings müssen klar fehlschlagen. Keine zusätzlichen Bibliotheken nötig, um dies zu lösen.

### 3. Abnahme an den tatsächlichen Konkurrenzgrenzen

- Angehängten Test als Regression übernehmen: Job B darf nach A nicht aus dem DO verschwinden. Bei kompletter Serialisierung startet B erst nach A und bleibt anschließend aktiv.
- Zwei gleichzeitige Complete-Befehle desselben Jobs: exakt ein erfolgreicher Übergang; nicht nur sequentiell testen.
- Externe Upload-/Delete-Operation anhalten, anschließend Cancel, Start B oder DELETE anfordern. Kein konkurrierender Übergang darf einen unsicheren Erfolg melden; nach bestätigtem Delete keine nachträgliche Mutation.
- HTTP 500 für jeden DO-Schreibaufruf injizieren: kein falscher Erfolg, keine Quotenfreigabe bei offener Löschung.
- Neustart nach persistierter Absicht und vor/nach externem Effekt in workerd testen; lokale Map-Rekonstruktion allein reicht für diesen Nachweis nicht.
- Test-Diff und vollständigen Report liefern, kein Deployment. Bereits geschlossene Befunde nicht erneut bearbeiten.

## Nachweise: bestätigt und überzeichnet

- Eigener `npm run check`: Exit 0; **284 Frontend-Tests, 95 Worker-Tests**, Typprüfungen bestanden, ESLint 0 Fehler / 15 Warnungen. Enthält den echten Miniflare-/workerd-Test.
- Zwei zusätzliche eigene Tests bestätigen die oben beschriebenen Fehler. Sie behaupten bewusst das fehlerhafte Ist-Verhalten und sind keine Abnahmetests.
- Der vorhandene workerd-Test führt echte Produktionsklassen aus, prüft aber sequentielle Aufrufe. Er belegt weder einen tatsächlichen Neustart noch konkurrierende externe Indexoperationen.
- Der Bericht behauptet einen Test für zwei konkurrierende Complete-Callbacks. Unter den sechs aktuellen Fällen in `two-instance.test.ts` ist kein solcher Test enthalten. Einer der sechs Fälle rekonstruiert stattdessen eine Koordinatorklasse über derselben Storage-Map. Dessen Titel nennt auch Quotenfreigabe, der Test prüft jedoch keinen SQL-Quotenpfad.
- Python, SQL und Build wurden in dieser Runde nicht wiederholt; dort genannte Ergebnisse stammen aus dem eingereichten Bericht.

## Release-Dokumentation korrigieren

Der neue Bericht verschiebt die Auth-Hook-Aktivierung auf Phase 3 nach dem Deploy. Der bestehende Workflow verlangt ihre Bestätigung bereits im vorgeschalteten Preflight. Reihenfolge wieder konsistent dokumentieren: Datenbank und Hook vorbereiten/verifizieren, dann den vorgesehenen geprüften Deployment-Workflow. Die DO-Migration gehört zum Worker-Deployment; keinen zusätzlichen ungeprüften `wrangler deploy` vor dem regulären Workflow verlangen.

## Anhang: eigene Reproduktionen

Den folgenden Code temporär als `workers/rag-api/test/review5.test.ts` ausführen: `npm --prefix workers/rag-api test -- test/review5.test.ts`. Die Assertions dokumentieren den aktuellen Fehler und müssen für dauerhafte Regressionstests auf die gewünschte Invariante umgestellt werden.

```typescript
import { expect, it, vi } from 'vitest'
import { createTestCoordinatorNamespace } from '../src/coordinator'
import type { Env, DatabaseRecord } from '../src/types'

it('REVIEW: Job B is lost between reconciliation and commit of Job A', async () => {
  const store = new Map<string, string>()
  const id = 'review5'
  const record: DatabaseRecord = { id, user_id: 'user1', name: id, source_url: 'https://example.com', created_at: '', updated_at: '', last_crawl: null, status: 'crawling', current_job_id: 'a', pages_count: 0, chunks_count: 0, document_count: 0 }
  store.set(id, JSON.stringify(record))
  const kv = {
    get: async (key: string, type?: string) => { const v = store.get(key); return v === undefined ? null : type === 'json' ? JSON.parse(v) : v },
    put: async (key: string, value: string) => { store.set(key, value) },
    delete: async (key: string) => { store.delete(key) },
    list: async () => ({ keys: [], list_complete: true }),
  } as unknown as KVNamespace
  const namespace = createTestCoordinatorNamespace({ DATABASE_REGISTRY: kv } as Env)
  let entered!: () => void, resume!: () => void
  const reached = new Promise<void>(r => { entered = r })
  const paused = new Promise<void>(r => { resume = r })
  const intercepted = { idFromName: namespace.idFromName.bind(namespace), get: (objectId: DurableObjectId) => {
    const stub = namespace.get(objectId)
    return { fetch: async (url: string | Request, init?: RequestInit) => {
      if (String(url).endsWith('/commit-record')) { entered(); await paused }
      return stub.fetch(url, init)
    } }
  } } as unknown as DurableObjectNamespace
  const env = {
    DATABASE_REGISTRY: kv, COORDINATOR: namespace, INGEST_SECRET: 'i', QUERY_SECRET: 'q',
    AI_SEARCH: { get: () => ({ items: { list: async () => ({ result: [], result_info: { total_count: 0 } }), delete: async () => {} } }) },
  } as unknown as Env
  const a = (await import('../src/index')).default
  vi.resetModules()
  const b = (await import('../src/index')).default
  const complete = a.fetch(new Request('https://test/ingest/complete', {
    method: 'POST', headers: { Authorization: 'Bearer i', 'Content-Type': 'application/json' },
    body: JSON.stringify({ database_id: id, user_id: 'user1', job_id: 'a', active_keys: [], pages_count: 1 }),
  }), { ...env, COORDINATOR: intercepted })
  await reached
  const startB = await b.fetch(new Request(`https://test/coordinator/${id}/start-job`, {
    method: 'POST', headers: { Authorization: 'Bearer q', 'Content-Type': 'application/json' }, body: JSON.stringify({ jobId: 'b' }),
  }), env)
  expect(startB.status).toBe(200)
  resume()
  expect((await complete).status).toBe(200)
  const stateResponse = await b.fetch(new Request(`https://test/coordinator/${id}/state`, { headers: { Authorization: 'Bearer q' } }), env)
  const result = await stateResponse.json() as { state: { status: string; activeJobId?: string } }
  expect(result.state.status).toBe('active')
  expect(result.state.activeJobId).toBeUndefined()
  expect(JSON.parse(store.get(id)!).current_job_id).toBe('b')
})

it('REVIEW: coordinator commit HTTP 500 is accepted as success', async () => {
  const { CoordinatorClient } = await import('../src/coordinator')
  const client = new CoordinatorClient('x', {} as Env, { fetch: async () => new Response('storage failure', { status: 500 }) })
  await expect(client.commitRecord({ id: 'x' } as DatabaseRecord)).resolves.toBeUndefined()
  await expect(client.markDeleting()).resolves.toBeUndefined()
  await expect(client.markDeleted()).resolves.toBeUndefined()
})

```
