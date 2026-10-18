import { setRequestLocale } from "next-intl/server";

import { UseCasePage, type UseCaseContent } from "@/components/landing/use-case-page";
import { bilingual, formatEuro, formatNumber } from "@/i18n/copy";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { CREDITS, CREDIT_PACKAGES } from "@/lib/credit-tariff";
import { marketingPageMetadata } from "@/lib/marketing/page-metadata";

// A worked example, computed from the tariff so it cannot drift from the price list.
const examplePages = 80;
const startPack = CREDIT_PACKAGES[0];
const exampleAnswers = Math.floor((startPack.credits - examplePages * CREDITS.perPage) / CREDITS.perChatMessage);
const starterAnswers = Math.floor((CREDITS.welcome - 20 * CREDITS.perPage) / CREDITS.perChatMessage);

const meta = bilingual(
  {
    title: "Kundenwebsite mit KI durchsuchen: Antworten mit Quellenlink",
    description:
      "Für Agenturen: Lies die Website deines Kunden mit CraCha ein und stell deine Fragen auf Deutsch. Jede Antwort verlinkt die passende Unterseite. 100 Start-Credits ohne Kreditkarte.",
    keywords: ["Kundenwebsite durchsuchen", "Website analysieren KI", "Agentur Recherche KI", "Content Audit KI", "Website Fragen stellen"],
    other: "Du willst eher eine technische Dokumentation befragen?",
    otherLink: "Dokumentation mit KI durchsuchen",
  },
  {
    title: "Search a client website with AI: answers with source links",
    description:
      "For agencies: read your client’s website with CraCha and ask your questions in plain language. Every answer links the matching subpage. 100 free credits, no credit card.",
    keywords: ["search client website", "analyze website with AI", "agency research AI", "content audit AI", "ask questions about a website"],
    other: "Want to question technical documentation instead?",
    otherLink: "Search documentation with AI",
  },
);

