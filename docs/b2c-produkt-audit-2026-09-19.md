# CraCha: B2C-, RAG- und Wachstumsprüfung

Stand: 19. September 2026. Prüfung des vorhandenen lokalen Codes einschließlich der uncommitteten Gemini-Änderungen sowie der öffentlich ausgelieferten Startseite. Dies ist ein priorisierter Arbeitsvorschlag, keine bereits umgesetzte Änderung.

## Ergebnis und Prüfgrenzen

CraCha hat ein brauchbares Fundament für ein persönliches Recherchewerkzeug mit Einmalzahlungen. Ein Architekturwechsel ist dafür nicht begründet. Vor breiter Nutzergewinnung fehlen aber verlässliche Abrechnung, sichere Chatpersistenz, einige grundlegende Bedienwege und ein breiter Nachweis der Antwortqualität. Die öffentliche Domain liefert zudem einen älteren Marketingstand aus als das lokale Projekt.

Geprüft wurden Landingpage und Registrierung im lokalen Browser, auch bei 390 × 844 Pixeln, die öffentliche Startseite, aktive Dashboard-Komponenten, Authentifizierung, Crawl- und Chatpfade, Retrieval, Antwortgenerierung, Credit-/Stripe-Code, Migrationen, Evaluationsfälle und CI. Nicht durchgeführt wurden eine neue echte Registrierung, ein Stripe-Kauf, ein kompletter angemeldeter Browserdurchlauf, Live-Modellbewertungen, eine Prüfung sämtlicher Cloud-Einstellungen oder ein vollständiger Sicherheitstest. Private Nutzerinhalte wurden nicht für Evaluationen abgerufen.

Verifikation: 123 Frontend-/API-Tests, Frontend-Typprüfung und Next.js-Build wurden im unmittelbar vorherigen Review erfolgreich ausgeführt; der Quellstand ist unverändert. Zusätzlich in dieser Prüfung: 70 RAG-Worker-Tests, RAG-Typprüfung sowie 91 Python-Tests für Crawler und Evaluationslogik erfolgreich. Python meldet zwei Deprecation-Warnungen. Diese Prüfungen bewerten überwiegend Code mit Fixtures, nicht die tatsächliche Qualität des produktiven Modells. Eine isolierte Ausführung der echten Generierungsfunktion akzeptierte eine Antwort mit `finishReason: MAX_TOKENS` ohne Fehler oder Unvollständigkeitskennzeichnung.

## 1. Beibehalten und gezielt verbessern

Bereits vorhanden und sinnvoll:

- Eigene Wissensbasen mit serverseitiger Eigentumsprüfung und getrennten Suchinstanzen.
- Hybrid- und Vektorsuche, Reranking, Query-Rewriting, Kontextbudget, Duplikatvermeidung und vollständiges Nachladen geeigneter Übersichtsseiten.
- Gesprächskontext, Streaming, Quellenlinks, Kopieren, Löschen mit Bestätigung und neuer Markdown-Export.
- Crawl-Analyse, standardmäßig 20 Seiten für den Einstieg, Fortschrittsanzeige, Abbruch, erneutes Einlesen und Verwaltung der Wissensbasen.
- 100 Start-Credits; 1 Credit je Seite und 5 je Chatantwort; Einmalpakete statt Abonnement.
- Ledger, Reservierungen und Erstattungen bei bestimmten technischen Fehlern oder leerem Retrieval.
- Lokal verständlichere Landingpage mit Grenzen, Kostenbeispiel, FAQ, Anleitung, Canonical, Sitemap und Open-Graph-Metadaten.

Die Architektur ist im untersuchten Anfragepfad ein RAG-System mit Suchheuristiken und Modell-Fallback. Sie enthält keinen frei planenden Agenten mit wiederholten Werkzeugschritten. Das ist kein Produktmangel. Für Nutzer zählt, ob die Antwort hilfreich und überprüfbar ist.

## 2. Priorität 0: Vor breiter Werbung und Zahlungsfreigabe

