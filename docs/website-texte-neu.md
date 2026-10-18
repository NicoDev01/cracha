# CraCha: Website neu erzählt

Stand: 15.10.2026. Arbeitsdokument, ersetzt den ersten Entwurf vollständig. Nichts davon baut auf der heutigen Seite auf.

---

## 1. Die Idee in einem Satz

> **Frag nicht das Internet. Frag die Website.**

Alles auf der Seite zahlt auf diesen Gedanken ein. KI-Suchen gehen bei jeder Frage neu ins Netz und nehmen, was sie finden. CraCha hat die Website schon gelesen, Unterseite für Unterseite. Deshalb kommt es tiefer und genauer an die Antwort, mit Beleg.

---

## 2. Gegen wen wir antreten

Nicht gegen den „dummen“ KI-Chat, der nur sein Training kennt. Den gibt es kaum noch. Wir treten gegen **KI-Suchen** an: den KI-Modus bei Google, ChatGPT mit Suche, Perplexity und Agenten wie Claude oder Codex, die selbst im Netz recherchieren.

| | KI-Suche | CraCha |
|---|---|---|
| Wann sie liest | bei jeder Frage neu | einmal vorab, die ganze Website |
| Was sie findet | was die Suchmaschine kennt und weit oben zeigt | jede verlinkte Unterseite, auch die, die keine Suchmaschine zeigt |
| Woher die Antwort kommt | ein paar Treffer aus dem ganzen Netz | nur aus der Website, die du gewählt hast |
| Gefühl | mal ein Treffer, mal nicht | sie kennt sich dort aus |

**Warum das stimmt:** Google sagt selbst, dass nicht jede Seite in den Index kommt: „Indexing isn't guaranteed“ ([Google Search Central](https://developers.google.com/search/docs/fundamentals/how-search-works)). Der KI-Modus zerlegt eine Frage in mehrere Suchanfragen auf Googles eigener Suche ([Search Engine Journal](https://www.searchenginejournal.com/query-fan-out-technique-in-ai-mode-new-details-from-google/), Darstellung aus zweiter Hand). Was die Suche nicht hat, kann die KI nicht finden. CraCha folgt dagegen selbst den Links und der Sitemap der Website.

### Der Beweis: die Vollständigkeitsprobe

Test vom 15.10.2026 mit Googles KI-Modus, verglichen mit CraChas eigenem Eval-Lauf vom 28.09.2026 (`evals/results/models-2026-09-28T19-33-54-158Z.md`):

| Frage an webmen.de | Google KI-Modus | CraCha |
|---|---|---|
| Wie viele Mitarbeiter? | 33 (richtig, aus einem Textausschnitt) | 33 (richtig) |
| Alle Namen nennen | 16 Namen | 32 Personen plus Bürohund, mit beiden Antwortmodellen. Ein Name aus der Soll-Liste in `evals/cases.webmen.json` fehlte (Tjark Städtler). |
| Ausdrücklich „ausnahmslos alle“ | 12 Namen, davon 4 als „erwähnt im Testimonial“ gekennzeichnet | (nicht gefragt) |

**Korrektur zur ersten Fassung:** Dort stand „32 von 32“. Das stammt aus der Übersicht des Eval-Laufs, die nur 32 Namen geprüft hat. Gegen die vollständige Soll-Liste fehlte ein Name. Ob die Teamseite sich zwischen Einlesen und Soll-Liste geändert hat, lässt sich nicht mehr klären. Veröffentlichungsreif ist der Vergleich deshalb erst nach einem Neutest am selben Tag. Die Eval-Modelle sind dabei die produktiven (`src/lib/server/generation.ts`). Das in `docs/architecture.md` genannte Llama-Modell ist veraltet.

**Was daraus folgt:** Eine KI-Suche arbeitet mit dem, was die Suchmaschine ihr an Ausschnitten liefert. Bei einer Zahl reicht das. Braucht man den Inhalt einer ganzen Seite, etwa eine Liste, alle Bedingungen oder alle Fristen, bekommt man eine Auswahl und merkt es nicht. CraCha hat die Seite selbst gelesen. Das ist das stärkste Argument, weil jeder es selbst nachprüfen kann.

