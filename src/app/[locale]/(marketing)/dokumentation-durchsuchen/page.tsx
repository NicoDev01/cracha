import { setRequestLocale } from "next-intl/server";

import { UseCasePage, type UseCaseContent } from "@/components/landing/use-case-page";
import { bilingual, formatNumber } from "@/i18n/copy";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { CREDITS, CREDIT_PACKAGES } from "@/lib/credit-tariff";
import { marketingPageMetadata } from "@/lib/marketing/page-metadata";

const maxPagesPerCrawl = 500;
const largestPack = CREDIT_PACKAGES[CREDIT_PACKAGES.length - 1];
const largestPackAnswers = Math.floor((largestPack.credits - maxPagesPerCrawl * CREDITS.perPage) / CREDITS.perChatMessage);
const starterAnswers = Math.floor((CREDITS.welcome - 20 * CREDITS.perPage) / CREDITS.perChatMessage);

const meta = bilingual(
  {
    title: "Dokumentation mit KI durchsuchen: Chat mit Quellenlinks",
    description:
      "Für Entwickler: Lies große Dokumentationen mit CraCha ein und stell deine Fragen auf Deutsch. Jede Antwort verlinkt die passende Doku-Seite. 100 Start-Credits ohne Kreditkarte.",
    keywords: ["Dokumentation durchsuchen KI", "mit Dokumentation chatten", "API Doku KI", "Developer Docs Chat", "Dokumentation Fragen stellen"],
    other: "Du willst eher die Website eines Kunden befragen?",
    otherLink: "Kundenwebsite mit KI durchsuchen",
  },
  {
    title: "Search documentation with AI: chat with source links",
    description:
      "For developers: read large documentation with CraCha and ask your questions in plain language. Every answer links the right docs page. 100 free credits, no credit card.",
    keywords: ["search documentation with AI", "chat with documentation", "API docs AI", "developer docs chat", "ask questions about docs"],
    other: "Want to question a client’s website instead?",
    otherLink: "Search a client website with AI",
  },
);