### Ausgelieferten Stand eindeutig machen

Im Browser zeigte `https://cracha-app.com/` weiterhin „Verwandle Websites in Chatbots“, „beliebig viele Datenbanken“, umfassende Versprechen zur Erfassung jeder Unterseite und eine Techniklogo-Leiste. Die lokal vorhandene Kosten-/FAQ-Sektion fehlte dort. Lokal verwendet die Startseite bereits „Frag die Website. Finde Antworten mit Quellen.“ Die Ursache der Abweichung wurde nicht ermittelt; ein erfolgreicher lokaler Build beweist keinen aktuellen Produktionsstand.

**Kleine Maßnahme:** Deploy-Ziel, Domainzuordnung und ausgelieferte Version abgleichen. Nach Veröffentlichung einen Smoke-Test auf der echten Domain ausführen: Überschrift, Preisabschnitt, Registrierung, Rechtstexte, Canonical und Leitfaden. Eine nachvollziehbare Release-ID für den Betrieb festhalten. Keine Veröffentlichung wurde in diesem Audit vorgenommen.

### Die offenen Befunde aus dem Gemini-Review schließen

| Befund | Minimale Korrektur | Abnahme |
| --- | --- | --- |
| Persistierte Zeitstempel werden Strings; Renderer erwartet `Date` | Einheitliche Zeitdarstellung und Migration der vorhandenen Daten | Verlauf nach Reload lesbar |
| Chatpersistenz hat keinen Benutzerbezug | Besitzer zuordnen und beim Kontowechsel sauber wechseln/zurücksetzen | Konto B sieht keine Inhalte von A |
| Stream schreibt in die inzwischen ausgewählte Wissensbasis | Anfrage an ursprünglichen Verlauf binden | Wechsel A → B während Antwort verfälscht keinen Verlauf |
| Crawl-Abrechnung hängt vom Browser-Polling ab | Abschluss und Settlement serverseitig zuverlässig und idempotent ausführen | Tab schließen; erfolgreicher Crawl wird genau einmal abgerechnet |
| Crawl-Limit ist nur Lesen-vor-Schreiben | Atomare Reservierung pro Nutzer, definierte Freigabe bei Fehler/Timeout | Zwei gleichzeitige Starts lassen nur einen zu |
| Refund/Dispute wird nur geloggt | Zahlung dauerhaft zuordnen, Teilrückzahlung und Disputzustand verarbeiten | Kein unverändertes ausgebbares Guthaben nach vollständiger Erstattung |
| Widerrufscheckbox nur im Browser | Geprüften rechtlichen Ablauf implementieren, Zustimmung versioniert speichern und Vertragsbestätigung bereitstellen | API kann den vorgesehenen Ablauf nicht umgehen; Nachweis vorhanden |

Fundstellen: `src/stores/chat-store.ts`, `src/hooks/use-chat-store.ts`, `src/app/api/chat/route.ts`, `src/lib/server/crawler-api.ts`, `src/app/api/admin/crawl-queue/status/[jobId]/route.ts`, `src/app/api/stripe/{checkout,webhook}/route.ts`, `supabase/migrations/20260813120000_replace_plans_with_credits.sql`.

### Geldbewegungen unabhängig von guten Unit-Tests absichern

Der Chat erzeugt für jeden HTTP-Request eine neue Buchungsreferenz. Ein Transport-Retry ist daher nicht automatisch dieselbe wirtschaftliche Anfrage. Die aktuellen Tests ersetzen Datenbankzugriffe überwiegend durch Mocks; sie beweisen keine SQL-Invarianten unter Konkurrenz.

**Kleine Maßnahme:** End-to-End-Idempotenz für eine logisch identische Anfrage und echte Datenbank-Integrationstests für parallele Abbuchungen, wiederholte Webhooks, Refunds, Hold-Settlement und Release. Die Buchung muss zum tatsächlich bezahlten Paket passen. Preis, Währung und Produktzuordnung serverseitig abgleichen; Metadaten allein sind kein vollständiger Zahlungsabgleich.

