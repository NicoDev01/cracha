import { cheapestPackage, cheapestPackageEn, maxDatabases, pagesCost, starterPages, starterQuestions, welcomeCredits } from "./facts";
import { bilingual } from "@/i18n/copy";
import type { BlogPost } from "./index";

const de: BlogPost = {
  slug: "cracha-vs-notebooklm",
  title: "CraCha vs. NotebookLM (Gemini Notebook): Welches Tool für ganze Websites?",
  description:
    "NotebookLM heißt jetzt Gemini Notebook. Wie gut kommt es mit einer Website aus vielen Unterseiten zurecht, und wann ist CraCha die bessere Wahl?",
  published: "2026-09-24",
  keywords: ["CraCha vs NotebookLM", "NotebookLM Alternative", "Gemini Notebook Website", "NotebookLM Website hinzufügen", "NotebookLM Quellen Limit"],
  body: `
*Stand: 24. September 2026. Funktionen und Limits anderer Anbieter ändern sich. Die Angaben unten stammen aus deren Hilfeseiten und sind am Ende verlinkt.*

## Kurz gesagt

- **Gemini Notebook** (bis Juli 2026 NotebookLM) ist stark, wenn du mit **eigenen Dokumenten** arbeitest: PDFs, Google Docs, YouTube-Videos, Audiodateien, einzelne Webseiten.
- **CraCha** ist dafür gebaut, eine **ganze Website** einzulesen: Du gibst eine Start-Adresse ein, CraCha findet die Unterseiten selbst.
- Geht es um eine Dokumentation, ein Hilfe-Center oder eine Firmenwebsite mit Dutzenden oder Hunderten Seiten, sparst du dir mit CraCha das Hinzufügen jeder einzelnen Adresse.

## Erst einmal: NotebookLM heißt jetzt Gemini Notebook

Google hat NotebookLM am 16. Juli 2026 in **Gemini Notebook** umbenannt. Es bleibt ein eigenständiges Produkt, bestehende Notizbücher und Links funktionieren weiter. In diesem Artikel verwenden wir den neuen Namen. Gemeint ist dasselbe Werkzeug.

## Der entscheidende Unterschied: eine Seite oder die ganze Website

In Gemini Notebook ist jede Quelle ein einzelnes Element: eine Datei, ein Video, ein eingefügter Text oder eine Webadresse. Laut Googles Hilfe übernimmt eine Web-Quelle **nur den Text der angegebenen Seite**. Bilder, eingebettete Videos und **verlinkte Unterseiten werden nicht importiert**. Seiten hinter einer Paywall funktionieren nicht.

Für eine einzelne Seite ist das genau richtig. Willst du aber eine Dokumentation mit 150 Seiten befragen, musst du 150 Adressen einzeln hinzufügen. In der kostenlosen Version sind höchstens 50 Quellen pro Notizbuch möglich, mehr gibt es erst in den bezahlten Google-AI-Tarifen.

CraCha geht den umgekehrten Weg. Du gibst **eine** Start-Adresse ein. CraCha nutzt die Sitemap der Website oder folgt den internen Links bis zu fünf Ebenen tief und liest bis zu 500 Seiten pro Durchgang ein. Das Ergebnis ist eine Wissensbasis in deinem Konto, der du danach Fragen stellst.

## Vergleich auf einen Blick

| Kriterium | Gemini Notebook | CraCha |
|---|---|---|
| Wie kommen Inhalte hinein? | Quellen einzeln hinzufügen: Dateien, Texte, Videos, einzelne Webseiten | Start-Adresse eingeben, Unterseiten werden automatisch gefunden |
| Website mit vielen Unterseiten | Jede Seite ist eine eigene Quelle | Bis zu 500 Seiten pro Einlesevorgang |
| Wie viele Quellen? | 50 pro Notizbuch in der kostenlosen Version, mehr in bezahlten Tarifen | Bis zu ${maxDatabases} Wissensbasen je Konto, jede mit bis zu 500 Seiten pro Einlesevorgang |
| PDFs, eigene Dateien, YouTube | Ja | Nein, nur öffentlich erreichbare HTML-Seiten |
| Quellen in der Antwort | Verweise auf die Stellen in deinen Quellen | Links zu den Originalseiten der Website |
| Kosten | Kostenlos nutzbar, höhere Limits im Google-AI-Abo | ${welcomeCredits} Start-Credits gratis, danach Pakete ab ${cheapestPackage} ohne Abo |

## Ein Beispiel aus der Praxis

Angenommen, du arbeitest dich in die Dokumentation eines Tools ein, sagen wir 200 Seiten zwischen Einstieg, API-Referenz und Migrationshinweisen.

**Mit Gemini Notebook** suchst du die relevanten Seiten heraus und fügst jede Adresse einzeln hinzu. In der kostenlosen Version ist nach 50 Seiten Schluss, du musst also vorher auswählen. Verpasst du dabei die Seite mit der Antwort, kann das Notizbuch sie auch nicht finden.

**Mit CraCha** trägst du die Start-Adresse der Dokumentation ein, zum Beispiel \`https://docs.beispiel.de/\`, und beschränkst das Einlesen bei Bedarf mit einem Muster auf \`/docs/\`. 200 eingelesene Seiten kosten ${pagesCost(200)} Credits. Danach fragst du zum Beispiel: *„Welche Breaking Changes nennt der Migrationsleitfaden für Version 3?“* Die Antwort verlinkt die Seiten, auf die sie sich stützt.

## Wann Gemini Notebook die bessere Wahl ist

- Deine Quellen sind **eigene Dateien**: PDFs, Präsentationen, Google Docs, Tabellen.
- Du willst **verschiedene Formate** mischen, etwa ein YouTube-Video, ein Paper und ein paar Artikel.
- Dir reichen **wenige einzelne Webseiten**.
- Du brauchst Funktionen wie Audio-Zusammenfassungen oder arbeitest ohnehin im Google-Ökosystem.
- Du möchtest zu einem Thema neue Quellen finden. Gemini Notebook kann mit der Funktion „Discover sources“ bis zu zehn passende Webseiten vorschlagen. Das ist eine Suche nach einzelnen Treffern, kein vollständiges Einlesen einer Website.

## Wann CraCha die bessere Wahl ist

- Die Antworten stecken in **einer bestimmten Website** mit vielen Unterseiten, etwa einer Produktdokumentation, einem Hilfe-Center oder der Website eines Kunden.
- Du willst **nicht jede Seite einzeln heraussuchen**, sondern die Website als Ganzes befragen.
- Jede Antwort soll direkt auf die **Originalseite** verlinken, damit du sie prüfen kannst.
- Du stellst **wiederholt Fragen** zu derselben Website. Die Wissensbasis bleibt in deinem Konto; ändert sich die Website, liest du sie neu ein.
- Du willst einen **eigenen Text gegen die Website prüfen**, etwa einen Entwurf, eine Preisliste oder ein Angebot. Der Content-Check im Chat zeigt Widersprüche und veraltete Angaben mit Quelle.

## Was CraCha nicht kann

Damit der Vergleich fair bleibt: CraCha liest nur öffentlich erreichbare HTML-Seiten ein. PDFs, Login-Bereiche und eigene Datei-Uploads werden nicht unterstützt. Wie viele Seiten CraCha erreicht, hängt von Verlinkung, Sitemap und technischen Sperren der Website ab. Und wie bei jedem KI-Werkzeug können Antworten unvollständig oder falsch sein. Deshalb gibt es zu jeder Antwort die Quellenlinks.

## Fazit

Die beiden Werkzeuge lösen unterschiedliche Aufgaben. Gemini Notebook ist ein Notizbuch für Quellen, die du selbst zusammenstellst. CraCha verwandelt eine komplette Website in eine Wissensbasis. Willst du vor allem Websites mit vielen Unterseiten befragen, probier CraCha mit einem überschaubaren Bereich aus: Mit den ${welcomeCredits} Start-Credits liest du zum Beispiel ${starterPages} Seiten ein und stellst danach ${starterQuestions} Fragen.

## Quellen

- [Google: NotebookLM is now Gemini Notebook](https://blog.google/innovation-and-ai/products/gemini-notebook/notebooklm-gemini-notebook/) (16. Juli 2026)
- [Google-Hilfe: Quellen in Gemini Notebook hinzufügen und Limits](https://support.google.com/notebooklm/answer/16215270)
- [Google: Discover sources in NotebookLM](https://blog.google/innovation-and-ai/models-and-research/google-labs/notebooklm-discover-sources/)
`,
};

