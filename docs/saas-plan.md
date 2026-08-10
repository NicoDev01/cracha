# Von der Einzelinstallation zum Mehrbenutzer-Dienst

Stand der Analyse: 10. August 2026. Untersucht wurden Frontend-Worker, RAG-Worker,
Modal-Crawler, KV-Registry und die geltenden Cloudflare-Kontingente.

## 1. Was heute schon mehrbenutzerfähig ist

Mehr, als man erwarten würde. Die Mandantentrennung wurde von Anfang an
mitgebaut und ist an jeder Stelle vorhanden, an der sie hingehört:

| Bereich | Stand |
|---|---|
| Anmeldung | Supabase Auth, vollständig: Registrierung, Login, Bestätigung, Passwort-Reset |
| Identität serverseitig | `getAuthenticatedUser()` liest die User-ID aus dem verifizierten JWT, nie aus dem Request-Body |
| Besitz je Wissensbasis | Jeder KV-Datensatz trägt `user_id`; `getOwnedDatabase()` gibt bei fremdem Besitzer `null` zurück |
| Zweite Prüfung im RAG-Worker | `databaseForUser()` wirft 403 — das Frontend ist nicht die einzige Instanz, die prüft |
| Index-Trennung | Eine AI-Search-Instanz je Wissensbasis, ID = SHA-256 der Datenbank-ID. Kein gemeinsamer Index, keine Filterlogik, die man vergessen kann |
| Crawl-Aufträge | `crawl_job:<id>` trägt `user_id`; Status und Abbruch prüfen ihn |
| Echte Parallelität beim Crawlen | Modal startet je Auftrag einen eigenen Container |
| Trennung der Geheimnisse | Ingest und Query haben getrennte Bearer-Secrets, RAG läuft über Service-Binding statt öffentlich |

**Das heißt: das Fundament steht.** Was fehlt, sind nicht Mandanten, sondern
Grenzen, Kosten und ein Name.

## 2. Drei Befunde, die vor dem ersten fremden Nutzer erledigt sein müssen

### 2.1 Sechs Metadatenfelder, erlaubt sind fünf

`INSTANCE_CONFIG` in `workers/rag-api/src/search.ts:21` definiert sechs
`custom_metadata`-Felder: `url`, `title`, `checksum`, `crawled_at`,
`published_at`, `depth`.