`automatic_tax` garantiert keinen zur UI passenden Bruttopreis. Stripe-Preise einschließlich Steuerverhalten, Neukunden/Bestandskunden, erforderlicher Adresse, Zahlungsbeleg und verzögerter Zahlung konkret im Testmodus prüfen. Der konfigurierte Stripe-Livezustand wurde nicht gelesen. [Stripe: Price und Steuerverhalten](https://docs.stripe.com/api/prices/object)

## 3. Antwortqualität: Der größte Produkthebel

### Vor Änderungen eine belastbare Vergleichsbasis schaffen

Die vorhandenen Live-Falldateien enthalten elf Fälle: zwei generische Smoke-Fragen und neun Webmen-Fragen, überwiegend Teamaufzählungen. Nur zwei Fälle enthalten Antwortprüfungen. Ohne `--chat-endpoint` können diese übersprungen werden und der Evaluationslauf trotzdem erfolgreich enden. CI prüft die Evaluationslogik, führt aber keinen breiten Live-Antwortbenchmark aus.

**Vorschlag:** Den vorhandenen Evaluator um zunächst 40–60 kuratierte Fälle auf 4–6 erlaubten, versionierten Quellen ergänzen. Keine neue Evaluationsplattform nötig. Abdecken: Einzelfakten, Bedingungen/Ausnahmen, Tabellen, Vergleiche, Zahlen/Datumsangaben, komplette und unvollständige Aufzählungen, Nachfragen, widersprüchliche oder veraltete Seiten, nicht beantwortbare Fragen und manipulative Anweisungen in Quelltexten. Einen Teil als unangetasteten Testsatz behalten. Primär- und Ersatzmodell getrennt auswerten.

Messen: faktische Richtigkeit, Unterstützung der einzelnen Behauptungen durch Quellen, passende Quellenmarker, Vollständigkeit bei definiertem Umfang, korrektes Nichtantworten, Zeit bis zum ersten sichtbaren Text, Gesamtdauer und tatsächliche Kosten. Rohantwort, Indexstand, Prompt-/Modellversion und Fehlergrund nachvollziehbar speichern; private Inhalte nur mit geregeltem Zweck und Zugriff. Das Konzept der quellenbezogenen Faktentreue ist etwa in [Ragas: Faithfulness](https://docs.ragas.io/en/latest/concepts/metrics/available_metrics/faithfulness/) beschrieben; eine Installation von Ragas ist dafür keine Voraussetzung.

**Abnahme:** Alle als kritisch markierten Referenzfälle bestehen, kein Benchmark wird als bestanden bezeichnet, wenn seine Antwortprüfungen fehlen. Änderungen werden gegen denselben Korpus und die bisherige Version verglichen. Zusätzlich zehn typische Antworten manuell prüfen; Modellbewertungen sind kein alleiniger Wahrheitsnachweis.

### Konkrete Qualitätsrisiken im bestehenden Code

1. **Abgeschnittene Ausgabe:** `src/lib/server/generation.ts` begrenzt auf 4.000 Ausgabetokens, verarbeitet jedoch weder `finishReason` noch `finish_reason`. Im isolierten Test wurde `MAX_TOKENS` als Erfolg akzeptiert. Abschlussgründe auswerten; Unvollständigkeit anzeigen und eine begrenzte Fortsetzung oder definierte Fehlerbehandlung anbieten.
2. **Unbelegte Listen werden wieder freigegeben:** Wenn `groundListEntries()` alle Einträge verwirft, gibt der Code die ursprüngliche Liste wieder aus. Das vermeidet leere Antworten, beweist aber nicht, dass die Liste richtig ist. Diesen Zustand als Qualitätsfehler erfassen und mit höchstens einem gezielten Wiederholungsversuch oder einer ehrlichen Einschränkung behandeln. Nicht einfach jeden Listenfehler verbergen.
3. **Zu starke Vollständigkeitsvorgabe:** Der Systemprompt untersagt weitgehend Zweifel an der Vollständigkeit. Eine vollständige eingelesene Seite ist aber nicht zwangsläufig die vollständige Website oder Antwortmenge. Antwort auf den tatsächlich erfassten Umfang beziehen. Fehlende Crawl-Abdeckung darf nicht als Gewissheit erscheinen.
4. **Quellenmarker sind keine Beweisprüfung:** Die lokale Listenprüfung kontrolliert vor allem Entitäten; Fließtext, Zahlen und Beziehungen werden dadurch nicht vollständig validiert. Zuerst geeignete Referenzfälle ergänzen, statt pauschal ein zweites Modell für jede Antwort zu bezahlen.
5. **Wartezeit und Fehler:** Explizite Zeitbudgets für Retrieval und Antwortbeginn fehlen im untersuchten Chatpfad. Ein Fallback nach Exception hilft nicht bei einem hängenden Aufruf. Deadlines, verständliche Zustände und eine konsistente Abbruch-/Abrechnungsregel ergänzen.

Nur falls der Benchmark einen Nutzen zeigt: bei schwacher Evidenz einmal gezielt nachsuchen oder eine Rückfrage stellen. Keine unbeschränkte Agentenschleife. RAG beseitigt Prompt-Injection-Risiken nicht allein; konkrete adversarielle Quellfälle gehören in die Abnahme. [OWASP: Prompt Injection](https://genai.owasp.org/llmrisk/llm01-prompt-injection/)

## 4. Minimale B2C-UX innerhalb des vorhandenen Layouts

| Bereich | Befund | Gezielt ergänzen |
| --- | --- | --- |
| Aktives Kontomenü | „Edit profile“, „Account settings“ und „Support“ verlinken alle `/profile`; Route fehlt | Kleine Kontoseite und echter Supportkontakt; Texte auf Deutsch |
| Header/Sidebar | Gemini bearbeitete ungenutzte Komponenten; aktiv sind `layout/AppHeader` und `layout/AppSidebar` | Änderungen an den tatsächlich eingebundenen Komponenten |
| Benachrichtigungen | Glocke zeigt immer „Keine Benachrichtigungen“ | Entfernen oder an echte Crawl-Ereignisse anbinden |
| Registrierung | Verständliche Bestätigungsseite vorhanden, aber kein erneuter Versand dort; Pflichtfeld vollständiger Name | Versand mit Cooldown und Adresskorrektur; Notwendigkeit des Namens prüfen |
| Auth-Sprache | Registrierung wirbt weiterhin mit „RAG-as-a-Service“ | Dieselbe verständliche Nutzenbeschreibung wie auf der Landingpage |
| Crawl starten | Gute 20-Seiten-Voreinstellung; API kann Umfang anhand des Guthabens reduzieren | Vor Start „maximal X Credits; Y verfügbar“, tatsächliches Limit und Rest für Fragen anzeigen |
| Crawl-Ergebnis | Summen und Status vorhanden | Erfasste, übersprungene, blockierte und fehlerhafte Seiten unterscheiden; erste passende Frage anbieten |
| Chat | Kopieren, Quellen, Export, Verlauf vorhanden | „Neue Unterhaltung“ ohne alte Recherche zu löschen, Stoppen, Wiederholen und Daumen-Feedback |
| Guthaben im Chat | Kein sichtbarer Preis oder direkter Aufladeweg am Eingabefeld | „5 Credits pro Antwort“, aktuelles Guthaben, Aufladen bei 402 ohne Verlust des Entwurfs |
| Buchungen | `/api/credits` liefert `entries`; UI nutzt sie nicht | Bestehende Daten als einfache Buchungsliste anzeigen |
| Checkout-Rückkehr | Guthaben wird einmal geladen; Webhook kann später eintreffen | „Zahlung wird verarbeitet“, begrenzt aktualisieren; Erfolg erst nach bestätigter Gutschrift |
| Datenlebenszyklus | Wissensbasis löschen vorhanden, Kontolöschung nicht im geprüften App-Pfad | Verständlicher Löschweg inklusive Indizes, Cache und lokalen Verläufen; Abrechnungsaufbewahrung gesondert regeln |

Die Chat-Historie muss zunächst zuverlässig und kontogetrennt funktionieren. Vor einem Versprechen geräteübergreifender Nutzung ist serverseitige Speicherung nötig; bis dahin klar „auf diesem Gerät gespeichert“ anzeigen. Mehrere Chats pro Wissensbasis können im vorhandenen Bereich bleiben, ohne eine neue Dashboard-Struktur einzuführen.

Der mobile Ersteindruck bei 390 Pixeln war lesbar; kein offensichtlicher Grund für ein Redesign. Ein vollständiger mobiler Chat-Test mit Bildschirmtastatur und echten Streams bleibt offen. Beim Registrierungsformular sind die Passwort-Sichtbarkeitsschalter im Accessibility-Baum unbenannt. Tastaturbedienung, Fokus, verständliche Feldfehler und diese Beschriftungen gezielt nachziehen; keine vollständige Barrierefreiheitskonformität aus dieser Sichtprüfung ableiten.

## 5. Credits und Wirtschaftlichkeit

Die vorhandenen Credits sollten als verständliche Verbrauchseinheit bleiben. Modell-Token sind eine interne Kostenmetrik; Nutzer sollten den Preis ihrer nächsten Handlung vorher kennen. Keine Umstellung auf schwankende Modell-Token-Rechnungen ohne ausdrücklichen Produktentscheid.

Aktuelle lokale Pakete: 1.250 Credits für 10 €, 3.500 für 25 €, 7.500 für 50 €. Ein anschauliches Beispiel für das kleinste Paket: 50 eingelesene Seiten und 240 Antworten bei den bestehenden Tarifen. Das ist eine Rechenhilfe, keine Qualitäts- oder Crawl-Erfolgsgarantie. Preise und Steuerkonfiguration müssen mit Stripe übereinstimmen.

Die Margentests rechnen mit festen USD-Kostenannahmen und einem festen Wechselkurs. Umsatzsteuer, Zahlungsgebühren, fehlgeschlagene Crawls, lange Indexierungszeiten, Retrieval/Rewrite/Reranking, kostenlose Tests, Erstattungen und Support sind damit nicht vollständig bewertet. Deshalb echte Kosten je abgeschlossenem Crawl, hilfreicher Antwort und zahlendem Konto erfassen. Insbesondere hält der Modal-Crawlpfad Ressourcen auch während Verarbeitung/Indexierungswartezeiten bereit; eine Schätzung nur pro erfolgreich geladener Seite kann danebenliegen.

AI Search ist laut aktueller Dokumentation innerhalb der Beta-Grenzen kostenlos; Workers AI und Gateway werden separat berechnet. Diese Kostenbasis ist keine dauerhafte Preisgarantie. Zudem begrenzt die Architektur eine Wissensbasis auf eine Suchinstanz; aktuell nennt Cloudflare für Workers Paid 5.000 Instanzen je Konto. Bei vollständig ausgeschöpften 25 Wissensbasen pro Nutzer wären das rechnerisch 200 solcher Konten, nicht 5.000 Nutzer. Kontingente beobachten, bevor sie knapp werden; jetzt noch keinen gemeinsamen Index erzwingen. [Cloudflare: Limits & Pricing](https://developers.cloudflare.com/ai-search/platform/limits-pricing/)

Einmal bezahlte Credits und lange vorgehaltene Wissensbasen erzeugen unterschiedliche Kostenverläufe. Speicher-/Aufbewahrungspolitik transparent festlegen und gegen reale Kosten prüfen; kein späteres unangekündigtes Löschen als Geschäftsmodell.

## 6. Landingpage und erste Nachfrage

Die lokale Landingpage ist bereits deutlich verständlicher als die öffentlich sichtbare Version. Struktur und Gestaltung können bleiben. Ergänzen würde ich:

1. **Konkretes Ergebnis statt weiterer Technikbegriffe:** Ein echtes, geprüftes Beispiel mit Website, Frage, kurzer Antwort und klickbarer Originalquelle. Eine statische Fallstudie oder kurze Produktaufnahme reicht; keine kostenpflichtige öffentliche Live-Demo nötig.
2. **Preis vor Registrierung:** Bestehende drei Pakete, „kein Abo“, Verbrauchseinheiten, Startguthaben und gemischtes Rechenbeispiel direkt im vorhandenen Kostenbereich. Derzeit verweist das FAQ nur auf spätere Preise im Dashboard/Checkout.
3. **Eine erkennbare Anfangszielgruppe:** Als zu prüfende Hypothese Menschen mit wiederholten Fragen zu umfangreichen Dokumentationen, Produktinfos oder Hilfecentern. Die aktuelle Beschränkung auf öffentliche HTML-Seiten passt weniger gut zu einer pauschalen Ansprache sämtlicher Studierender, deren Material oft als PDF oder hinter Logins liegt.
4. **Abgrenzung über den eigenen Arbeitsablauf:** Einmal einen selbst gewählten Website-Bereich einlesen, später weiterfragen und Originalquellen prüfen. Keine pauschalen Behauptungen, andere KI könne nur eine Seite lesen. Keine Versprechen „jede Unterseite“, „immer richtig“ oder „unbegrenzt“.
5. **Grenzen und Vertrauen:** HTML statt PDF-Upload, kein Paywall-Zugriff, Aktualität durch erneutes Einlesen, persönliches Konto statt eingebettetem Website-Widget, erreichbarer Support. Reale Stimmen erst mit tatsächlicher Nutzung und Zustimmung.

Vorschlag für eine kurze Ergänzung: „Lies einen öffentlichen Website-Bereich einmal ein und stelle später weitere Fragen dazu – mit Links zu den Originalseiten. 100 Start-Credits, keine Kreditkarte, kein Abo.“ Eine konkrete Musterantwort ist wertvoller als zusätzliche austauschbare Feature-Karten.

Die vorhandene Anleitung erweitern und aus realen erfolgreichen Aufgaben zwei bis drei nützliche Fallbeispiele machen. Keine große Menge ähnlicher SEO-Seiten vor nachgewiesenem Nutzen. [Google: hilfreiche, verlässliche Inhalte](https://developers.google.com/search/docs/fundamentals/creating-helpful-content)

## 7. Lernen, Betrieb und bisher übersehene Punkte

- **Produktmessung:** Im geprüften Code ist kein vollständiger Aktivierungsfunnel erkennbar. Die vorhandene Betriebsdokumentation berichtet zudem von EU-Ausschluss in Web Analytics; diese aktuelle Kontoeinstellung wurde nicht verifiziert. Anonymisierte/zweckgebundene Ereignisse für bestätigte Registrierung, Crawl-Start/-Erfolg, erste hilfreiche Antwort, Kauf und Wiederkehr vorsehen. Ein ausgelieferter Text ist noch keine hilfreiche Antwort: Feedback ergänzen. Keine Chat-Rohtexte in allgemeine Marketinganalysen kopieren.
- **Missbrauch außerhalb bezahlter Aktionen:** `/api/admin/crawl/analyze` löst nach Anmeldung Arbeit im Crawler aus, ohne Credit-Prüfung oder sichtbares App-Rate-Limit. Analyse, Chat und Crawl brauchen jeweils angemessene serverseitige Frequenz-/Parallelitätsgrenzen. Externe WAF-Regeln sind nicht verifiziert. Das bestehende Modal-Limit von zehn Crawl-Containern ist hilfreich, ersetzt aber Fairness je Konto nicht.
- **DNS/SSRF:** Öffentliche Adressen und mehrere Redirectpfade werden geprüft. Ein vollständiger Nachweis gegen DNS-Rebinding, Browser-Subrequests und Redirect-Rennen liegt damit nicht vor. Vor unkontrollierter öffentlicher Nutzung gezielt testen und erforderlichenfalls ausgehende Netzwerkzugriffe begrenzen; nicht pauschal behaupten, es gebe keinen Schutz.
- **Datenschutztext mit Technik abgleichen:** Er erwähnt Google nur für Login und keine Stripe-Zahlungsverarbeitung; die Generierung nutzt einen Google-Modellpfad, und `collectLog: true` ist gesetzt. Chatpersistenz ist im lokalen Speicher hinzugekommen. Cloudflare beschreibt Gateway-Logs einschließlich Prompt und Antwort. Tatsächliche Anbieterwege, Logeinstellungen, Aufbewahrung und Löschung erfassen und die Erklärung entsprechend prüfen. [Cloudflare: Gateway-Logging](https://developers.cloudflare.com/ai-gateway/observability/logging/)
- **Löschung während laufender Arbeit:** Für Wissensbasislöschung, Re-Crawl und Kontolöschung festlegen, wie laufende Jobs gestoppt werden und späte Callbacks behandelt werden. Kein Wiederauftauchen gelöschter Daten. Aufbewahrung abrechnungsrelevanter Belege nicht versehentlich per pauschalem Cascade-Delete lösen.
- **Betrieb:** Korrelations-ID über Browser, Chat, Retrieval, Crawler und Buchung; Alarme für nicht abgerechnete Holds, Refundfehler, Checkoutfehler und Fallbackhäufung. Wiederherstellungs-/Rollbackweg dokumentieren. Backup ohne getestete Wiederherstellung ist kein ausreichender Nachweis.
- **Sicherheitsdokumentation:** `SECURITY.md` erwähnt frühere Zugangsdaten in der Repository-Historie. Ob die geforderte Rotation abgeschlossen ist, wurde hier nicht geprüft. Abschlussnachweis gehört vor breiter Veröffentlichung geklärt; keine Geheimnisse in Berichte kopieren.

## 8. Reihenfolge mit möglichst wenig Umbau

| Etappe | Inhalt | Fertig, wenn … |
| --- | --- | --- |
| A: Verlässlicher Kern | Chatpersistenz, Streamzuordnung/-abschluss, Settlement, Idempotenz, Refunds, echte Profil-/Supportwege | Kritische Reproduktionen und Zahlungs-/Kontowechselfälle bestehen |
| B: Erster Erfolg | Crawl-Kostenvorschau, Abschluss → Chat, Preis/Restguthaben im Chat, Retry/Stop, Bestätigungsmail erneut senden | Neue Testperson erreicht ohne Hilfestellung eine überprüfbare Antwort |
| C: Qualität und Angebot | Breiter Referenzsatz, ehrliche Umfangsangaben, sichtbare Pakete, echtes Beispiel, aktuelle öffentliche Version | Antwortvergleich dokumentiert; Landingpage und App versprechen dasselbe |
| D: Kleine Pilotgruppe | 5–10 passende Personen mit eigener wiederkehrender Aufgabe, Feedback und Ereignismessung | Erkennbar ist, wer wiederkehrt, wofür und warum andere abbrechen |

Diese Gruppengrößen sind Vorschläge für den Start, keine statistische Validierung und keine Wachstumsprognose. Zuerst Engpässe beobachten: scheitert Bestätigung, Quelle, erste Frage, Antwortnutzen oder Wiederkehr? Erst danach gezielt denselben funktionierenden Anwendungsfall verbreiten.

Jetzt nicht priorisieren: neues Designsystem, Teams/Rollen/SSO, Abonnements, Sprachmodus, Agenten-Marktplatz, beliebige Connectoren, PDF-/Drive-Import als großer Scope-Sprung, komplexe Dashboards oder offene anonyme KI-Demos. Diese Dinge nur aufnehmen, wenn echte Nutzeraufgaben ihren Aufwand rechtfertigen. Die bestehenden Bausteine reichen für den nächsten belastbaren Produktschritt.
