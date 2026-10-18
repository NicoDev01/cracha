import { cheapestPackage, cheapestPackageEn, starterPages, starterQuestions, welcomeCredits } from "./facts";
import { bilingual } from "@/i18n/copy";
import type { BlogPost } from "./index";

const de: BlogPost = {
  slug: "cracha-vs-chatgpt-perplexity",
  title: "Website mit KI durchsuchen: CraCha vs. ChatGPT und Perplexity",
  description:
    "ChatGPT und Perplexity suchen bei jeder Frage neu im Netz, CraCha liest eine Website vorab ein. Was das für Antworten aus großen Websites bedeutet.",
  published: "2026-09-24",
  keywords: ["CraCha vs ChatGPT", "Perplexity Alternative", "Website mit KI durchsuchen", "ChatGPT Website durchsuchen", "Fragen an eine Website stellen"],
  body: `
*Stand: 24. September 2026. Funktionen anderer Anbieter ändern sich schnell. Die Quellen stehen am Ende des Artikels.*

## Kurz gesagt

- **ChatGPT und Perplexity** beantworten Fragen mit einer **Live-Suche im Netz**. Das ist ideal für offene Fragen quer durch viele Websites.
- **CraCha** liest **eine bestimmte Website vollständig ein** und beantwortet deine Fragen nur aus diesen Seiten, jeweils mit Link zur Originalseite.
- Suchst du etwas, das irgendwo auf einer großen Website steht, findet eine eigene Wissensbasis auch Unterseiten, die eine allgemeine Websuche weit hinten einsortiert.

## Zwei Ansätze: Live-Suche oder eigene Wissensbasis

Stellst du ChatGPT mit Websuche oder Perplexity eine Frage, sucht das System in diesem Moment im Netz, wählt einige Treffer aus und formuliert daraus eine Antwort. Welche Seiten dabei gefunden werden, hängt vom Suchindex und von deiner Formulierung ab. Das ist flexibel, bedeutet aber auch: Eine Unterseite, die in der Suche weit hinten steht, taucht in der Antwort vielleicht nie auf.

CraCha dreht das um. Du legst vorher fest, **welche Website** die Grundlage sein soll. CraCha findet deren Unterseiten über die Sitemap oder die interne Verlinkung, liest bis zu 500 Seiten pro Durchgang ein und speichert sie als Wissensbasis. Jede Frage wird danach genau in diesen Inhalten gesucht, auch auf Seiten, die eine Suchmaschine kaum zeigt.

## Und was ist mit Projekten in ChatGPT und Perplexity?

Beide bieten Arbeitsbereiche, in denen Kontext erhalten bleibt:

- **ChatGPT-Projekte** bündeln Chats, Dateien und Anweisungen. Seit Februar 2026 lassen sich dort auch Links etwa zu Slack-Kanälen oder Google-Drive-Dateien und eingefügte Texte als Quellen hinterlegen. Bei der ausführlichen Recherche (Deep Research) kannst du die Suche auf bestimmte Websites beschränken.
- **Perplexity-Projekte** (bis Ende Juli 2026 „Spaces“) speichern Dateien, Anweisungen und Links, die jede Suche im Projekt als Kontext nutzt.

Das hilft, wenn du mit eigenen Dateien oder wenigen ausgewählten Seiten arbeitest. Eine Funktion, die eine komplette Website mit all ihren Unterseiten einliest und dauerhaft durchsuchbar macht, beschreiben die Hilfeseiten beider Anbieter nicht.

## Vergleich auf einen Blick

| Kriterium | ChatGPT und Perplexity | CraCha |
|---|---|---|
| Woher kommen die Antworten? | Live-Suche im Netz, dazu eigene Dateien im Projekt | Nur aus der Website, die du eingelesen hast |
| Große Website mit vielen Unterseiten | Hängt davon ab, welche Seiten die Suche findet | Unterseiten werden vorher eingelesen, bis zu 500 pro Durchgang |
| Fragen quer durchs ganze Internet | Ja, dafür sind sie gemacht | Nein |
| Aktuelle Nachrichten | Ja | Nein, CraCha kennt den Stand des letzten Einlesens |
| Quellen in der Antwort | Links zu gefundenen Webseiten | Links zu den Originalseiten der eingelesenen Website |
| Kosten | Kostenlose Stufen, mehr im Abo | ${welcomeCredits} Start-Credits gratis, danach Pakete ab ${cheapestPackage} ohne Abo |

## Wann ChatGPT oder Perplexity die bessere Wahl ist

- Deine Frage betrifft **viele verschiedene Websites**, etwa ein Marktüberblick oder ein Vergleich mehrerer Anbieter.
- Du brauchst **aktuelle Informationen** wie Nachrichten oder Preise von heute.
- Du willst **eigene Dateien** analysieren, schreiben lassen oder Ideen entwickeln.

## Wann CraCha die bessere Wahl ist

- Die Antwort steht **auf einer bestimmten Website**, zum Beispiel in einer Produktdokumentation, einem Hilfe-Center, auf der Website eines Kunden oder einer Hochschule.
- Die Website hat **so viele Unterseiten**, dass du die richtige Stelle über die Suche nicht zuverlässig findest.
- Die Antwort soll sich **nur auf diese Quelle** stützen, nicht auf irgendein Forum. CraCha antwortet ausschließlich aus den eingelesenen Seiten und sagt es, wenn sie die Antwort nicht enthalten.
- Du stellst **immer wieder Fragen** zu derselben Website. Die Wissensbasis bleibt in deinem Konto.
- Du willst einen **eigenen Text gegen die Website prüfen**, etwa einen Entwurf oder eine Preisliste. Der Content-Check im Chat zeigt Widersprüche und veraltete Angaben mit Quelle.

## Ein kostenloser Tipp für einzelne Fragen

Hast du nur eine einzige Frage zu einer Website, brauchst du kein neues Werkzeug. Gib in Google \`site:beispiel.de\` gefolgt von deinem Suchbegriff ein, dann durchsucht Google nur diese Domain. Für wiederkehrende Fragen, zusammenhängende Antworten über mehrere Seiten hinweg oder Fragen auf Deutsch zu einer englischen Website lohnt sich dagegen eine eigene Wissensbasis.

## Was CraCha nicht kann

CraCha liest nur öffentlich erreichbare HTML-Seiten ein, keine PDFs und keine Bereiche hinter einem Login. Es durchsucht nicht das ganze Internet und aktualisiert eine Wissensbasis nicht automatisch. Ändert sich die Website, liest du sie neu ein. Auch Antworten mit Quellen können unvollständig oder falsch sein. Deshalb verlinkt jede Antwort die Seiten, auf die sie sich stützt.

## Fazit

ChatGPT und Perplexity sind Generalisten für das ganze Netz. CraCha ist ein Spezialwerkzeug für **eine** Website, die du gründlich befragen willst. Probier es mit einer Website aus, in der du regelmäßig etwas suchst: Mit den ${welcomeCredits} Start-Credits liest du zum Beispiel ${starterPages} Seiten ein und stellst danach ${starterQuestions} Fragen.

## Quellen

- [OpenAI-Hilfe: Projects in ChatGPT](https://help.openai.com/en/articles/10169521-projects-in-chatgpt)
- [General Purpose: ChatGPT Projects Can Now Pull In Sources From Everywhere](https://www.generalpurpose.com/the-distillation/chatgpt-projects-knowledge-base) (27. Februar 2026)
- [Perplexity: Spaces are now Projects](https://www.perplexity.ai/hub/blog/spaces-are-now-projects)
- [Perplexity-Hilfe: What are Projects?](https://www.perplexity.ai/help-center/en/articles/10352961-what-are-spaces)
`,
};

