import { CREDITS } from "@/lib/credit-tariff";

export interface FaqItem {
  question: string;
  answer: string;
}

/**
 * The landing page FAQ. The visible list and the FAQPage JSON-LD both render
 * from this array, so what a search engine reads is exactly what a visitor
 * reads — plain strings, because structured data cannot carry markup.
 *
 * The caveats that used to sit in the hero and the feature cards live here:
 * still on the page, but no longer the first thing a visitor reads.
 */
export const landingFaq: FaqItem[] = [
  {
    question: "Für wen ist CraCha gedacht?",
    answer:
      "Für alle, die regelmäßig Antworten aus umfangreichen Websites brauchen: Agenturen und Marketing-Teams, die sich schnell in die Website eines Kunden einarbeiten wollen, und Entwicklerinnen und Entwickler, die große Dokumentationen befragen. Du arbeitest im Browser in deinem eigenen CraCha-Konto.",
  },
  {
    question: "Was unterscheidet CraCha von Suchmaschinen wie Perplexity?",
    answer:
      "Statt bei jeder einzelnen Frage eine flüchtige Websuche nach Schlagwörtern neu zu starten, liest CraCha Websites und Dokumentationen rekursiv mit bis zu hunderten Unterseiten ein und sichert sie als dauerhafte Wissensbasis. So können beispielsweise Marketing-Teams den gesamten Internetauftritt von Kunden zur Content-Verifikation und zum Faktenabgleich nutzen, während Entwickler ganze API- und Framework-Docs dauerhaft als Coding-Referenz parat haben.",
  },
  {
    question: "Welche Inhalte kann ich verwenden?",
    answer:
      "Öffentliche, zugängliche HTML-Seiten, die du einlesen darfst. Login-Bereiche, Paywalls, PDF-Uploads und jede beliebige Website werden nicht unterstützt oder garantiert. Umfang, Verlinkung und technische Sperren beeinflussen, welche Seiten erreicht werden.",
  },
  {
    question: "Sind die Antworten immer richtig?",
    answer:
      "Nein. Auch Antworten mit Quellen können unvollständig oder falsch sein. Deshalb verlinkt jede Antwort die Seiten, auf die sie sich stützt: Prüfe wichtige Aussagen im Original. CraCha arbeitet mit den eingelesenen Inhalten; spätere Änderungen einer Website erfordern ein erneutes Einlesen.",
  },
  {
    question: "Kann ich CraCha als Chatwidget auf einer Website einbinden?",
    answer:
      "Derzeit nicht. CraCha ist ein Recherchewerkzeug in deinem eigenen Konto. Ein Chatwidget zum Einbetten auf deiner Website oder der Website eines Kunden ist nicht enthalten.",
  },
  {
    question: "Was passiert nach dem Startguthaben?",
    answer: `Du startest mit ${CREDITS.welcome} Credits ohne Kreditkarte. Zum Weiterarbeiten brauchst du ausreichend Credits. Zusätzliche Credit-Pakete kannst du bei Bedarf im Dashboard kaufen. Vor einer Bestellung siehst du den Preis im Checkout. Durch das Aufbrauchen des Startguthabens wird kein Kauf ausgelöst.`,
  },
  {
    question: "Muss ich Software installieren?",
    answer:
      "Nein. CraCha läuft im Browser. Nach der Registrierung bestätigst du deine E-Mail-Adresse und kannst im Dashboard eine Website einlesen.",
  },
];
