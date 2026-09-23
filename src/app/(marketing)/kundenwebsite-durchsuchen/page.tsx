import Link from "next/link";

import { UseCasePage, type UseCaseContent } from "@/components/landing/use-case-page";
import { CREDITS, CREDIT_PACKAGES } from "@/lib/credit-tariff";
import { marketingPageMetadata } from "@/lib/marketing/page-metadata";

export const metadata = marketingPageMetadata({
  path: "/kundenwebsite-durchsuchen",
  title: "Kundenwebsite mit KI durchsuchen: Antworten mit Quellenlink",
  description:
    "Für Agenturen: Lies die Website deines Kunden mit CraCha ein und stell deine Fragen auf Deutsch. Jede Antwort verlinkt die passende Unterseite. 100 Start-Credits ohne Kreditkarte.",
  keywords: ["Kundenwebsite durchsuchen", "Website analysieren KI", "Agentur Recherche KI", "Content Audit KI", "Website Fragen stellen"],
});

// A worked example, computed from the tariff so it cannot drift from the price list.
const examplePages = 80;
const startPack = CREDIT_PACKAGES[0];
const exampleAnswers = Math.floor((startPack.credits - examplePages * CREDITS.perPage) / CREDITS.perChatMessage);
const euro = (cents: number) => new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(cents / 100);