const en: BlogPost = {
  slug: "cracha-vs-chatgpt-perplexity",
  title: "Search a website with AI: CraCha vs. ChatGPT and Perplexity",
  description:
    "ChatGPT and Perplexity search the web anew for every question; CraCha reads a website beforehand. What that means for answers from large websites.",
  published: "2026-09-24",
  keywords: ["CraCha vs ChatGPT", "Perplexity alternative", "search a website with AI", "ChatGPT search website", "ask questions about a website"],
  body: `
*As of September 24, 2026. Other providers’ features change quickly. Sources are listed at the end of the article.*

## In short

- **ChatGPT and Perplexity** answer questions with a **live web search**. That’s ideal for open questions across many websites.
- **CraCha** reads **one specific website in full** and answers your questions only from those pages, each with a link to the original page.
- If you’re looking for something that sits somewhere on a large website, a knowledge base of your own also finds subpages that a general web search ranks far down.

## Two approaches: live search or your own knowledge base

When you ask ChatGPT with search or Perplexity a question, the system searches the web at that moment, picks a few results and writes an answer from them. Which pages it finds depends on the search index and on how you phrase the question. That’s flexible, but it also means a subpage ranked far down may never show up in the answer.

CraCha turns this around. You decide beforehand **which website** should be the basis. CraCha finds its subpages via the sitemap or the internal links, reads up to 500 pages per run and stores them as a knowledge base. Every question is then searched in exactly that content, including pages a search engine hardly shows.

## What about projects in ChatGPT and Perplexity?

Both offer workspaces that keep context:

- **ChatGPT projects** bundle chats, files and instructions. Since February 2026 you can also add links, for example to Slack channels or Google Drive files, and pasted text as sources. In the in-depth research mode (Deep Research) you can limit the search to specific websites.
- **Perplexity projects** (called “Spaces” until the end of July 2026) store files, instructions and links that every search in the project uses as context.

That helps when you work with your own files or a few selected pages. A feature that reads an entire website with all its subpages and keeps it searchable is not described in either provider’s help pages.

## Comparison at a glance

| Criterion | ChatGPT and Perplexity | CraCha |
|---|---|---|
| Where do the answers come from? | Live web search, plus your own files in a project | Only from the website you read |
| Large website with many subpages | Depends on which pages the search finds | Subpages are read beforehand, up to 500 per run |
| Questions across the whole internet | Yes, that’s what they’re made for | No |
| Current news | Yes | No, CraCha knows the state of its last read |
| Sources in the answer | Links to web pages found | Links to the original pages of the website read |
| Cost | Free tiers, more with a subscription | ${welcomeCredits} free credits, then packs from ${cheapestPackageEn}, no subscription |

## When ChatGPT or Perplexity is the better choice

- Your question concerns **many different websites**, such as a market overview or a comparison of several providers.
- You need **current information** such as today’s news or prices.
- You want to analyze **your own files**, have something written or develop ideas.

## When CraCha is the better choice

- The answer is **on one specific website**, for example in product documentation, a help center, a client’s website or a university website.
- The website has **so many subpages** that you can’t reliably find the right spot with search.
- The answer should rely **only on that source**, not on some forum. CraCha answers exclusively from the pages read and tells you when they don’t contain the answer.
- You ask **questions again and again** about the same website. The knowledge base stays in your account.
- You want to **check your own text against the website**, such as a draft or a price list. The Content Check in the chat shows contradictions and outdated details with sources.

## A free tip for single questions

If you only have one question about a website, you don’t need a new tool. Type \`site:example.com\` followed by your search term into Google, and Google searches only that domain. For recurring questions, answers that span several pages, or questions in your language about a website in another one, a knowledge base of your own pays off.

## What CraCha can’t do

CraCha only reads publicly accessible HTML pages, no PDFs and no areas behind a login. It doesn’t search the whole internet and doesn’t update a knowledge base automatically. If the website changes, you read it again. Even answers with sources can be incomplete or wrong. That’s why every answer links the pages it is based on.

## Conclusion

ChatGPT and Perplexity are generalists for the whole web. CraCha is a specialist tool for **one** website you want to question thoroughly. Try it with a website you regularly search: with the ${welcomeCredits} free credits you can, for example, read ${starterPages} pages and then ask ${starterQuestions} questions.

## Sources

- [OpenAI Help: Projects in ChatGPT](https://help.openai.com/en/articles/10169521-projects-in-chatgpt)
- [General Purpose: ChatGPT Projects Can Now Pull In Sources From Everywhere](https://www.generalpurpose.com/the-distillation/chatgpt-projects-knowledge-base) (February 27, 2026)
- [Perplexity: Spaces are now Projects](https://www.perplexity.ai/hub/blog/spaces-are-now-projects)
- [Perplexity Help: What are Projects?](https://www.perplexity.ai/help-center/en/articles/10352961-what-are-spaces)
`,
};

export const crachaVsChatgptPerplexity = bilingual(de, en);