**Richtige Rahmung:** „Die KI-Suche überfliegt Ausschnitte, CraCha liest die Seite.“ Nicht: „CraCha zählt dir alles auf.“ Sonst testen neue Nutzer genau die Fragen quer über hunderte Seiten, an denen auch CraCha scheitert.

**Was wir daraus nicht ableiten dürfen:**
- **Die Selbsterklärungen des KI-Modus sind keine Belege.** Sprachmodelle können ihre eigene Arbeitsweise nicht zuverlässig beschreiben. „Lazy Loading“, „ich kann nicht scrollen“ und „Common Crawl“ sind plausible Vermutungen der KI, keine Auskunft von Google. Belastbar ist nur das beobachtete Ergebnis.
- **Dass der KI-Modus CraCha empfiehlt, ist kein Testimonial.** Es stammt aus deinem eigenen Chatverlauf, in dem CraCha vorher erwähnt wurde.
- **Ein Fall ist kein Benchmark.** Formulierung für die Seite: „Wir haben es ausprobiert“, nicht „CraCha ist vollständiger als Google“.
- **CraCha ist auch nicht grenzenlos vollständig.** Es klappt, wenn die Liste auf einer oder wenigen Seiten steht (Team, Preisliste, Produkttabelle, Fristen). Fragen wie „Nenne alle Blogartikel zu X“ über hunderte Seiten scheitern auch bei CraCha, weil pro Frage nur eine begrenzte Zahl passender Abschnitte an die KI geht (höchstens zwei je Seite, laut `docs/architecture.md`).
- **Seiten, auf die kein Link zeigt und die in keiner Sitemap stehen, findet CraCha auch nicht.** Unser Vorteil gilt für Seiten, die verlinkt, aber nicht bei Google gelistet sind.
- **Seiten, die KI-Crawler per robots.txt aussperren, sind kein Verkaufsargument.** „CraCha kommt auch da rein“ dürfen wir nie sagen. **Produktbefund:** Der Standard im Code ist `respect_robots_txt: false` (`src/lib/server/database-registry.ts:24`), `docs/architecture.md:20` behauptet das Gegenteil. Das ist eine Produkt- und Rechtsfrage und muss vor jeder Aussage zu robots.txt entschieden werden.
- **Echte Mitarbeiternamen einer fremden Firma nicht ohne deren Zustimmung als Werbebeispiel zeigen.** Und auch die Zahlen nicht ohne Neutest.
- **Eine eigene Demo-Seite ist nicht automatisch die Lösung.** Eine neue Seite kennt Google noch nicht. Scheitert die KI-Suche dort, beweist das nur, dass die Seite neu ist, und wirkt gestellt. Besser eine fremde öffentliche Seite mit einer langen Liste ohne Personendaten, etwa eine Preis-, Produkt- oder Programmliste, die nachweislich bei Google gelistet ist. Eine eigene Demo-Seite funktioniert nur, wenn sie vorher nachweislich indexiert ist.
- **Nur das Beobachtete zitieren, keine Erklärung dazu erfinden.** „Nach dem halben Team bricht der Suchausschnitt ab“ wäre wieder eine Vermutung. Und die Kundenstimmen hat Google als solche gekennzeichnet, nicht als Mitarbeiter ausgegeben.
- **Die KI-Suche nicht herabsetzen.** Formulierungen wie „zusammengereimt“ oder „unzuverlässig“ sind bei einem Vergleich mit erkennbaren Anbietern riskant. Vergleichende Werbung muss sachlich und nachprüfbar sein (§ 6 UWG; meine Einschätzung, keine Rechtsberatung).

**Ehrlich bleiben, das macht uns sympathisch:** Für die schnelle Frage zwischendurch ist die KI-Suche gut. CraCha gewinnt, wenn es genau sein muss, wenn die Antwort tief in einer Website steckt oder wenn man immer wieder zur selben Website zurückkommt.