const content = (locale: Locale) =>
  bilingual<UseCaseContent>(
    {
      eyebrow: "Für Entwicklerinnen und Entwickler",
      heading: "Große Dokumentationen durchsuchen – mit Link zur richtigen Doku-Seite",
      intro:
        "Die Antwort steht irgendwo zwischen API-Referenz, Guides und Migrationshinweisen. Lies die Dokumentation einmal mit CraCha ein und frag direkt: Wie konfiguriere ich das? Worin unterscheiden sich diese beiden Methoden? Jede Antwort verlinkt die Doku-Seiten, aus denen sie stammt – du springst direkt an die richtige Stelle.",
      benefits: [
        { title: "Direkt zur richtigen Seite", text: "CraCha sucht nach Bedeutung und nach exakten Begriffen wie Funktions- oder Optionsnamen. Statt dich durch Sidebar und Suchergebnisse zu klicken, bekommst du eine Antwort mit Links zu den Doku-Seiten, auf die sie sich stützt." },
        { title: "Codebeispiele bleiben erhalten", text: "Codeblöcke aus der Dokumentation werden beim Einlesen unverändert übernommen, damit Antworten sich auf den tatsächlichen Code der Doku beziehen können." },
        { title: "Fragen auf Deutsch", text: "Viele Dokumentationen sind englisch. Deine Fragen kannst du trotzdem auf Deutsch stellen." },
        { title: "Deine Referenz, dauerhaft", text: `Die Wissensbasis bleibt in deinem Konto. Bis zu ${CREDITS.maxDatabases} Wissensbasen je Konto, etwa eine pro Framework oder Bibliothek.` },
      ],
      exampleQuestions: [
        "Wie authentifiziere ich mich laut Dokumentation bei der API von [Dienst]? Verlinke die relevanten Seiten.",
        "Welche Konfigurationsoptionen gibt es für [Feature], und welche Standardwerte nennt die Doku?",
        "Was ist der Unterschied zwischen [Methode A] und [Methode B]?",
        "Welche Breaking Changes nennt der Migrationsleitfaden für Version [X]?",
      ],
      steps: [
        { title: "Kostenlos registrieren.", text: `Konto anlegen und E-Mail-Adresse bestätigen. Du startest mit ${CREDITS.welcome} Credits, eine Kreditkarte brauchst du nicht.` },
        { title: "Doku-Adresse eintragen.", text: "Gib im Dashboard die Start-Adresse der Dokumentation ein. Nutze die Sitemap oder lass CraCha verlinkten Seiten bis zu fünf Ebenen tief folgen. Mit Mustern beschränkst du das Einlesen auf den Bereich, den du brauchst, etwa /docs/." },
        { title: "Einlesen lassen.", text: "Im Dashboard siehst du den Fortschritt. Sobald die Wissensbasis bereit ist, kannst du fragen." },
        { title: "Fragen und nachlesen.", text: "Stell deine Frage im Chat und öffne über die Quellenlinks die passende Doku-Seite." },
      ],
      limits: [
        `Pro Einlesevorgang sind bis zu ${maxPagesPerCrawl} Seiten möglich. Bei sehr großen Dokumentationen beschränkst du dich am besten auf die Bereiche, die du wirklich brauchst.`,
        "Nur öffentlich erreichbare HTML-Seiten: interne Dokumentation hinter einem Login, private Repositories und PDF-Dateien werden nicht eingelesen.",
        "CraCha arbeitet mit dem Stand des Einlesens. Erscheint eine neue Version der Doku, liest du sie erneut ein. Achte darauf, die Version einzulesen, mit der du arbeitest.",
        "CraCha führt keinen Code aus. Codebeispiele in Antworten sind nicht getestet und können unvollständig oder falsch sein.",
        "Du nutzt CraCha im Browser; eine Erweiterung für deine IDE gibt es nicht.",
      ],
      faq: [
        { question: "Funktioniert das auch mit englischer Dokumentation?", answer: "Ja. Die eingelesene Dokumentation kann englisch sein, deine Fragen stellst du trotzdem auf Deutsch. Die Quellenlinks führen auf die Originalseiten." },
        {
          question: "Wie groß darf eine Dokumentation sein?",
          answer: `Pro Einlesevorgang sind bis zu ${maxPagesPerCrawl} Seiten möglich, sofern sie erreichbar sind und dein Guthaben reicht. Jede eingelesene Seite kostet ${CREDITS.perPage} Credit, jede Antwort ${CREDITS.perChatMessage} Credits. Mit dem Paket ${largestPack.label} (${formatNumber(largestPack.credits, locale)} Credits) kannst du zum Beispiel ${maxPagesPerCrawl} Seiten einlesen und danach ${formatNumber(largestPackAnswers, locale)} Fragen stellen.`,
        },
        { question: "Kann ich interne oder private Dokumentation einlesen?", answer: "Nein. CraCha liest nur öffentlich erreichbare Seiten ein. Bereiche hinter einer Anmeldung werden nicht abgerufen, und Dateien kannst du nicht hochladen." },
        { question: "Kann ich mich auf den Code in den Antworten verlassen?", answer: "Nicht ungeprüft. Die Antwort stützt sich auf die verlinkten Doku-Seiten, kann aber unvollständig oder falsch sein. Vergleiche Code mit der Dokumentation und teste ihn, bevor du ihn übernimmst." },
        { question: "Wird die Wissensbasis bei neuen Releases aktualisiert?", answer: "Nicht automatisch. CraCha arbeitet mit dem Stand des letzten Einlesens. Nach einem Update der Dokumentation liest du sie erneut ein; das verbraucht wieder Credits." },
      ],
      cta: {
        heading: "Teste es mit der Doku, die du gerade offen hast",
        text: `Nimm einen überschaubaren Bereich, zum Beispiel einen Guide mit 20 Seiten. Mit ${CREDITS.welcome} Start-Credits bleiben danach noch ${starterAnswers} Fragen – ohne Kreditkarte.`,
      },
    },
    {
      eyebrow: "For developers",
      heading: "Search large documentation – with a link to the right docs page",
      intro:
        "The answer is somewhere between the API reference, guides and migration notes. Read the documentation once with CraCha and ask directly: How do I configure this? How do these two methods differ? Every answer links the docs pages it comes from – you jump straight to the right place.",
      benefits: [
        { title: "Straight to the right page", text: "CraCha searches by meaning and by exact terms such as function or option names. Instead of clicking through the sidebar and search results, you get an answer with links to the docs pages it is based on." },
        { title: "Code samples stay intact", text: "Code blocks from the documentation are kept unchanged while reading, so answers can refer to the documentation’s actual code." },
        { title: "Ask in your language", text: "Plenty of documentation is written in one language only. You can still ask your questions in yours." },
        { title: "Your reference, for good", text: `The knowledge base stays in your account. Up to ${CREDITS.maxDatabases} knowledge bases per account, for example one per framework or library.` },
      ],
      exampleQuestions: [
        "How do I authenticate with the [service] API according to the documentation? Link the relevant pages.",
        "Which configuration options exist for [feature], and which defaults does the documentation give?",
        "What is the difference between [method A] and [method B]?",
        "Which breaking changes does the migration guide list for version [X]?",
      ],
      steps: [
        { title: "Sign up for free.", text: `Create an account and confirm your email address. You start with ${CREDITS.welcome} credits, no credit card needed.` },
        { title: "Enter the docs address.", text: "Enter the documentation’s start address in the dashboard. Use the sitemap or let CraCha follow linked pages up to five levels deep. Patterns limit reading to the section you need, such as /docs/." },
        { title: "Let CraCha read.", text: "The dashboard shows the progress. As soon as the knowledge base is ready, you can ask." },
        { title: "Ask and look it up.", text: "Ask your question in the chat and open the matching docs page via the source links." },
      ],
      limits: [
        `Up to ${maxPagesPerCrawl} pages per run. For very large documentation, stick to the sections you really need.`,
        "Publicly accessible HTML pages only: internal documentation behind a login, private repositories and PDF files are not read.",
        "CraCha works with the state of its last read. When a new version of the docs comes out, you read it again. Make sure to read the version you work with.",
        "CraCha doesn’t run code. Code samples in answers are untested and can be incomplete or wrong.",
        "You use CraCha in the browser; there is no extension for your IDE.",
      ],
      faq: [
        { question: "Does it work with documentation in another language?", answer: "Yes. The documentation can be in English, German or another language, and you ask in yours. The source links lead to the original pages." },
        {
          question: "How large can the documentation be?",
          answer: `Up to ${maxPagesPerCrawl} pages per run, as long as they are reachable and your balance covers them. Every page read costs ${CREDITS.perPage} credit, every answer ${CREDITS.perChatMessage} credits. With the ${largestPack.label} pack (${formatNumber(largestPack.credits, locale)} credits) you can, for example, read ${maxPagesPerCrawl} pages and then ask ${formatNumber(largestPackAnswers, locale)} questions.`,
        },
        { question: "Can I read internal or private documentation?", answer: "No. CraCha only reads publicly accessible pages. Sections behind a sign-in are not fetched, and you can’t upload files." },
        { question: "Can I rely on the code in the answers?", answer: "Not without checking. The answer is based on the linked docs pages but can be incomplete or wrong. Compare code with the documentation and test it before you use it." },
        { question: "Is the knowledge base updated with new releases?", answer: "Not automatically. CraCha works with the state of its last read. After the documentation is updated, you read it again; that uses credits again." },
      ],
      cta: {
        heading: "Try it with the docs you have open right now",
        text: `Pick a manageable section, for example a guide with 20 pages. With ${CREDITS.welcome} free credits you then still have ${starterAnswers} questions – no credit card.`,
      },
    },
  )[locale];

export async function generateMetadata({ params }: PageProps<"/[locale]/dokumentation-durchsuchen">) {
  const locale = (await params).locale as Locale;
  const t = meta[locale];
  return marketingPageMetadata({ path: "/dokumentation-durchsuchen", locale, title: t.title, description: t.description, keywords: t.keywords });
}

export default async function DokumentationDurchsuchenPage({ params }: PageProps<"/[locale]/dokumentation-durchsuchen">) {
  const locale = (await params).locale as Locale;
  setRequestLocale(locale);
  const t = meta[locale];
  return (
    <>
      <UseCasePage content={content(locale)} locale={locale} />
      <p className="mx-auto max-w-3xl px-5 pb-16 text-sm text-muted-foreground">
        {t.other}{" "}
        <Link href="/kundenwebsite-durchsuchen" className="underline underline-offset-4">{t.otherLink}</Link>
      </p>
    </>
  );
}
