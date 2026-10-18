import { setRequestLocale } from "next-intl/server";

import { AppEntryLink } from "@/components/landing/app-entry-link";
import { bilingual } from "@/i18n/copy";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { marketingPageMetadata } from "@/lib/marketing/page-metadata";

const copy = bilingual(
  {
    title: "Website mit KI durchsuchen: Anleitung und Beispielfragen",
    description: "So recherchierst du mit CraCha in Website-Inhalten: passende Seiten auswählen, Fragen formulieren, Quellen prüfen und das Startguthaben sinnvoll nutzen.",
    back: "CraCha kennenlernen",
    heading: "Eine Website mit KI durchsuchen",
    intro: "Die gesuchte Information steckt irgendwo zwischen Produktseiten, Hilfeartikeln und Dokumentation. Mit CraCha kannst du ausgewählte Website-Inhalte einlesen und anschließend in deinem Konto Fragen dazu stellen. Hier erfährst du, wann das hilft und wie du klein anfängst.",
    whenHeading: "Wann lohnt sich ein Website-Chat?",
    when: [
      "Wenn du wiederholt Informationen aus mehreren Seiten einer Website zusammentragen musst. Zum Beispiel, wenn du für eine Beratung Produkteigenschaften recherchierst oder regelmäßig eine umfangreiche Hilfedokumentation nutzt. Für eine einzelne bekannte Textstelle ist die Suche im Browser oft schon ausreichend.",
      "CraCha ist eine Rechercheanwendung. Du baust damit derzeit keinen öffentlich eingebetteten Supportbot und durchsuchst auch nicht automatisch das gesamte Internet.",
    ],
    aiHeading: "Warum nicht einfach eine KI-Suche?",
    ai1: "Eine KI-Suche wie der KI-Modus von Google, ChatGPT oder Perplexity geht bei jeder Frage neu ins Netz und arbeitet mit den Treffern, die eine Suchmaschine liefert. Für eine schnelle Frage reicht das. Was tief in einer Website steckt oder gar nicht bei Google gelistet ist, taucht dort aber selten auf.",
    ai2: "CraCha liest die Website vorab Seite für Seite und folgt dabei selbst den Links und der Sitemap. Deine Fragen beantwortet CraCha nur aus dieser Website, mit Link zur Quelle. Das lohnt sich, wenn es genau sein muss oder du immer wieder zur selben Website zurückkommst. Einen ausführlichen Vergleich findest du im Artikel",
    aiLink: "CraCha vs. ChatGPT und Perplexity",
    casesHeading: "Zwei typische Anwendungsfälle",
    cases: [
      { href: "/kundenwebsite-durchsuchen", label: "Kundenwebsite durchsuchen", text: ": für Agenturen und Marketing-Teams, die sich schnell in die Website eines Kunden einarbeiten wollen." },
      { href: "/dokumentation-durchsuchen", label: "Dokumentation durchsuchen", text: ": für Entwicklerinnen und Entwickler, die große Docs gezielt befragen wollen." },
    ],
    moreBefore: "Weitere Anregungen – vom Hilfe-Center bis zur Hochschul-Website – findest du unter",
    moreLink: "Beispiele zur Nutzung",
    stepsHeading: "Von der Website zur ersten prüfbaren Antwort",
    steps: [
      { title: "Eine Aufgabe festlegen.", text: "Notiere eine konkrete Frage, deren Antwort du auf der Website erwartest. Wähle einen öffentlichen Bereich, den du einlesen darfst." },
      { title: "Konto erstellen und bestätigen.", text: "Öffne den Bestätigungslink in deiner E-Mail. Falls die Nachricht fehlt, prüfe auch den Spam-Ordner." },
      { title: "Klein anfangen.", text: "Starte im Dashboard einen Crawl, also das Einlesen von Seiten. Vergib einen Namen und beginne mit höchstens 20 Seiten. Nutze bei Bedarf einen passenden Unterbereich statt der ganzen Website." },
      { title: "Auf die Aufbereitung warten.", text: "Öffne deine Wissensbasis erst, wenn sie bereit ist. Nicht erreichbare oder gesperrte Seiten können fehlen." },
      { title: "Fragen und nachprüfen.", text: "Öffne die Wissensbasis über „Fragen“. Lies die verlinkten Originalseiten und prüfe, ob sie die Aussagen tatsächlich tragen." },
    ],
    samplesHeading: "Drei Beispielfragen für eine Produktdokumentation",
    samplesHint: "Formulierungshilfen, keine aufgezeichneten Produktergebnisse. Ersetze die Platzhalter durch Begriffe aus deiner Website.",
    samples: [
      "Welche Voraussetzungen nennt die Dokumentation für die Installation von [Produkt]?",
      "Wie unterscheiden sich [Option A] und [Option B] laut den eingelesenen Seiten?",
      "Welche Einschränkungen werden für [Funktion] genannt? Verlinke die passenden Quellen.",
    ],
    samplesAfter: "Bleibt die Antwort unklar, frage nach einem einzelnen Teilaspekt. Fehlt die relevante Seite in der Wissensbasis, kann auch eine anders formulierte Frage diese Quelle nicht ersetzen.",
    creditsHeading: "Das Startguthaben für den ganzen Ablauf nutzen",
    credits: "Jede eingelesene Seite und jede Antwort verbraucht Credits; zum Start bekommst du 100 Credits gratis. Lies für den ersten Test lieber wenige Seiten ein, damit genug für Fragen bleibt. Ein erneutes Einlesen verbraucht ebenfalls Credits.",
    creditsLink: "Kosten und häufige Fragen ansehen",
    limitsHeading: "Grenzen bewusst prüfen",
    limits1: "Ein Quellenlink ist keine Garantie für eine korrekte Antwort. Vergleiche wichtige Aussagen mit dem Original und prüfe dessen Aktualität. CraCha arbeitet mit einem eingelesenen Stand; Änderungen an der Quelle erscheinen erst nach erneuter Aufbereitung.",
    limits2: "Login-Bereiche, Paywalls und PDF-Uploads gehören nicht zum beschriebenen Ablauf. Welche öffentlichen Seiten erreichbar sind, hängt unter anderem von Verlinkung und technischen Zugriffsbeschränkungen ab. Informiere dich in den",
    privacyLink: "Datenschutzhinweisen",
    limits2After: "über die Verarbeitung, bevor du Inhalte verwendest.",
    ctaHeading: "Teste eine Frage aus deinem Alltag",
    ctaText: "Du brauchst eine passende öffentliche Website und eine konkrete Recherchefrage. Eine Kreditkarte ist für den Einstieg nicht erforderlich.",
    cta: "Kostenlos starten",
  },
  {
    title: "Search a website with AI: guide and sample questions",
    description: "How to research website content with CraCha: choose the right pages, phrase questions, check sources and make good use of your free credits.",
    back: "Discover CraCha",
    heading: "Search a website with AI",
    intro: "The information you need is somewhere between product pages, help articles and documentation. With CraCha you read selected website content and then ask questions about it in your account. Here’s when that helps and how to start small.",
    whenHeading: "When is a website chat worth it?",
    when: [
      "When you repeatedly need to pull information together from several pages of a website – for example when you research product details for a consultation or regularly work with extensive help documentation. For a single passage you already know, the browser’s search is often enough.",
      "CraCha is a research tool. You don’t currently build a publicly embedded support bot with it, and it doesn’t automatically search the whole internet.",
    ],
    aiHeading: "Why not just use an AI search?",
    ai1: "An AI search such as Google’s AI Mode, ChatGPT or Perplexity goes out to the web for every question and works with the results a search engine delivers. For a quick question that’s fine. But what sits deep inside a website, or isn’t listed on Google at all, rarely shows up.",
    ai2: "CraCha reads the website beforehand, page by page, following its links and sitemap itself. It answers your questions from that website only, with a link to the source. That pays off when it has to be exact or you keep coming back to the same website. For a detailed comparison, see the article",
    aiLink: "CraCha vs. ChatGPT and Perplexity",
    casesHeading: "Two typical use cases",
    cases: [
      { href: "/kundenwebsite-durchsuchen", label: "Search a client website", text: ": for agencies and marketing teams who need to get up to speed on a client’s website quickly." },
      { href: "/dokumentation-durchsuchen", label: "Search documentation", text: ": for developers who want to question large docs precisely." },
    ],
    moreBefore: "More ideas – from help centers to university websites – are on the",
    moreLink: "Examples page",
    stepsHeading: "From the website to your first verifiable answer",
    steps: [
      { title: "Define a task.", text: "Write down a concrete question whose answer you expect on the website. Choose a public section you’re allowed to read." },
      { title: "Create and confirm your account.", text: "Open the confirmation link in your email. If the message is missing, check your spam folder too." },
      { title: "Start small.", text: "Start a crawl in the dashboard – that is, reading pages. Give it a name and begin with no more than 20 pages. Use a suitable subsection instead of the whole website if that fits." },
      { title: "Wait for the processing.", text: "Open your knowledge base only once it’s ready. Unreachable or blocked pages may be missing." },
      { title: "Ask and verify.", text: "Open the knowledge base via “Ask”. Read the linked original pages and check whether they really support the statements." },
    ],
    samplesHeading: "Three sample questions for product documentation",
    samplesHint: "Phrasing aids, not recorded product results. Replace the placeholders with terms from your website.",
    samples: [
      "What prerequisites does the documentation list for installing [product]?",
      "How do [option A] and [option B] differ according to the pages read?",
      "Which limitations are mentioned for [feature]? Link the matching sources.",
    ],
    samplesAfter: "If the answer stays unclear, ask about a single aspect. If the relevant page is missing from the knowledge base, no rephrased question can replace that source.",
    creditsHeading: "Make the free credits last the whole way",
    credits: "Every page read and every answer uses credits; you get 100 credits free to start. For your first test, read only a few pages so enough is left for questions. Reading again also uses credits.",
    creditsLink: "See costs and FAQ",
    limitsHeading: "Know the limits",
    limits1: "A source link is no guarantee that an answer is correct. Compare important statements with the original and check how current it is. CraCha works with the state it read; changes to the source only appear after it is read again.",
    limits2: "Login areas, paywalls and PDF uploads are not part of this process. Which public pages are reachable depends, among other things, on links and technical access restrictions. Read the",
    privacyLink: "privacy policy",
    limits2After: "about how data is processed before you use content.",
    ctaHeading: "Test a question from your everyday work",
    ctaText: "You need a suitable public website and a concrete research question. No credit card is required to get started.",
    cta: "Start for free",
  },
);

