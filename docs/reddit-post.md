# Reddit-Post: CraCha vorstellen und ehrliches Feedback holen

Stand: 24.09.2026. Ziel ist Feedback und ein paar erste Nutzer, keine Werbung. Die Regeln der Subreddits konnte ich nicht live prüfen, weil Reddit automatische Abrufe blockt. Alles zu einzelnen Subreddits ist deshalb Wissensstand und vor dem Posten selbst zu kontrollieren.

## Welcher Subreddit

| Subreddit | Sprache | Warum | Risiko |
|---|---|---|---|
| **r/de_EDV** (Empfehlung) | Deutsch | Große deutschsprachige IT-Community, technisch versiert, kritisch. Genau das ungeschönte Feedback, das du willst. | Eigenwerbung ist dort womöglich eingeschränkt. Technikleute hinterfragen Datenschutz und robots.txt. |
| r/selbststaendig | Deutsch | Selbstständige, Berater und kleine Agenturen: deine eigentliche Zielgruppe | Wahrscheinlich strengere Werberegeln |
| r/SideProject | Englisch | Ausdrücklich zum Vorstellen eigener Projekte gedacht, freundlich zu Solo-Entwicklern | Die Oberfläche ist nur deutsch, Englischsprachige testen dann eher nicht selbst |

**Vorschlag:** Erst r/de_EDV. Eine Woche später, mit den Erkenntnissen daraus, die englische Fassung in r/SideProject. Nicht am selben Tag in mehreren Subreddits posten, das wirkt wie Spam.

## Vor dem Posten (Checkliste)

1. Im Subreddit die Regeln lesen (Desktop: Seitenleiste rechts, App: „Info“/„About“). Suche nach „Eigenwerbung“, „Self-promotion“, „Werbung“ und nach einem wöchentlichen Sammelthread.
2. Ist Eigenwerbung verboten oder unklar: vorher den Moderatoren schreiben (Link „Message the mods“). Kurz: „Ich bin Solo-Entwickler und würde gern mein Projekt vorstellen, um ehrliches Feedback zu bekommen. Ist das hier erlaubt, und wenn ja, mit welchem Flair?“ Antworten abwarten.
3. Falls der Subreddit Flairs nutzt, das passende auswählen (z. B. „Feedback“, „Projekt“, „Software“).
4. Einmal selbst testen, dass Registrierung, Bestätigungsmail, Einlesen und eine Frage funktionieren. Wichtig bei Supabase im Gratistarif: Ist das Projekt nach Tagen ohne Nutzung pausiert, erst wieder starten.
5. Zeit einplanen: Die ersten zwei bis drei Stunden nach dem Posten zählen. Poste, wenn du danach am Rechner bist und antworten kannst.
6. Während der Post läuft, Sentry (`cracha-web`) und die Credit-Käufe im Blick behalten. Jede neue Anmeldung bekommt 100 Credits, und die kosten dich echte Crawl- und KI-Kosten.

## Eine Entscheidung vorher: robots.txt

CraCha beachtet robots.txt **standardmäßig nicht**, man kann es beim Einlesen einschalten. In r/de_EDV wird das mit hoher Wahrscheinlichkeit jemand ansprechen, und „ignoriert robots.txt“ kommt dort schlecht an.

- **Option A:** Vor dem Post den Standard auf „robots.txt beachten“ umstellen. Ich kann das ändern; dann lassen sich manche Websites schlechter einlesen.
- **Option B:** So lassen und ehrlich begründen (Antwortvorschlag unten).

## Titel (einen auswählen)

1. Ich habe allein ein Tool gebaut, das ganze Websites einliest und Fragen mit Quellenlink beantwortet. Bitte ehrlich zerlegen
2. Hobby-Projekt zwischen NotebookLM und Perplexity: eine Website komplett einlesen und Fragen stellen. Suche ungeschöntes Feedback
3. [Feedback] CraCha: Websites in durchsuchbare Wissensbasen verwandeln – Solo-Projekt, kein neues Konzept, vielleicht trotzdem nützlich

Empfehlung: Titel 2. Er sagt in einem Satz, was es ist, und dass du Kritik willst.

## Post-Text (Deutsch, zum Kopieren)