---

## 3. Wortwelt

### Wie die anderen klingen (live geprüft am 15.10.2026)

| Anbieter | Hero |
|---|---|
| [Chatbase](https://www.chatbase.co/) | „Conversational agents for customer experience“ |
| [SiteGPT](https://sitegpt.ai/) | „Make AI your expert customer service agent“ |
| [Kapa.ai](https://www.kapa.ai/) | „Turn your company's knowledge into AI agents“ |
| [DocsBot](https://docsbot.ai/) | „Instant Answers & Actions for Customers and Your Team“ |
| [Inkeep](https://inkeep.com/) | „Add AI Teammates to your customer experience team“ |
| [Glean](https://www.glean.com/) | „Complete context that makes AI work at enterprise scale.“ |
| [moinAI](https://www.moin.ai/) | „Die Agentic AI Plattform für digitale Kundenkommunikation“ |

**Muster:** Alle verkaufen einen Bot für die **eigenen Kunden** oder ein Unternehmenswissen-System. Die Wörter wiederholen sich: Agent, Plattform, Enterprise, Knowledge, Instant, Trust. Das klingt austauschbar und nach B2B-Einkauf.

**Unsere Chance:** CraCha ist ein Werkzeug **für dich selbst**, und zwar für Websites, die dir nicht gehören. Dafür passt eine Sprache, die nach Alltag klingt statt nach Plattform: kurz, konkret, mit einem Augenzwinkern.

### Unsere Wörter

| Benutzen | Meiden (oben auf der Seite) |
|---|---|
| fragen, Antwort | Wissensbasis, Index, Datenbank |
| kennt, liest, Unterseite für Unterseite | crawlen (außer im Namen), einlesen, „jede“/„alle“ ohne Zusatz |
| in die Tiefe, genau | RAG, Vektor, Chunks, Hybrid |
| mit Quelle, mit Beleg | „erreichbar“, „bis zu 500“, Credits |
| Link rein | Plattform, Lösung, Enterprise |
| Durchklicken, irgendwo steht's | Agent (im Markt heißt das inzwischen: eine KI, die selbst handelt und in Schleifen sucht) |

**Regel:** Oben stehen Gefühl und Versprechen. Zahlen, Grenzen und Technik gehören in die FAQ und auf die Preisseite.

---

## 4. Die neue Seite: acht Abschnitte, eine Geschichte

| # | Abschnitt | Aufgabe |
|---|---|---|
| 1 | Hero | Versprechen in einem Satz |
| 2 | Problem | „Das kenne ich“ |
| 3 | Unterschied | Warum nicht einfach KI-Suche? |
| 3b | Die Probe | Der Unterschied zum Nachprüfen |
| 4 | So geht's | Drei Wörter, kein Aufwand |
| 5 | Momente | „Das wäre was für mich“ |
| 6 | Beleg | Vertrauen |
| 7 | Preis | Kein Risiko |
| 8 | FAQ und Schluss | Details für Gründliche, letzter Anstoß |

Video, Logo-Leiste und Feature-Raster fallen weg. Das Video kann als Visual in Abschnitt 4 zurückkommen.

---

## 5. Texte

### 1 · Hero

**Variante A (Empfehlung)**
> # Frag nicht das Internet. Frag die Website.
> CraCha liest eine Website vorab, Unterseite für Unterseite, und beantwortet deine Fragen nur daraus. Mit Link zur Stelle, an der es steht.
>
> `[ website.de ]` `Kostenlos testen`  ·  Ohne Kreditkarte. Deine Adresse übernehmen wir nach der Registrierung.

Warum: Der Kontrast zur KI-Suche steckt schon in der Überschrift. Zwei Halbsätze, gleicher Rhythmus, gut merkbar. „Unterseite für Unterseite“ zeigt die Tiefe, ohne Zahl und ohne „alle“. So wirkt CraCha auch nicht wie ein Plugin, das nur den offenen Tab zusammenfasst. Die Zeile unter dem Feld nennt die Registrierung ehrlich, sonst bricht „Link rein“ an der Bestätigungsmail.

**Variante B**
> # Die KI, die eine ganze Website kennt.
> Link rein, CraCha liest die Website Seite für Seite. Danach bekommst du Antworten, für die du dich sonst durch zig Seiten klicken müsstest.

Warum: sehr klar, was es ist. Der Unterschied zur KI-Suche kommt aber erst in Abschnitt 3.

**Variante C**
> # Schluss mit Durchklicken.
> CraCha liest eine Website Unterseite für Unterseite und gibt dir die Antwort mit Quelle, auch von Seiten, die keine Suchmaschine zeigt.

Warum: trifft den Schmerz sofort. Für sich allein sagt die Überschrift aber noch nicht, was CraCha ist.

**Variante D**
> # Jede Unterseite. Eine Antwort.
> Gib eine Website ein. CraCha kennt sich danach dort aus und sagt dir, wo steht, was du suchst.

Warum: kurz und plakativ, gut für Anzeigen und Social. Als Hero etwas kühl.

**Variante E: gestrichen.** „Die ganze Antwort. Nicht nur die halbe.“ sagt ohne Kontext nicht, was das Produkt tut, und verspricht Vollständigkeit allgemein. Das Motiv lebt in 3b weiter.

**Variante F**
> # Wo steht das? Genau hier.
> Link rein, fragen. CraCha antwortet nur aus dieser einen Website und zeigt dir, wo es steht.

Warum: sehr konkret und nah am Alltag. Der Kontrast zur KI-Suche fehlt aber.

**Dachzeile über der H1 (optional, für alle Varianten):** `Crawl + Chat`. Erklärt nebenbei den Namen.

**Idee für den Aufbau:** Statt eines Buttons ein Eingabefeld für die Website-Adresse direkt im Hero. „Link rein“ wird so sichtbar, bevor man einen Satz gelesen hat. Die Adresse wird nach der Registrierung übernommen. Das ist Bauaufwand, aber das stärkste Mittel, damit man es sofort versteht.

### 2 · Problem

> ## Irgendwo steht's. Nur wo?
> Menü, Unterseite, noch eine Unterseite, zurück, Suchfeld, nichts. Die Antwort ist da, irgendwo zwischen hundert Seiten. Du findest sie nur nicht.

Alternative Überschriften: `Die Antwort steht da. Nur nicht da, wo du suchst.` · `Die Info ist da. Du findest sie nur nicht.`

Alternativer Text, konkreter: `Preis, Frist, Bedingung. Die Suche auf der Website findet nichts, Google zeigt dir einen Blogartikel von 2019. Also klickst du dich durch. Irgendwo steht es doch.`

### 3 · Unterschied

> ## Die KI-Suche sucht. CraCha kennt sich aus.
>
> **KI-Suche**
> Geht bei jeder Frage neu ins Netz
> Findet nur, was die Suchmaschine kennt
> Greift ein paar Treffer von irgendwo
> Mal ein Volltreffer, mal nicht
>
> **CraCha**
> Liest die Website einmal vorab, Seite für Seite
> Findet auch verlinkte Seiten, die Google nicht zeigt
> Antwortet nur aus dieser einen Website
> Belegt jede Antwort mit der Quelle
> Bleibt in deinem Konto: Frag morgen weiter, ohne neu zu suchen
>
> *Für die schnelle Frage zwischendurch reicht die KI-Suche. Wenn's genau sein muss, frag CraCha.*

Alternative Überschrift: `Warum nicht einfach Google fragen?` (Frageform holt den Einwand direkt ab.)

Zum Benennen: Die Spalte kann „KI-Suche“ heißen und darunter klein „z. B. Google KI-Modus, ChatGPT, Perplexity“ stehen. Ein sachlicher Vergleich ist erlaubt; anonym ist trotzdem die vorsichtigere Wahl.

### 3b · Die Probe

> ## Eine Zahl findet jede KI. Eine ganze Liste nicht.
> Wir haben eine KI-Suche gebeten, alle [Einträge] auf [Seite] aufzuzählen. Sie nannte [X] und merkte nicht, dass der Rest fehlte. CraCha hatte die Seite gelesen und nannte [Y].
>
> *Probier's selbst: Nimm eine Liste auf einer Website, die du kennst, etwa Team, Preise oder Fristen. Frag eine KI-Suche nach ausnahmslos allen Einträgen und zähl nach.*
>
> <small>Test vom [Datum]. Frage und beide Antworten im Wortlaut: [Test ansehen]. Antworten von KI-Suchen ändern sich.</small>

Platzhalter erst nach dem Neutest füllen (siehe Abschnitt 2). Alternative Überschriften: `Die KI-Suche überfliegt. CraCha liest.` · `Halbe Antworten fallen nicht auf. Bis es zählt.`

Visual: zwei Antworten nebeneinander, ohne Personennamen.

### 4 · So geht's

> ## Link rein. CraCha liest. Du fragst.
>
> **Link rein**: Gib die Adresse der Website ein. Mehr musst du nicht tun.
> **CraCha liest**: CraCha folgt den Links der Website und liest Seite für Seite mit.
> **Du fragst**: Du bekommst die Antwort und den Link zu der Stelle, an der sie steht.

Visual: das Promo-Video oder eine kurze Animation dieser drei Schritte.

### 5 · Momente

> ## Für jede Website, in der du dich sonst verlierst.
>
> **Neuer Kunde?** Versteh seine Website, bevor das Briefing beginnt.
> **Neues Tool?** Frag die Doku, statt sie zu durchforsten.
> **Bewerbung an der Uni?** Zulassung, Fristen, Ansprechpartner: frag einfach die Hochschulseite.
> **Konkurrenz im Blick?** Lies ihre ganze Website, nicht nur die Startseite.
> **Entwurf fertig?** Prüf ihn gegen die Website: Der Content-Check zeigt Widersprüche und veraltete Angaben, mit Quelle.

Jede Karte verlinkt auf ein passendes Beispiel. Geändert: „Module“ ist raus, weil Studien- und Prüfungsordnungen meist PDFs sind. „Eigene Website? Finde Widersprüche“ hat mehr versprochen als der Content-Check kann: Er prüft einen eingefügten Text gegen die Website, er durchsucht die Website nicht von selbst nach Widersprüchen.

### 6 · Beleg

> ## Jede Antwort zeigt, woher sie kommt.
> Ein Klick, und du liest im Original nach. Steht etwas nicht auf der Website, sagt CraCha dir das, statt eine Antwort zu erfinden.

Visual: echter Chat-Ausschnitt mit Antwort und Quellenliste.

### 7 · Preis

> ## Erst testen. Dann entscheiden.
> Du startest mit 100 Credits gratis, ohne Kreditkarte. Danach gibt es Pakete ab 10 €, kein Abo. Eine eingelesene Seite kostet 1 Credit, eine Antwort 5.

Hier sind Zahlen richtig: Wer bis zum Preis scrollt, will es genau wissen. „Du zahlst nur, was du nutzt“ passt nicht zu Prepaid-Paketen. Das steht auch heute als H1 auf `/preise`.
>
> `Preise ansehen`

### 8 · FAQ und Schluss

Hier stehen die genauen Angaben, die oben bewusst fehlen:

- **Ist CraCha ein normaler KI-Chat?** Nein. Eine KI-Suche geht bei jeder Frage neu ins Netz. CraCha liest eine Website vorher komplett und antwortet nur aus ihr, mit Quelle.
- **Welche Websites gehen?** Öffentliche Seiten, die man durch Klicken erreicht oder die in der Sitemap stehen, bis zu 500 pro Durchgang. Nicht: Login-Bereiche, Paywalls, PDFs, Text in Bildern.
- **Darf ich Websites einlesen, die mir nicht gehören?** [Erst nach der robots.txt-Entscheidung formulieren, siehe Abschnitt 2.]
- **Woher kennt CraCha Seiten, die Google nicht zeigt?** CraCha folgt selbst den Links und der Sitemap der Website. Eine Seite muss also nicht bei Google gelistet sein, sie muss nur auf der Website verlinkt sein.
- **Bekomme ich wirklich alles, wenn ich nach einer Liste frage?** Wenn die Liste auf einer oder wenigen Seiten steht, etwa das Team, eine Preisliste oder alle Fristen: ja, so vollständig, wie es dort steht. Bei Fragen quer über hunderte Seiten („alle Artikel zu X“) bekommst du die passendsten Treffer, keine vollständige Liste.
- **Wie aktuell ist das?** So aktuell wie das letzte Einlesen. Ändert sich die Website, liest CraCha sie mit einem Klick neu.
- **Sind die Antworten immer richtig?** Nicht garantiert. Deshalb zeigt jede Antwort ihre Quelle.
- **Kann ich CraCha auf meiner Website einbauen?** Nein. CraCha ist ein Werkzeug für dich, kein Chatbot für Besucher.
- **Was kostet das?** (wie heute: Start-Credits, Pakete, Credits pro Seite und Antwort)

> ## Welche Website willst du fragen?
> `[ Website eingeben ]`  ·  Kostenlos testen

---

## 6. Meta-Daten

- **Titel:** `CraCha – Website mit KI durchsuchen, Unterseite für Unterseite`. Im Titel schlägt der Suchbegriff den Slogan, der Slogan bleibt H1.
- **Beschreibung:** `CraCha liest eine Website vorab, Unterseite für Unterseite, und beantwortet deine Fragen nur daraus, mit Quelle. Kostenlos testen, ohne Kreditkarte.`

---

## 7. Wo wir vereinfachen, und warum das vertretbar ist

| Aussage oben | Genau genommen | Wo die Genauigkeit steht |
|---|---|---|
| „Unterseite für Unterseite“, „Seite für Seite“ | öffentliche, verlinkte HTML-Seiten, bis zu 500 pro Durchgang, standardmäßig zwei Link-Ebenen tief (`DEFAULT_CRAWL_SETTINGS.max_depth: 2`), bis zu fünf einstellbar | FAQ „Welche Websites gehen?“ |
| „auch verlinkte Seiten, die Google nicht zeigt“ | Seiten, die verlinkt oder in der Sitemap sind, aber nicht im Index | FAQ „Woher kennt CraCha …“ |

Bewusst gestrichen: „jede Unterseite“, „alle Unterseiten“ und „merkt sich alles“. Eine Einschränkung in der FAQ heilt kein absolutes Versprechen im Hero. „Unterseite für Unterseite“ transportiert dasselbe Gefühl, ohne angreifbar zu sein.
| „sagt dir das, statt zu raten“ | Das System ist angewiesen, fehlende Antworten zu benennen, eine Garantie gibt es nicht | FAQ „Sind die Antworten immer richtig?“ |

Nicht vereinfachen: Login-Bereiche, interne Dokumente oder PDFs dürfen nirgends angedeutet werden, auch nicht in den Momenten.

---

## 8. Entscheidungen

1. **robots.txt-Standard:** Soll CraCha robots.txt standardmäßig beachten? Heute ist der Standard `false`. Das blockiert die FAQ-Frage „Darf ich fremde Websites einlesen?“ und gehört vor jede Veröffentlichung.
2. **Hero:** A (Empfehlung), B, C, D oder F?
3. **Die Probe (3b):** Mit welcher Seite neu messen? Empfehlung: eine öffentliche, bei Google gelistete Liste ohne Personendaten, beide Systeme am selben Tag, Frage und Antworten im Wortlaut sichern.
4. **Eingabefeld im Hero:** bauen (Empfehlung) oder beim Button bleiben?
5. **Abschnitt 3:** KI-Suchen beim Namen nennen oder anonym lassen?
6. **„Crawl + Chat“ als Dachzeile:** ja oder nein?
7. **Unterseiten** (`/beispiele`, Use-Case-Seiten, Anleitung): danach im selben Ton nachziehen?