export async function generateMetadata({ params }: PageProps<"/[locale]/website-mit-ki-durchsuchen">) {
  const locale = (await params).locale as Locale;
  const t = copy[locale];
  return marketingPageMetadata({ path: "/website-mit-ki-durchsuchen", locale, title: t.title, description: t.description });
}

export default async function WebsiteGuide({ params }: PageProps<"/[locale]/website-mit-ki-durchsuchen">) {
  const locale = (await params).locale as Locale;
  setRequestLocale(locale);
  const t = copy[locale];
  return (
    <article className="mx-auto max-w-3xl space-y-10 px-5 py-12 sm:py-20">
      <header>
        <Link href="/" className="text-sm text-muted-foreground underline">{t.back}</Link>
        <h1 className="mt-6 text-4xl font-bold tracking-tight sm:text-5xl">{t.heading}</h1>
        <p className="mt-5 text-lg leading-8 text-muted-foreground">{t.intro}</p>
      </header>
      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">{t.whenHeading}</h2>
        {t.when.map((paragraph) => <p key={paragraph} className="leading-7 text-muted-foreground">{paragraph}</p>)}
      </section>
      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">{t.aiHeading}</h2>
        <p className="leading-7 text-muted-foreground">{t.ai1}</p>
        <p className="leading-7 text-muted-foreground">{t.ai2} <Link href="/blog/cracha-vs-chatgpt-perplexity" className="underline underline-offset-4">{t.aiLink}</Link>.</p>
      </section>
      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">{t.casesHeading}</h2>
        <ul className="list-disc space-y-3 pl-5 leading-7 text-muted-foreground">
          {t.cases.map((item) => (
            <li key={item.href}><Link href={item.href} className="font-medium text-foreground underline underline-offset-4">{item.label}</Link>{item.text}</li>
          ))}
        </ul>
        <p className="leading-7 text-muted-foreground">{t.moreBefore} <Link href="/beispiele" className="underline underline-offset-4">{t.moreLink}</Link>.</p>
      </section>
      <section className="space-y-5">
        <h2 className="text-2xl font-semibold">{t.stepsHeading}</h2>
        <ol className="list-decimal space-y-5 pl-6 leading-7 text-muted-foreground">
          {t.steps.map((step) => <li key={step.title}><strong className="text-foreground">{step.title}</strong> {step.text}</li>)}
        </ol>
      </section>
      <section className="rounded-2xl border bg-muted/30 p-6">
        <h2 className="text-2xl font-semibold">{t.samplesHeading}</h2>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">{t.samplesHint}</p>
        <ul className="mt-5 list-disc space-y-3 pl-5 leading-7">
          {t.samples.map((sample) => <li key={sample}>{sample}</li>)}
        </ul>
        <p className="mt-5 leading-7 text-muted-foreground">{t.samplesAfter}</p>
      </section>
      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">{t.creditsHeading}</h2>
        <p className="leading-7 text-muted-foreground">{t.credits}</p>
        <Link href="/#fragen" className="inline-block underline underline-offset-4">{t.creditsLink}</Link>
      </section>
      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">{t.limitsHeading}</h2>
        <p className="leading-7 text-muted-foreground">{t.limits1}</p>
        <p className="leading-7 text-muted-foreground">{t.limits2} <Link className="underline" href="/datenschutz">{t.privacyLink}</Link> {t.limits2After}</p>
      </section>
      <div className="rounded-2xl border p-6">
        <h2 className="text-2xl font-semibold">{t.ctaHeading}</h2>
        <p className="mb-5 mt-3 leading-7 text-muted-foreground">{t.ctaText}</p>
        <AppEntryLink signedOutHref="/register" className="inline-flex min-h-11 items-center rounded-full bg-primary px-6 py-3 font-medium text-primary-foreground">{t.cta}</AppEntryLink>
      </div>
    </article>
  );
}
