import { bilingual, formatEuro } from "@/i18n/copy";
import { CREDITS, CREDIT_PACKAGES } from "@/lib/credit-tariff";

export interface FaqItem {
  question: string;
  answer: string;
}

const lowestPackCents = Math.min(...CREDIT_PACKAGES.map((pack) => pack.priceCents));

/**
 * The landing page FAQ. The visible list and the FAQPage JSON-LD both render
 * from this array, so what a search engine reads is exactly what a visitor
 * reads — plain strings, because structured data cannot carry markup.
 *
 * The caveats that used to sit in the hero and the feature cards live here,
 * and so does the price: one item instead of a tariff table and a calculator.
 */
export const landingFaq = bilingual<FaqItem[]>(
  [
    {
      question: "Ist CraCha ein normaler KI-Chat?",
      answer:
        "Nein. Eine KI-Suche wie der KI-Modus von Google, ChatGPT oder Perplexity geht bei jeder Frage neu ins Netz und nimmt ein paar Treffer aus vielen Websites. CraCha liest eine Website, die du wählst, vorab Seite für Seite und beantwortet deine Fragen nur aus ihr, mit Link zur Quelle. Für die schnelle Frage zwischendurch reicht die KI-Suche; wenn es genau sein muss oder du immer wieder zur selben Website zurückkommst, ist CraCha gemacht.",
    },
    {
      question: "Für wen ist CraCha gedacht?",
      answer:
        "Für alle, die immer wieder etwas auf einer großen Website suchen: Agenturen und Berater bei Kundenwebsites, Entwicklerinnen und Entwickler in Dokumentationen, Studierende auf Hochschulseiten. CraCha ist ein Recherchewerkzeug für dich im Browser, kein Chatbot für die Besucher einer Website. Anregungen findest du auf der Seite „Beispiele zur Nutzung“.",
    },
    {
      question: "Wie findet CraCha Seiten, die keine Suchmaschine zeigt?",
      answer:
        "CraCha folgt selbst den Links und der Sitemap der Website. Eine Unterseite muss deshalb nicht bei Google gelistet sein, es reicht, dass sie auf der Website verlinkt ist oder in ihrer Sitemap steht. Seiten, auf die nirgends ein Link zeigt, findet auch CraCha nicht.",
    },
    {
      question: "Welche Inhalte kann ich verwenden?",
      answer:
        "Öffentlich erreichbare HTML-Seiten, die du einlesen darfst, bis zu 500 pro Durchgang. Login-Bereiche, Paywalls und PDF-Dateien liest CraCha nicht. Wie viele Seiten CraCha erreicht, hängt von Verlinkung, Sitemap und technischen Sperren der Website ab.",
    },
    {
      question: "Was kostet CraCha?",
      answer: `Du startest mit ${CREDITS.welcome} Start-Credits gratis, ohne Kreditkarte. Danach kaufst du bei Bedarf Credit-Pakete ab ${formatEuro(lowestPackCents, "de")} – einmalige Aufladung, kein Abo. Eine gecrawlte Seite kostet ${CREDITS.perPage} Credit, eine Antwort ${CREDITS.perChatMessage} Credits. Alle Pakete mit Rechenbeispielen stehen auf der Seite „Preise“.`,
    },
    {
      question: "Sind die Antworten immer richtig?",
      answer:
        "Nein. Auch Antworten mit Quellen können unvollständig oder falsch sein. Deshalb verlinkt jede Antwort die Seiten, auf die sie sich stützt – prüfe Wichtiges im Original. CraCha kennt den Stand des letzten Crawls; ändert sich die Website, crawlst du sie erneut.",
    },
    {
      question: "Kann ich CraCha als Chatwidget auf einer Website einbinden?",
      answer:
        "Nein, derzeit nicht. CraCha ist ein Recherchewerkzeug in deinem eigenen Konto, kein Chatwidget zum Einbetten.",
    },
    {
      question: "Muss ich Software installieren?",
      answer:
        "Nein. CraCha läuft im Browser. Du registrierst dich, bestätigst deine E-Mail-Adresse und kannst im Dashboard deine erste Website crawlen.",
    },
  ],
  [
    {
      question: "Is CraCha just another AI chat?",
      answer:
        "No. An AI search such as Google’s AI Mode, ChatGPT or Perplexity goes out to the web for every question and takes a few results from many websites. CraCha reads one website you choose beforehand, page by page, and answers your questions from that website only, with a link to the source. For a quick question, AI search is fine; when it has to be exact, or you keep coming back to the same website, CraCha is built for it.",
    },
    {
      question: "Who is CraCha for?",
      answer:
        "For anyone who keeps looking for things on a large website: agencies and consultants working with client websites, developers in documentation, students on university websites. CraCha is a research tool for you in the browser, not a chatbot for a website’s visitors. You’ll find ideas on the “Examples” page.",
    },
    {
      question: "How does CraCha find pages no search engine shows?",
      answer:
        "CraCha follows the website’s links and sitemap itself. A subpage doesn’t need to be listed on Google; it only has to be linked somewhere on the website or appear in its sitemap. Pages nothing links to can’t be found by CraCha either.",
    },
    {
      question: "Which content can I use?",
      answer:
        "Publicly accessible HTML pages you’re allowed to read, up to 500 per run. CraCha doesn’t read login areas, paywalls or PDF files. How many pages CraCha reaches depends on the website’s links, sitemap and technical blocks.",
    },
    {
      question: "How much does CraCha cost?",
      answer: `You start with ${CREDITS.welcome} free credits, no credit card required. After that you buy credit packs when you need them, from ${formatEuro(lowestPackCents, "en")} – a one-time top-up, no subscription. Reading one page costs ${CREDITS.perPage} credit, one answer ${CREDITS.perChatMessage} credits. All packs with worked examples are on the “Pricing” page.`,
    },
    {
      question: "Are the answers always right?",
      answer:
        "No. Even answers with sources can be incomplete or wrong. That’s why every answer links the pages it is based on – check anything important in the original. CraCha knows the state of the last crawl; if the website changes, you crawl it again.",
    },
    {
      question: "Can I embed CraCha as a chat widget on a website?",
      answer:
        "No, not at the moment. CraCha is a research tool in your own account, not a chat widget to embed.",
    },
    {
      question: "Do I need to install anything?",
      answer:
        "No. CraCha runs in the browser. You sign up, confirm your email address and can crawl your first website from the dashboard.",
    },
  ],
);
