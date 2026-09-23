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
    question: "Für wen ist CraCha gedacht?",
    answer:
      "Für alle, die Antworten aus Websites mit vielen Unterseiten brauchen – ob Firmenwebsite, Dokumentation, Hilfe-Center oder Hochschulseite. Du arbeitest im Browser in deinem eigenen CraCha-Konto. Anregungen findest du auf der Seite „Beispiele zur Nutzung“.",
  },
  {
    question: "Was unterscheidet CraCha von Suchmaschinen wie Perplexity?",
    answer:
      "Eine KI-Suche sucht bei jeder Frage neu nach einzelnen Treffern im Netz. CraCha liest die Unterseiten einer Website ein – bis zu 500 pro Durchgang – und speichert sie als Wissensbasis in deinem Konto. Deine Fragen beziehen sich dann genau auf diese Inhalte, auch auf Seiten, die eine Suchmaschine nicht weit oben zeigt.",
  },
  {
    question: "Welche Inhalte kann ich verwenden?",
    answer:
      "Öffentlich erreichbare HTML-Seiten, die du einlesen darfst. Login-Bereiche, Paywalls und PDF-Dateien werden nicht eingelesen. Wie viele Seiten CraCha erreicht, hängt von Verlinkung, Sitemap und technischen Sperren der Website ab.",
  },
  {
    question: "Was kostet CraCha?",
    answer: `Du startest mit ${CREDITS.welcome} Start-Credits gratis, ohne Kreditkarte. Danach kaufst du bei Bedarf Credit-Pakete ab ${lowestPackPrice} – einmalige Aufladung, kein Abo. Eine eingelesene Seite kostet ${CREDITS.perPage} Credit, eine Antwort ${CREDITS.perChatMessage} Credits.`,
  },
  {
    question: "Sind die Antworten immer richtig?",
    answer:
      "Nein. Auch Antworten mit Quellen können unvollständig oder falsch sein. Deshalb verlinkt jede Antwort die Seiten, auf die sie sich stützt – prüfe Wichtiges im Original. CraCha kennt den Stand des Einlesens; ändert sich die Website, liest du sie erneut ein.",
  },
  {
    question: "Kann ich CraCha als Chatwidget auf einer Website einbinden?",
    answer:
      "Nein, derzeit nicht. CraCha ist ein Recherchewerkzeug in deinem eigenen Konto, kein Chatwidget zum Einbetten.",
  },
  {
    question: "Muss ich Software installieren?",
    answer:
      "Nein. CraCha läuft im Browser. Du registrierst dich, bestätigst deine E-Mail-Adresse und kannst im Dashboard deine erste Website einlesen.",
  },
];