```markdown
Hi zusammen,

ich bin Nico und baue seit einigen Monaten allein und nebenbei an einem kleinen Projekt namens CraCha. Vorweg ganz ehrlich: Das ist kein neues Konzept. „Chat mit deinen Daten“ gibt es inzwischen überall. Ich glaube nur, dass es für ein paar ganz bestimmte Fälle eine Lücke gibt, und genau dazu hätte ich gern eure ungeschönte Meinung.

**Was CraCha macht, in einfach**

1. Du gibst die Adresse einer Website ein, zum Beispiel eine Produktdokumentation, ein Hilfe-Center oder die Website einer Hochschule.
2. CraCha sucht sich die Unterseiten selbst (über die Sitemap oder die Links auf der Seite) und liest bis zu 500 Seiten ein.
3. Danach stellst du Fragen im Chat. Die Antwort kommt nur aus diesen Seiten, und darunter stehen die Links zu den Originalseiten, damit du selbst nachprüfen kannst.

**Warum nicht einfach NotebookLM oder Perplexity?**

- NotebookLM (heißt inzwischen Gemini Notebook) ist stark für eigene PDFs und Dokumente. Webseiten fügt man dort aber einzeln hinzu. Bei einer Doku mit 200 Unterseiten wird das mühsam, und in der Gratisversion ist bei 50 Quellen Schluss.
- Perplexity und ChatGPT suchen bei jeder Frage neu im ganzen Netz. Für allgemeine Fragen ist das super. Steht die Antwort aber auf Unterseite 147 einer bestimmten Website, taucht die in der Suche nicht immer auf.
- CraCha sitzt irgendwo dazwischen: eine bestimmte Website, vorher komplett eingelesen, jede Antwort mit Quelle.

**Wofür ich es gebaut habe**

- Sich in eine große, fremde Dokumentation einarbeiten
- Als Agentur die Website eines Kunden durchfragen, z. B. „Welche Leistungen werden wo genannt?“
- Eigene Texte gegen eine Website prüfen: Der „Content-Check“ zeigt Widersprüche und veraltete Angaben, etwa alte Preise

**Was es nicht kann**

- Keine PDFs und keine Seiten hinter einem Login
- Kein automatisches Aktualisieren. Ändert sich die Website, liest man sie neu ein
- Die Oberfläche gibt es nur auf Deutsch (Fragen auf Englisch gehen trotzdem)
- Websites mit starkem Bot-Schutz lassen sich teilweise nicht einlesen
- Es ist KI, sie kann sich irren. Genau deshalb hängen an jeder Antwort die Quellen

**Kosten**

Zum Ausprobieren gibt es 100 Credits gratis, ohne Kreditkarte. Das reicht für etwa 20 Seiten und 16 Fragen. Danach gibt es Pakete ab 10 € als einmalige Aufladung, kein Abo. Ich will hier nichts verkaufen, aber Crawling und KI kosten mich pro Nutzung echtes Geld.

**Technik, falls es jemanden interessiert**

Next.js auf Cloudflare Workers, der Crawler läuft mit Crawl4AI auf Modal, die Suche über Cloudflare AI Search, Antworten standardmäßig mit Llama 4 Scout. Alles allein gebaut.

**Was ich von euch wissen will**

- Versteht man innerhalb von 10 Sekunden auf der Startseite, was das Ding macht?
- Hättet ihr einen echten Anwendungsfall dafür, oder löst es ein Problem, das niemand hat?
- Falls ihr es ausprobiert: Welche Website habt ihr eingelesen, und waren die Antworten brauchbar?
- Was hat genervt, was hat nicht funktioniert?

Link: https://cracha-app.com

Danke fürs Lesen. Ich antworte auf alles, Kritik ausdrücklich eingeschlossen.
```

## Englische Fassung für r/SideProject (später)