const en: BlogPost = {
  slug: "cracha-vs-notebooklm",
  title: "CraCha vs. NotebookLM (Gemini Notebook): which tool for entire websites?",
  description:
    "NotebookLM is now called Gemini Notebook. How well does it handle a website with many subpages, and when is CraCha the better choice?",
  published: "2026-09-24",
  keywords: ["CraCha vs NotebookLM", "NotebookLM alternative", "Gemini Notebook website", "NotebookLM add website", "NotebookLM source limit"],
  body: `
*As of September 24, 2026. Other providers’ features and limits change. The details below come from their help pages, linked at the end.*

## In short

- **Gemini Notebook** (NotebookLM until July 2026) is strong when you work with **your own documents**: PDFs, Google Docs, YouTube videos, audio files, single web pages.
- **CraCha** is built to read an **entire website**: you enter a start address and CraCha finds the subpages itself.
- For documentation, a help center or a company website with dozens or hundreds of pages, CraCha saves you from adding every single address.

## First of all: NotebookLM is now Gemini Notebook

Google renamed NotebookLM to **Gemini Notebook** on July 16, 2026. It remains a standalone product; existing notebooks and links keep working. This article uses the new name. It’s the same tool.

## The key difference: one page or the whole website

In Gemini Notebook every source is a single item: a file, a video, pasted text or a web address. According to Google’s help, a web source imports **only the text of the given page**. Images, embedded videos and **linked subpages are not imported**. Pages behind a paywall don’t work.

For a single page that’s exactly right. But if you want to question documentation with 150 pages, you have to add 150 addresses one by one. The free version allows at most 50 sources per notebook; more are only available in the paid Google AI plans.

CraCha takes the opposite route. You enter **one** start address. CraCha uses the website’s sitemap or follows the internal links up to five levels deep and reads up to 500 pages per run. The result is a knowledge base in your account that you then ask questions.

## Comparison at a glance

| Criterion | Gemini Notebook | CraCha |
|---|---|---|
| How does content get in? | Add sources one by one: files, text, videos, single web pages | Enter a start address, subpages are found automatically |
| Website with many subpages | Every page is its own source | Up to 500 pages per run |
| How many sources? | 50 per notebook in the free version, more in paid plans | Up to ${maxDatabases} knowledge bases per account, each with up to 500 pages per run |
| PDFs, your own files, YouTube | Yes | No, only publicly accessible HTML pages |
| Sources in the answer | References to passages in your sources | Links to the website’s original pages |
| Cost | Free to use, higher limits with a Google AI subscription | ${welcomeCredits} free credits, then packs from ${cheapestPackageEn}, no subscription |

## A practical example

Say you’re getting into a tool’s documentation – 200 pages between getting started, API reference and migration notes.

**With Gemini Notebook** you pick out the relevant pages and add each address one by one. In the free version you stop at 50 pages, so you have to choose in advance. If you miss the page with the answer, the notebook can’t find it either.

**With CraCha** you enter the documentation’s start address, for example \`https://docs.example.com/\`, and limit reading to \`/docs/\` with a pattern if needed. 200 pages read cost ${pagesCost(200)} credits. Then you ask, for example: *“Which breaking changes does the migration guide list for version 3?”* The answer links the pages it is based on.

## When Gemini Notebook is the better choice

- Your sources are **your own files**: PDFs, presentations, Google Docs, spreadsheets.
- You want to **mix formats**, such as a YouTube video, a paper and a few articles.
- **A few single web pages** are enough for you.
- You need features like audio overviews or already work in the Google ecosystem.
- You want to find new sources on a topic. Gemini Notebook can suggest up to ten matching web pages with “Discover sources”. That’s a search for individual results, not a full read of a website.

## When CraCha is the better choice

- The answers are on **one specific website** with many subpages, such as product documentation, a help center or a client’s website.
- You **don’t want to hunt down every page individually** but question the website as a whole.
- Every answer should link directly to the **original page** so you can check it.
- You ask **questions repeatedly** about the same website. The knowledge base stays in your account; if the website changes, you read it again.
- You want to **check your own text against the website**, such as a draft, a price list or a proposal. The Content Check in the chat shows contradictions and outdated details with sources.

## What CraCha can’t do

To keep the comparison fair: CraCha only reads publicly accessible HTML pages. PDFs, login areas and uploading your own files are not supported. How many pages CraCha reaches depends on the website’s links, sitemap and technical blocks. And as with any AI tool, answers can be incomplete or wrong. That’s why every answer comes with source links.

## Conclusion

The two tools solve different tasks. Gemini Notebook is a notebook for sources you put together yourself. CraCha turns an entire website into a knowledge base. If you mainly want to question websites with many subpages, try CraCha with a manageable section: with the ${welcomeCredits} free credits you can, for example, read ${starterPages} pages and then ask ${starterQuestions} questions.

## Sources

- [Google: NotebookLM is now Gemini Notebook](https://blog.google/innovation-and-ai/products/gemini-notebook/notebooklm-gemini-notebook/) (July 16, 2026)
- [Google Help: Add sources to Gemini Notebook and limits](https://support.google.com/notebooklm/answer/16215270)
- [Google: Discover sources in NotebookLM](https://blog.google/innovation-and-ai/models-and-research/google-labs/notebooklm-discover-sources/)
`,
};

export const crachaVsNotebooklm = bilingual(de, en);