const content = (locale: Locale) =>
  bilingual<UseCaseContent>(
    {
      eyebrow: "Für Agenturen und Marketing-Teams",
      heading: "Die Website deines Kunden durchsuchen – mit Quellenlink zu jeder Antwort",
      intro:
        "Neuer Kunde, neues Briefing, dutzende Unterseiten? Lies die Website einmal mit CraCha ein und frag dann einfach: Welche Leistungen werden angeboten? Wie spricht die Marke ihre Zielgruppe an? Jede Antwort verlinkt die Seite, aus der sie stammt – so findest du die richtige Stelle für Konzept, Pitch oder Abstimmung sofort wieder.",
      benefits: [
        { title: "Schneller eingearbeitet", text: "Statt Seite für Seite zu lesen, stellst du Fragen und bekommst eine Antwort mit den passenden Unterseiten." },
        { title: "Aussagen belegen", text: "Unter jeder Antwort stehen die Quellseiten als Links – hilfreich für Content-Audits, Faktenchecks und Rückfragen an den Kunden." },
        { title: "Eine Wissensbasis pro Kunde", text: `Bis zu ${CREDITS.maxDatabases} Wissensbasen je Konto. Die eingelesenen Inhalte bleiben verfügbar, bis du sie löschst.` },
        { title: "Texte gegen die Website prüfen", text: "Füg einen Entwurf, ein Angebot oder eine Preisliste in den Content-Check ein. CraCha zeigt Widersprüche zur Kundenwebsite und veraltete Angaben, mit Quelle." },
      ],
      exampleQuestions: [
        "Welche Leistungen und Produkte stellt [Kunde] auf der Website vor? Verlinke jeweils die passende Seite.",
        "Welche Zielgruppen spricht die Website an, und mit welchen Argumenten?",
        "Welche Angaben macht die Website zu [Thema, z. B. Preisen, Standorten oder Lieferzeiten]?",
        "Mit welchen Begriffen beschreibt [Kunde] sein Produkt [Name]?",
      ],
      steps: [
        { title: "Kostenlos registrieren.", text: `Konto anlegen und E-Mail-Adresse bestätigen. Du startest mit ${CREDITS.welcome} Credits, eine Kreditkarte brauchst du nicht.` },
        { title: "Kundenwebsite eintragen.", text: "Gib im Dashboard die Start-Adresse ein und wähle, ob CraCha verlinkten Seiten folgen oder die Sitemap nutzen soll. Mit Mustern beschränkst du das Einlesen auf bestimmte Bereiche, etwa nur die Leistungsseiten." },
        { title: "Einlesen lassen.", text: "Im Dashboard siehst du den Fortschritt. Sobald die Wissensbasis bereit ist, kannst du fragen." },
        { title: "Fragen und Quellen öffnen.", text: "Stell deine Frage im Chat und spring über die Quellenlinks direkt zur passenden Unterseite." },
      ],
      limits: [
        "CraCha liest nur öffentlich erreichbare HTML-Seiten ein. Login-Bereiche, Paywalls und PDF-Dateien gehören nicht dazu.",
        "Die robots.txt der Website kannst du beim Einlesen beachten lassen; dort gesperrte Bereiche fehlen dann in der Wissensbasis.",
        "Pro Einlesevorgang sind bis zu 500 Seiten möglich, sofern sie erreichbar sind und dein Guthaben reicht.",
        "CraCha arbeitet mit dem Stand des Einlesens. Ändert der Kunde seine Website, liest du sie erneut ein; das verbraucht wieder Credits.",
        "Ein Chatwidget, das du auf der Kundenwebsite einbinden kannst, ist nicht enthalten.",
        "Auch Antworten mit Quellen können unvollständig oder falsch sein. Prüfe Aussagen im Original, bevor du sie an Kunden weitergibst.",
      ],
      faq: [
        {
          question: "Darf ich die Website eines Kunden mit CraCha einlesen?",
          answer:
            "CraCha ruft nur öffentlich erreichbare Seiten ab und beachtet auf Wunsch die robots.txt. Ob du die Inhalte für deinen Zweck auswerten darfst, hängt von deinem Auftrag und den Inhalten ab; im Zweifel sprich es mit deinem Kunden ab. Näheres regeln die Nutzungsbedingungen.",
        },
        {
          question: "Was kostet das für eine typische Kundenwebsite?",
          answer: `Jede eingelesene Seite kostet ${CREDITS.perPage} Credit, jede Antwort ${CREDITS.perChatMessage} Credits. Eine Website mit ${examplePages} Seiten kostet also einmalig ${examplePages * CREDITS.perPage} Credits. Mit dem Paket ${startPack.label} (${formatNumber(startPack.credits, locale)} Credits für ${formatEuro(startPack.priceCents, locale, { minimumFractionDigits: 2 })}) bleiben danach Credits für ${exampleAnswers} Antworten. Einmalige Aufladung, kein Abo.`,
        },
        { question: "Kann mein Kunde den Chat selbst nutzen?", answer: "Nicht als eingebettetes Chatwidget auf seiner Website. CraCha ist ein Recherchewerkzeug in deinem eigenen Konto." },
        { question: "Werden Änderungen an der Website automatisch übernommen?", answer: "Nein. CraCha arbeitet mit dem Stand des letzten Einlesens. Nach Änderungen an der Website liest du sie erneut ein." },
        {
          question: "Kann ich mehrere Kunden getrennt halten?",
          answer: `Ja. Lege pro Kunde eine eigene Wissensbasis an; bis zu ${CREDITS.maxDatabases} sind je Konto möglich. Zum Fragen öffnest du jeweils die Wissensbasis des Kunden, um den es gerade geht.`,
        },
      ],
      cta: {
        heading: "Probier es mit einer echten Kundenwebsite aus",
        text: `Du brauchst nur die Adresse und eine konkrete Frage. Mit ${CREDITS.welcome} Start-Credits kannst du zum Beispiel 20 Seiten einlesen und danach ${starterAnswers} Fragen stellen – ohne Kreditkarte.`,
      },
    },
    {
      eyebrow: "For agencies and marketing teams",
      heading: "Search your client’s website – with a source link for every answer",
      intro:
        "New client, new brief, dozens of subpages? Read the website once with CraCha and simply ask: Which services do they offer? How does the brand speak to its audience? Every answer links the page it comes from – so you find the right spot for your concept, pitch or review right away.",
      benefits: [
        { title: "Up to speed faster", text: "Instead of reading page by page, you ask questions and get an answer with the matching subpages." },
        { title: "Back up every statement", text: "Below every answer you see the source pages as links – useful for content audits, fact checks and questions to your client." },
        { title: "One knowledge base per client", text: `Up to ${CREDITS.maxDatabases} knowledge bases per account. The content stays available until you delete it.` },
        { title: "Check texts against the website", text: "Paste a draft, a proposal or a price list into the Content Check. CraCha shows contradictions with the client website and outdated details, with sources." },
      ],
      exampleQuestions: [
        "Which services and products does [client] present on the website? Link the matching page for each.",
        "Which audiences does the website address, and with which arguments?",
        "What does the website say about [topic, e.g. prices, locations or delivery times]?",
        "Which terms does [client] use to describe their product [name]?",
      ],
      steps: [
        { title: "Sign up for free.", text: `Create an account and confirm your email address. You start with ${CREDITS.welcome} credits, no credit card needed.` },
        { title: "Enter the client website.", text: "Enter the start address in the dashboard and choose whether CraCha should follow linked pages or use the sitemap. Patterns limit reading to certain sections, such as only the service pages." },
        { title: "Let CraCha read.", text: "The dashboard shows the progress. As soon as the knowledge base is ready, you can ask." },
        { title: "Ask and open the sources.", text: "Ask your question in the chat and jump straight to the matching subpage via the source links." },
      ],
      limits: [
        "CraCha only reads publicly accessible HTML pages. Login areas, paywalls and PDF files are not included.",
        "You can have CraCha respect the website’s robots.txt; sections blocked there will then be missing from the knowledge base.",
        "Up to 500 pages per run, as long as they are reachable and your balance covers them.",
        "CraCha works with the state of its last read. If the client changes the website, you read it again; that uses credits again.",
        "A chat widget to embed on the client website is not included.",
        "Even answers with sources can be incomplete or wrong. Check statements in the original before passing them on to clients.",
      ],
      faq: [
        {
          question: "Am I allowed to read a client’s website with CraCha?",
          answer:
            "CraCha only fetches publicly accessible pages and respects robots.txt if you ask it to. Whether you may analyze the content for your purpose depends on your assignment and the content; if in doubt, clear it with your client. The terms of use cover the details.",
        },
        {
          question: "What does a typical client website cost?",
          answer: `Every page read costs ${CREDITS.perPage} credit, every answer ${CREDITS.perChatMessage} credits. A website with ${examplePages} pages therefore costs ${examplePages * CREDITS.perPage} credits once. With the ${startPack.label} pack (${formatNumber(startPack.credits, locale)} credits for ${formatEuro(startPack.priceCents, locale, { minimumFractionDigits: 2 })}) you then have credits left for ${exampleAnswers} answers. One-time top-up, no subscription.`,
        },
        { question: "Can my client use the chat themselves?", answer: "Not as a chat widget embedded on their website. CraCha is a research tool in your own account." },
        { question: "Are changes to the website picked up automatically?", answer: "No. CraCha works with the state of its last read. After the website changes, you read it again." },
        {
          question: "Can I keep several clients separate?",
          answer: `Yes. Create one knowledge base per client; up to ${CREDITS.maxDatabases} per account. To ask questions, open the knowledge base of the client you’re working on.`,
        },
      ],
      cta: {
        heading: "Try it with a real client website",
        text: `All you need is the address and a concrete question. With ${CREDITS.welcome} free credits you can, for example, read 20 pages and then ask ${starterAnswers} questions – no credit card.`,
      },
    },
  )[locale];

export async function generateMetadata({ params }: PageProps<"/[locale]/kundenwebsite-durchsuchen">) {
  const locale = (await params).locale as Locale;
  const t = meta[locale];
  return marketingPageMetadata({ path: "/kundenwebsite-durchsuchen", locale, title: t.title, description: t.description, keywords: t.keywords });
}

export default async function KundenwebsiteDurchsuchenPage({ params }: PageProps<"/[locale]/kundenwebsite-durchsuchen">) {
  const locale = (await params).locale as Locale;
  setRequestLocale(locale);
  const t = meta[locale];
  return (
    <>
      <UseCasePage content={content(locale)} locale={locale} />
      <p className="mx-auto max-w-3xl px-5 pb-16 text-sm text-muted-foreground">
        {t.other}{" "}
        <Link href="/dokumentation-durchsuchen" className="underline underline-offset-4">{t.otherLink}</Link>
      </p>
    </>
  );
}