Cloudflare erlaubt **maximal 5 pro Instanz**
([Doku](https://developers.cloudflare.com/ai-search/configuration/indexing/metadata/)).
Warum das heute nicht sichtbar knallt, weiß ich nicht — möglich ist beides:
die Grenze wird auf unserem Pfad nicht durchgesetzt, oder die Instanz speichert
nur fünf. Der zweite Fall wäre schlimm: dann schlägt `instanceConfigMatches()`
bei **jedem Ingest-Batch** fehl, schreibt die Konfiguration neu — und ein
Schemawechsel löst laut Doku eine **vollständige Neuindexierung** aus.

Bei einer Wissensbasis fällt das kaum auf. Bei hundert Nutzern, die gleichzeitig
crawlen, ist es ein Kostenleck mit Ansage.

*Zu tun:* Live-Instanz per API auslesen und zählen, wie viele Felder wirklich
gespeichert sind. Falls fünf: ein Feld streichen. `depth` ist der schwächste
Kandidat, es wird beim Retrieval nirgends gefiltert.

**Das ist der erste Schritt, unabhängig von allem anderen.**

### 2.2 Der Benutzerindex verliert Einträge

`user_index:<userId>` ist ein einzelner JSON-Blob mit einem Array. Angelegt wird
er an zwei Stellen im Lese-Ändern-Schreiben-Muster:
`src/app/api/databases/route.ts:68` und `src/lib/server/crawler-api.ts:114`.

Zwei parallele Anlagen desselben Nutzers — zweiter Tab, Doppelklick — und eine
davon fällt aus dem Index. Der KV-Datensatz bleibt bestehen, die Wissensbasis
wird nur nicht mehr aufgelistet. KV ist zusätzlich eventual consistent (bis zu
60 s), das Fenster ist also größer als eine Millisekunde.

Heute mit einem Nutzer selten. Bei hundert Nutzern täglich.

### 2.3 Nichts begrenzt irgendetwas

Es gibt keine Quote, kein Rate-Limit, keine Nutzungserfassung. Ein einziger
angemeldeter Nutzer kann heute:

- beliebig viele Wissensbasen anlegen (jede belegt eine AI-Search-Instanz)
- 500 Seiten je Crawl ziehen, beliebig oft hintereinander
- unbegrenzt Fragen stellen

Alles auf deine Rechnung, und die Grenzen aus Abschnitt 3 gelten **kontoweit** —
ein einzelner schwerer Nutzer verschlechtert den Dienst für alle anderen. Die
Registrierung ist offen; wer den Link hat, kann sofort crawlen.

`src/stores/auth-store.ts:117` setzt zwar `plan: 'free'`, aber clientseitig und
fest verdrahtet. Das ist Anzeige, keine Berechtigung, und darf niemals zur
Grundlage einer Freischaltung werden.

## 3. Die harten Grenzen, mit denen wir planen müssen

Kontoweit, aus der Cloudflare-Doku vom 7. August 2026:

| Grenze | Workers Paid | Bedeutung für uns |
|---|---|---|
| AI-Search-Instanzen je Konto | **5.000** | Obergrenze für alle Wissensbasen aller Nutzer zusammen. Bei 3 je Nutzer ≈ 1.600 Nutzer |
| Namespaces je Konto | 100 | Zu wenig, um Namespaces als Mandanteneinheit zu nutzen — Idee verworfen |
| Dateien je Instanz | 1 Mio., **500 Tsd. bei Hybrid-Suche** | Wir nutzen Hybrid. 500 Tsd. Seiten je Wissensbasis, unkritisch |
| Max. Dateigröße | 4 MB | Eine Markdown-Seite kommt da nie hin |
| Workers-AI Textgenerierung | **300 Anfragen/Minute** | Die eigentliche Parallelitätsgrenze im Chat |
| Frontier-Modelle | 20/Min., mit Prepaid-Guthaben 50/Min. | Nur relevant, falls wir dorthin wechseln |
| Anfragen/Monat AI Search | unbegrenzt | Kein Thema auf Paid |
| Seiten/Tag crawlen | unbegrenzt | Kein Thema auf Paid |

Zwei Zahlen bestimmen die Architektur: **5.000 Instanzen** und **300 Generierungen
pro Minute**. Alles andere ist weit weg.

## 4. Parallel oder Warteschlange? — Zwei Pfade, zwei Antworten

Deine Frage war, ob wir parallelisieren oder eine Warteschlange bauen. Die
Antwort ist unterschiedlich, weil die beiden Lasten unterschiedlich sind.

### Chat — niemals in eine Warteschlange

Der Chat ist interaktiv. Wer wartet, geht. Workers skaliert horizontal von
selbst; wir müssen nichts parallelisieren, was ohnehin parallel läuft. Die
einzige echte Decke ist Workers AI mit 300/Min. kontoweit.

Richtig ist hier ein **Rate-Limit je Nutzer**, kein Queue:
Cloudflare-Rate-Limiting-Binding, z. B. 20 Fragen pro Minute je Nutzer, darüber
sauberes 429 mit verständlicher Meldung. Damit kann ein einzelner Nutzer die
kontoweite Decke nicht mehr allein ausschöpfen, und 15 gleichzeitig aktive
Nutzer bleiben bequem darunter.

Zusätzlich: bei einem 429 von Workers AI direkt auf das Ersatzmodell gehen,
statt die Anfrage scheitern zu lassen. Der Ersatzpfad existiert bereits, er wird
heute nur bei Fehlern des Primärmodells benutzt.

### Crawls — begrenzte Parallelität, Warteschlange dahinter

Ein Crawl läuft Minuten und zieht 2 CPU und 4 GB. Modal startet heute je Auftrag
einen Container, **ohne Obergrenze**. Fünfzig gleichzeitige Crawls sind fünfzig
Container.

Der billigste korrekte Weg nutzt, was schon da ist: `@app.function(...)` in
`services/crawler/modal_app.py:158` bekommt ein `max_containers=N`. Modal stellt
alles darüber automatisch in eine Warteschlange und arbeitet sie ab, sobald ein
Platz frei wird. Genau dein "bis zu einer gewissen Anzahl parallel, der Rest
nacheinander" — ohne eine einzige neue Komponente.

Dazu eine Regel je Nutzer: **ein laufender Crawl gleichzeitig**. Sonst belegt ein
Einzelner alle N Plätze.

> Cloudflare Queues wäre die Alternative. Ich rate ab: es löst ein Problem, das
> Modal bereits löst, und fügt eine Komponente hinzu, die deployt, überwacht und
> bezahlt werden will.

## 5. Wo Geschwindigkeit noch zu holen ist — und wo nicht

Ehrlich gesagt: das meiste ist schon getan. Was wirklich noch da ist:

**1. Der 402 kostet jede einzelne Antwort ~600 ms.** Heute versucht jede Frage
zuerst Gemini, scheitert an fehlendem Guthaben, und geht dann auf Scout. Das ist
reine Wartezeit ohne Gegenwert, bei jeder Anfrage, für jeden Nutzer. Die
Entscheidung dazu steht noch aus (Abschnitt 8) — sie ist der größte
Geschwindigkeitsgewinn, der gerade verfügbar ist, und kostet keine Zeile Code.

**2. `ensureInstance()` fragt bei jedem Ingest-Batch `info()` ab** — eine
Rundreise je Batch, obwohl sich innerhalb eines Crawls nichts ändert. Klein, aber
bei 500 Seiten in 25er-Batches sind das 20 überflüssige Aufrufe je Crawl.

**Was schon asynchron ist und nicht angefasst werden muss:** Hybrid- und
Vektorsuche laufen parallel, die Hub-Kandidaten werden parallel geprüft, das
Retrieval ist je Indexversion zwischengespeichert, der Crawl läuft komplett
asynchron über Modal mit Status-Polling. Da ist nichts mehr zu holen, und ich
werde nicht so tun, als ob.

## 6. Datenhaltung: KV behalten, D1 daneben

Supabase ist heute **reine Authentifizierung** — keine Tabellen, kein einziger
`.from()`-Aufruf im Code. Alle Fachdaten liegen in KV.

Für Pläne, Kontingente, Nutzungszählung und später Abrechnung reicht KV nicht:
keine Transaktionen, keine atomaren Zähler, keine Abfragen. Dafür braucht es eine
echte Datenbank. **D1** ist die naheliegende Wahl — schon auf Cloudflare, per
Binding erreichbar, SQL, Transaktionen.

Der richtige Schnitt ist nicht "alles nach D1", sondern:

- **KV bleibt** für den Datensatz je Wissensbasis. Er wird bei jeder Frage
  gelesen, und dafür ist KV genau richtig.
- **D1 übernimmt** die Liste (`SELECT ... WHERE user_id = ?` statt eines
  JSON-Arrays — damit ist Befund 2.2 nebenbei erledigt), dazu Plan, Kontingent,
  Nutzung, Audit.

Kein Doppelschreiben derselben Wahrheit, keine Migration des latenzkritischen
Pfades.

## 7. Die Phasen

Reihenfolge ist bewusst: erst dicht machen, dann begrenzen, dann öffnen, dann
kassieren.

### Phase 0 — Aufräumen (halber Tag)

Muss vorher weg, sonst planen wir um Leichen herum.

1. **Metadatenfelder prüfen und ggf. auf 5 reduzieren** (Befund 2.1)
2. `src/lib/queue/simple-job-queue.ts` löschen — 285 Zeilen, startet
   `python.exe` über `child_process` mit fest verdrahteten Windows-Pfaden, läuft
   auf Workers grundsätzlich nicht, und **kein einziger Import zeigt darauf**.
   Ein Überbleibsel aus der Zeit vor Cloudflare, das beim Stichwort
   "Warteschlange" garantiert jemanden in die Irre führt.
3. 16 leere API-Verzeichnisse unter `src/app/api/` entfernen
   (`admin/crawl`, `admin/crawl-python`, `confirm-user` u. a.)
4. Die 19 offenen ESLint-Fehler abarbeiten und Lint zurück in `npm run check`

### Phase 1 — Mandanten hart machen (2–3 Tage)

5. **Benutzerindex nach D1.** D1-Binding, Tabelle `knowledge_bases`
   (`id`, `user_id`, `created_at`), Liste daraus statt aus dem JSON-Blob.
   Einmalige Migration der bestehenden Einträge.
6. **Ein ID-Schema statt zwei.** `POST /api/databases` erzeugt heute
   `slug-uuid8`, der Crawl-Pfad nimmt eine **clientgelieferte** `tenant_id`
   (`crawl-config-form.tsx:154`). Der Crawl-Pfad darf keine IDs mehr erfinden,
   sondern nur noch auf eine bestehende, besessene Wissensbasis verweisen.
7. **Existenz-Orakel schließen.** `enqueueCrawl` antwortet bei fremder ID anders
   als bei freier ID und verrät damit, dass sie existiert. Eine einheitliche
   Meldung.
8. **Kontolöschung, die wirklich löscht.** DSGVO-Auskunfts- und Löschpflicht
   heißt: AI-Search-Instanzen, KV-Datensätze, D1-Zeilen, Supabase-Benutzer. Heute
   gibt es nur das Löschen einer einzelnen Wissensbasis.
9. **Isolationstests.** Nutzer B sieht, liest, crawlt, ändert und löscht nichts
   von Nutzer A — je Endpunkt ein Test, nicht als Stichprobe.

### Phase 2 — Grenzen und Kosten (3–4 Tage)

10. D1-Tabellen `plans`, `user_plan`, `usage_events`
11. Kontingente durchsetzen: Wissensbasen je Nutzer, Seiten je Crawl, Crawls je
    Tag, Fragen je Tag — serverseitig, nicht im Store
12. Rate-Limiting-Binding im Chat, je Nutzer (Abschnitt 4)
13. `max_containers` auf `process_crawl`, plus ein laufender Crawl je Nutzer
14. Nutzung erfassen: je Frage und je Crawl eine Zeile mit Nutzer, Zeitpunkt,
    Modell, Seiten. **Ohne das ist später keine Abrechnung möglich und heute
    nicht erkennbar, wer teuer ist.**
15. Instanzzähler überwachen, mit Warnung lange vor 5.000
16. Verwaiste und leere AI-Search-Instanzen periodisch aufräumen

### Phase 3 — Domain und Livegang (2–3 Tage)

17. Domain bei Cloudflare registrieren, Zone anlegen
18. Worker-Route auf die Domain, `workers.dev` abschalten
19. **Supabase-Redirect-URLs und Cookie-Domain umstellen** — der Punkt, an dem
    solche Umzüge üblicherweise scheitern: Login funktioniert, aber der Callback
    landet auf der alten Domain
20. E-Mail-Bestätigung erzwingen, Registrierung ohne bestätigte Adresse ohne
    Crawl-Recht
21. Absenderdomain für Supabase-Mails (SPF/DKIM/DMARC), sonst landet die
    Bestätigungsmail im Spam und der Nutzer ist weg
22. **Impressum, Datenschutzerklärung, AGB.** Bei einem deutschen entgeltlichen
    Dienst nicht optional. Dazu AV-Verträge mit Cloudflare, Supabase und Modal
23. Zusätzlich zu klären: Der Dienst crawlt fremde Websites im Auftrag des
    Nutzers und speichert deren Inhalte. Wer die Verantwortung dafür trägt,
    gehört in die AGB — nicht in den Code

### Phase 4 — Bezahlung (4–5 Tage, später)

24. Stripe: Produkte, Preise, Checkout
25. Webhook-Endpunkt, der den Plan nach D1 schreibt — Stripe ist die Wahrheit
    über Zahlungen, D1 die Wahrheit über Berechtigungen
26. Kundenportal für Kündigung und Zahlungsmittel
27. Herabstufung ohne Datenverlust: Plan endet, Wissensbasen bleiben lesbar,
    Crawls sind gesperrt

## 8. Was ich von dir brauche

**Offen aus der letzten Sitzung, blockiert Phase 0 Punkt 1 nicht, aber jede
Antwort:** die Entscheidung zu Gemini — Guthaben aufladen, bei Scout bleiben,
oder auf den provider-nativen Endpunkt umbauen. Solange sie aussteht, zahlt jede
Antwort 600 ms für einen Fehlschlag.

**Neu zu entscheiden:**

1. **Wunschdomain** — welcher Name, und soll ich prüfen, ob er frei ist?
2. **Offene Registrierung oder Warteliste zum Start?** Offen heißt: jeder mit dem
   Link crawlt auf deine Rechnung, sobald die Domain live ist. Ich würde bis zum
   Ende von Phase 2 auf Einladung gehen.
3. **Kostendeckel je Nutzer im kostenlosen Plan** — welche Zahlen? Mein Vorschlag
   als Ausgangspunkt: 2 Wissensbasen, 100 Seiten je Crawl, 1 Crawl pro Tag,
   50 Fragen pro Tag.
4. **Phase 4 jetzt schon mitdenken oder bewusst später?** Es ändert das
   D1-Schema, wenn Abrechnung von Anfang an vorgesehen ist.
