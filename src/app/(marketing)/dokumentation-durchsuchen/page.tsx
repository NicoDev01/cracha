import Link from "next/link";

import { UseCasePage, type UseCaseContent } from "@/components/landing/use-case-page";
import { CREDITS, CREDIT_PACKAGES } from "@/lib/credit-tariff";
import { marketingPageMetadata } from "@/lib/marketing/page-metadata";

export const metadata = marketingPageMetadata({
  path: "/dokumentation-durchsuchen",
  title: "Dokumentation mit KI durchsuchen: Chat mit Quellenlinks",
  description:
    "Für Entwickler: Lies große Dokumentationen mit CraCha ein und stell deine Fragen auf Deutsch. Jede Antwort verlinkt die passende Doku-Seite. 100 Start-Credits ohne Kreditkarte.",
  keywords: ["Dokumentation durchsuchen KI", "mit Dokumentation chatten", "API Doku KI", "Developer Docs Chat", "Dokumentation Fragen stellen"],
});

const maxPagesPerCrawl = 500;
const largestPack = CREDIT_PACKAGES[CREDIT_PACKAGES.length - 1];

const content: UseCaseContent = {
  eyebrow: "Für Entwicklerinnen und Entwickler",
  heading: "Große Dokumentationen durchsuchen – mit Link zur richtigen Doku-Seite",
  intro:
    "Die Antwort steht irgendwo zwischen API-Referenz, Guides und Migrationshinweisen. Lies die Dokumentation einmal mit CraCha ein und frag direkt: Wie konfiguriere ich das? Worin unterscheiden sich diese beiden Methoden? Jede Antwort verlinkt die Doku-Seiten, aus denen sie stammt – du springst direkt an die richtige Stelle.",
  benefits: [
    {
      title: "Direkt zur richtigen Seite",
      text: "Statt dich durch Sidebar und Suchergebnisse zu klicken, bekommst du eine Antwort und die Links zu den Doku-Seiten, auf die sie sich stützt.",
    },
    {
      title: "Codebeispiele bleiben erhalten",
      text: "Codeblöcke aus der Dokumentation werden beim Einlesen unverändert übernommen, damit Antworten sich auf den tatsächlichen Code der Doku beziehen können.",
    },
    {
      title: "Fragen auf Deutsch",
      text: "Viele Dokumentationen sind englisch. Deine Fragen kannst du trotzdem auf Deutsch stellen.",
    },
    {
      title: "Deine Referenz, dauerhaft",
      text: `Die Wissensbasis bleibt in deinem Konto. Bis zu ${CREDITS.maxDatabases} Wissensbasen je Konto, etwa eine pro Framework oder Bibliothek.`,
    },
  ],
  exampleQuestions: [
    "Wie authentifiziere ich mich laut Dokumentation bei der API von [Dienst]? Verlinke die relevanten Seiten.",
    "Welche Konfigurationsoptionen gibt es für [Feature], und welche Standardwerte nennt die Doku?",
    "Was ist der Unterschied zwischen [Methode A] und [Methode B]?",
    "Welche Breaking Changes nennt der Migrationsleitfaden für Version [X]?",
  ],
  steps: [
    {
      title: "Kostenlos registrieren.",
      text: `Konto anlegen und E-Mail-Adresse bestätigen. Du startest mit ${CREDITS.welcome} Credits, eine Kreditkarte brauchst du nicht.`,
    },
    {
      title: "Doku-Adresse eintragen.",
      text: "Gib im Dashboard die Start-Adresse der Dokumentation ein. Nutze die Sitemap oder lass CraCha verlinkten Seiten bis zu fünf Ebenen tief folgen. Mit Mustern beschränkst du das Einlesen auf den Bereich, den du brauchst, etwa /docs/.",
    },
    {
      title: "Einlesen lassen.",
      text: "Im Dashboard siehst du den Fortschritt. Sobald die Wissensbasis bereit ist, kannst du fragen.",
    },
    {
      title: "Fragen und nachlesen.",
      text: "Stell deine Frage im Chat und öffne über die Quellenlinks die passende Doku-Seite.",
    },
  ],
  limits: [
    `Pro Einlesevorgang sind bis zu ${maxPagesPerCrawl} Seiten möglich. Bei sehr großen Dokumentationen beschränkst du dich am besten auf die Bereiche, die du wirklich brauchst.`,
    "Nur öffentlich erreichbare HTML-Seiten: interne Dokumentation hinter einem Login, private Repositories und PDF-Dateien werden nicht eingelesen.",
    "CraCha arbeitet mit dem Stand des Einlesens. Erscheint eine neue Version der Doku, liest du sie erneut ein. Achte darauf, die Version einzulesen, mit der du arbeitest.",
    "CraCha führt keinen Code aus. Codebeispiele in Antworten sind nicht getestet und können unvollständig oder falsch sein.",
    "Du nutzt CraCha im Browser; eine Erweiterung für deine IDE gibt es nicht.",
  ],
  faq: [
    {
      question: "Funktioniert das auch mit englischer Dokumentation?",
      answer:
        "Ja. Die eingelesene Dokumentation kann englisch sein, deine Fragen stellst du trotzdem auf Deutsch. Die Quellenlinks führen auf die Originalseiten.",
    },
    {
      question: "Wie groß darf eine Dokumentation sein?",
      answer: `Pro Einlesevorgang sind bis zu ${maxPagesPerCrawl} Seiten möglich, sofern sie erreichbar sind und dein Guthaben reicht. Jede eingelesene Seite kostet ${CREDITS.perPage} Credit, jede Antwort ${CREDITS.perChatMessage} Credits. Mit dem Paket ${largestPack.label} (${largestPack.credits.toLocaleString("de-DE")} Credits) kannst du zum Beispiel ${maxPagesPerCrawl} Seiten einlesen und danach ${Math.floor((largestPack.credits - maxPagesPerCrawl * CREDITS.perPage) / CREDITS.perChatMessage).toLocaleString("de-DE")} Fragen stellen.`,
    },
    {
      question: "Kann ich interne oder private Dokumentation einlesen?",
      answer:
        "Nein. CraCha liest nur öffentlich erreichbare Seiten ein. Bereiche hinter einer Anmeldung werden nicht abgerufen, und Dateien kannst du nicht hochladen.",
    },
    {
      question: "Kann ich mich auf den Code in den Antworten verlassen?",
      answer:
        "Nicht ungeprüft. Die Antwort stützt sich auf die verlinkten Doku-Seiten, kann aber unvollständig oder falsch sein. Vergleiche Code mit der Dokumentation und teste ihn, bevor du ihn übernimmst.",
    },
    {
      question: "Wird die Wissensbasis bei neuen Releases aktualisiert?",
      answer:
        "Nicht automatisch. CraCha arbeitet mit dem Stand des letzten Einlesens. Nach einem Update der Dokumentation liest du sie erneut ein; das verbraucht wieder Credits.",
    },
  ],
  cta: {
    heading: "Teste es mit der Doku, die du gerade offen hast",
    text: `Nimm einen überschaubaren Bereich, zum Beispiel einen Guide mit 20 Seiten. Mit ${CREDITS.welcome} Start-Credits bleiben danach noch ${Math.floor((CREDITS.welcome - 20 * CREDITS.perPage) / CREDITS.perChatMessage)} Fragen – ohne Kreditkarte.`,
  },
};

export default function DokumentationDurchsuchenPage() {
  return (
    <>
      <UseCasePage content={content} />
      <p className="mx-auto max-w-3xl px-5 pb-16 text-sm text-muted-foreground">
        Du willst eher die Website eines Kunden befragen?{" "}
        <Link href="/kundenwebsite-durchsuchen" className="underline underline-offset-4">Kundenwebsite mit KI durchsuchen</Link>
      </p>
    </>
  );
}