```markdown
**Title:** Solo side project: read a whole website once, then ask questions with links to the source pages. Looking for honest feedback

Hi, I'm Nico, a solo hobby developer from Germany. Honest disclaimer first: this is not a new idea. "Chat with your data" is everywhere. I just think there is a small gap for some specific use cases, and I'd love blunt feedback on whether that's true.

**What it does**
1. You enter the address of a website, e.g. product docs, a help center or a university site.
2. CraCha finds the subpages itself (sitemap or internal links) and reads up to 500 pages.
3. You ask questions. Answers come only from those pages, and every answer links to the original pages so you can check.

**Why not NotebookLM or Perplexity?**
NotebookLM (now Gemini Notebook) is great for your own files, but web sources are added one URL at a time, and the free version stops at 50 sources. Perplexity and ChatGPT search the whole web on every question, which is great for general questions but can miss page 147 of one specific site. CraCha sits in between: one site, read completely, every answer with sources.

**Limits:** no PDFs, nothing behind a login, no automatic refresh, UI is German only (questions in English work), sites with heavy bot protection may fail, and it's AI, so it can be wrong. That's why every answer has sources.

**Pricing:** 100 free credits without a card (about 20 pages + 16 questions), then one-time packs from €10, no subscription.

**Stack:** Next.js on Cloudflare Workers, Crawl4AI on Modal, Cloudflare AI Search, Llama 4 Scout by default.

What I'd love to know: Is it clear within 10 seconds what it does? Would you have a real use case? If you try it, which site did you use and were the answers useful?

https://cracha-app.com
```

## Bild zum Post

Ein Bild erhöht die Chance, dass jemand anhält. Wenn der Subreddit Bilder in Textposts erlaubt: ein Screenshot vom Chat mit einer Antwort und den sichtbaren Quellenlinks darunter. Eine echte, öffentliche Website verwenden und die eigene E-Mail-Adresse ausblenden. Alternative: das 33-Sekunden-Video von der Startseite als GIF oder Video.

## Antworten auf wahrscheinliche Kritik

Ehrlich, kurz und ohne Verteidigungshaltung. Danke sagen, auch wenn es wehtut.

**„Das ist doch nur ein ChatGPT-Wrapper.“**
> Die KI selbst ist nicht von mir, das stimmt. Die Arbeit steckt vor allem im Einlesen: Unterseiten finden, JavaScript-Seiten rendern, Navigation und Müll rausfiltern, und in Quellen, die man nachprüfen kann. Ob das als Mehrwert reicht, will ich gerade herausfinden. Deshalb der Post.

**„Ignoriert das robots.txt?“** (nur relevant bei Option B)
> Standardmäßig ja, beim Einlesen lässt es sich einschalten. Eingelesen werden nur öffentlich erreichbare Seiten, der Index ist nur für die Person sichtbar, die ihn angelegt hat, und nichts wird weiterveröffentlicht. Ich sehe aber den Punkt und überlege, den Standard umzudrehen. Wie seht ihr das?

**„Wo landen meine Daten?“**
> Gehostet auf Cloudflare, Konten bei Supabase (EU-Region Frankfurt), Crawling auf Modal. Die Fragen gehen an das KI-Modell (standardmäßig Llama 4 Scout über Cloudflare Workers AI, optional Gemini). Der Chatverlauf wird nur lokal in deinem Browser gespeichert, das Logging von Fragen und Antworten am KI-Gateway ist aus. Details: https://cracha-app.com/datenschutz

**„Warum nicht kostenlos oder Open Source?“**
> Jede eingelesene Seite und jede Antwort kostet mich Server- und KI-Gebühren. Die 100 Gratis-Credits sollen zum ehrlichen Ausprobieren reichen. Deshalb auch kein Abo: Man zahlt nur, was man nutzt.

**„Kann ich das als Chatbot auf meiner eigenen Website einbauen?“**
> Nein, im Moment nicht. CraCha ist ein Recherche-Werkzeug im eigenen Konto. Wenn mehrere danach fragen, ist das aber ein starkes Signal. Wofür bräuchtest du es?

**„Darf man fremde Websites einfach einlesen?“**
> Nur öffentlich erreichbare Seiten, und die Wissensbasis sieht nur, wer sie angelegt hat. Für den konkreten Inhalt und Zweck ist die nutzende Person verantwortlich, das steht auch in den Nutzungsbedingungen.

**„Hat bei mir nicht funktioniert.“**
> Danke! Welche Website war das? Dann schaue ich mir genau diesen Fall an.

## Danach

- Jede Rückmeldung notieren: wer, welche Website, was hat geklappt, was nicht.
- Wiederkehrende Kritik ist wertvoller als Einzelmeinungen. Wenn drei Leute dasselbe nicht verstehen, ist das der nächste Umbau.
- Wer CraCha wirklich nutzt, kann später um eine Bewertung auf OMR Reviews gebeten werden.
- Keine Upvotes organisieren und nicht mit Zweitkonten kommentieren. Reddit erkennt und bestraft das.
