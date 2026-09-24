import { cheapestPackage, maxDatabases, pagesCost, starterPages, starterQuestions, welcomeCredits } from "./facts";
import type { BlogPost } from "./index";

export const crachaVsNotebooklm: BlogPost = {
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
