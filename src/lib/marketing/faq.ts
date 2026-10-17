import { CREDITS, CREDIT_PACKAGES } from "@/lib/credit-tariff";

export interface FaqItem {
  question: string;
  answer: string;
}

const lowestPackPrice = new Intl.NumberFormat("de-DE", {
  style: "currency",
  currency: "EUR",
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
}).format(Math.min(...CREDIT_PACKAGES.map((pack) => pack.priceCents)) / 100);

/**
 * The landing page FAQ. The visible list and the FAQPage JSON-LD both render
 * from this array, so what a search engine reads is exactly what a visitor
 * reads — plain strings, because structured data cannot carry markup.
 *
 * The caveats that used to sit in the hero and the feature cards live here,
 * and so does the price: one item instead of a tariff table and a calculator.
 */
export const landingFaq: FaqItem[] = [
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
    answer: `Du startest mit ${CREDITS.welcome} Start-Credits gratis, ohne Kreditkarte. Danach kaufst du bei Bedarf Credit-Pakete ab ${lowestPackPrice} – einmalige Aufladung, kein Abo. Eine gecrawlte Seite kostet ${CREDITS.perPage} Credit, eine Antwort ${CREDITS.perChatMessage} Credits. Alle Pakete mit Rechenbeispielen stehen auf der Seite „Preise“.`,
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
];