const content: UseCaseContent = {
  eyebrow: "Für Agenturen und Marketing-Teams",
  heading: "Die Website deines Kunden durchsuchen – mit Quellenlink zu jeder Antwort",
  intro:
    "Neuer Kunde, neues Briefing, dutzende Unterseiten? Lies die Website einmal mit CraCha ein und frag dann einfach: Welche Leistungen werden angeboten? Wie spricht die Marke ihre Zielgruppe an? Jede Antwort verlinkt die Seite, aus der sie stammt – so findest du die richtige Stelle für Konzept, Pitch oder Abstimmung sofort wieder.",
  benefits: [
    {
      title: "Schneller eingearbeitet",
      text: "Statt Seite für Seite zu lesen, stellst du Fragen und bekommst eine Antwort mit den passenden Unterseiten.",
    },
    {
      title: "Aussagen belegen",
      text: "Unter jeder Antwort stehen die Quellseiten als Links – hilfreich für Content-Audits, Faktenchecks und Rückfragen an den Kunden.",
    },
    {
      title: "Eine Wissensbasis pro Kunde",
      text: `Bis zu ${CREDITS.maxDatabases} Wissensbasen je Konto. Die eingelesenen Inhalte bleiben verfügbar, bis du sie löschst.`,
    },
    {
      title: "Auf Deutsch",
      text: "Du fragst in deinen eigenen Worten auf Deutsch – ohne Suchoperatoren und ohne die Seitenstruktur der Website zu kennen.",
    },
  ],
  exampleQuestions: [
    "Welche Leistungen und Produkte stellt [Kunde] auf der Website vor? Verlinke jeweils die passende Seite.",
    "Welche Zielgruppen spricht die Website an, und mit welchen Argumenten?",
    "Welche Angaben macht die Website zu [Thema, z. B. Preisen, Standorten oder Lieferzeiten]?",
    "Mit welchen Begriffen beschreibt [Kunde] sein Produkt [Name]?",
  ],
  steps: [
    {
      title: "Kostenlos registrieren.",
      text: `Konto anlegen und E-Mail-Adresse bestätigen. Du startest mit ${CREDITS.welcome} Credits, eine Kreditkarte brauchst du nicht.`,
    },
    {
      title: "Kundenwebsite eintragen.",
      text: "Gib im Dashboard die Start-Adresse ein und wähle, ob CraCha verlinkten Seiten folgen oder die Sitemap nutzen soll. Mit Mustern beschränkst du das Einlesen auf bestimmte Bereiche, etwa nur die Leistungsseiten.",
    },
    {
      title: "Einlesen lassen.",
      text: "Im Dashboard siehst du den Fortschritt. Sobald die Wissensbasis bereit ist, kannst du fragen.",
    },
    {
      title: "Fragen und Quellen öffnen.",
      text: "Stell deine Frage im Chat und spring über die Quellenlinks direkt zur passenden Unterseite.",
    },
  ],
  limits: [
    "CraCha liest nur öffentlich erreichbare HTML-Seiten ein. Login-Bereiche, Paywalls und PDF-Dateien gehören nicht dazu.",
    "Die robots.txt der Website wird standardmäßig beachtet; dort gesperrte Bereiche fehlen dann in der Wissensbasis.",
    "Pro Einlesevorgang sind bis zu 500 Seiten möglich, sofern sie erreichbar sind und dein Guthaben reicht.",
    "CraCha arbeitet mit dem Stand des Einlesens. Ändert der Kunde seine Website, liest du sie erneut ein; das verbraucht wieder Credits.",
    "Ein Chatwidget, das du auf der Kundenwebsite einbinden kannst, ist nicht enthalten.",
    "Auch Antworten mit Quellen können unvollständig oder falsch sein. Prüfe Aussagen im Original, bevor du sie an Kunden weitergibst.",
  ],
  faq: [
    {
      question: "Darf ich die Website eines Kunden mit CraCha einlesen?",
      answer:
        "CraCha ruft nur öffentlich erreichbare Seiten ab und beachtet standardmäßig die robots.txt. Ob du die Inhalte für deinen Zweck auswerten darfst, hängt von deinem Auftrag und den Inhalten ab; im Zweifel sprich es mit deinem Kunden ab. Näheres regeln die Nutzungsbedingungen.",
    },
    {
      question: "Was kostet das für eine typische Kundenwebsite?",
      answer: `Jede eingelesene Seite kostet ${CREDITS.perPage} Credit, jede Antwort ${CREDITS.perChatMessage} Credits. Eine Website mit ${examplePages} Seiten kostet also einmalig ${examplePages * CREDITS.perPage} Credits. Mit dem Paket ${startPack.label} (${startPack.credits.toLocaleString("de-DE")} Credits für ${euro(startPack.priceCents)}) bleiben danach Credits für ${exampleAnswers} Antworten. Einmalige Aufladung, kein Abo.`,
    },
    {
      question: "Kann mein Kunde den Chat selbst nutzen?",
      answer:
        "Nicht als eingebettetes Chatwidget auf seiner Website. CraCha ist ein Recherchewerkzeug in deinem eigenen Konto.",
    },
    {
      question: "Werden Änderungen an der Website automatisch übernommen?",
      answer:
        "Nein. CraCha arbeitet mit dem Stand des letzten Einlesens. Nach Änderungen an der Website liest du sie erneut ein.",
    },
    {
      question: "Kann ich mehrere Kunden getrennt halten?",
      answer: `Ja. Lege pro Kunde eine eigene Wissensbasis an; bis zu ${CREDITS.maxDatabases} sind je Konto möglich. Zum Fragen öffnest du jeweils die Wissensbasis des Kunden, um den es gerade geht.`,
    },
  ],
  cta: {
    heading: "Probier es mit einer echten Kundenwebsite aus",
    text: `Du brauchst nur die Adresse und eine konkrete Frage. Mit ${CREDITS.welcome} Start-Credits kannst du zum Beispiel 20 Seiten einlesen und danach ${Math.floor((CREDITS.welcome - 20 * CREDITS.perPage) / CREDITS.perChatMessage)} Fragen stellen – ohne Kreditkarte.`,
  },
};

export default function KundenwebsiteDurchsuchenPage() {
  return (
    <>
      <UseCasePage content={content} />
      <p className="mx-auto max-w-3xl px-5 pb-16 text-sm text-muted-foreground">
        Du willst eher eine technische Dokumentation befragen?{" "}
        <Link href="/dokumentation-durchsuchen" className="underline underline-offset-4">Dokumentation mit KI durchsuchen</Link>
      </p>
    </>
  );
}
