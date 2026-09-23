export interface UsageExample {
  /** Anchor on /beispiele, so the landing teaser can jump to one example. */
  id: string;
  title: string;
  description: string;
  questions: string[];
  /** A longer page about this use case, where one exists. */
  more?: { href: `/${string}`; label: string };
  /** A limit that matters for this kind of website specifically. */
  note?: string;
}

/**
 * The examples on /beispiele and the teaser on the landing page. Chosen from
 * how website-crawling and "chat with your site" tools are commonly used —
 * restricted to what CraCha actually reads: public HTML pages, no login areas
 * and no PDF files. The questions are phrasing aids, not recorded results.
 */
export const usageExamples: UsageExample[] = [
  {
    id: "firmenwebsite",
    title: "Eine Firmen- oder Kundenwebsite verstehen",
    description:
      "Neuer Kunde, neuer Arbeitgeber, neuer Geschäftspartner: Lies die Website einmal ein und frag nach Leistungen, Zielgruppen und Formulierungen, statt jede Unterseite zu lesen.",
    questions: [
      "Welche Leistungen bietet das Unternehmen an, und auf welcher Seite steht jeweils mehr dazu?",
      "Welche Zielgruppen spricht die Website an?",
      "Was sagt die Website über Standorte, Ansprechpartner und Kontaktwege?",
    ],
    more: { href: "/kundenwebsite-durchsuchen", label: "Mehr zum Durchsuchen von Kundenwebsites" },
  },
  {
    id: "dokumentation",
    title: "Software- und Produktdokumentation",
    description:
      "Große Docs mit hunderten Seiten gezielt befragen: Konfiguration, API-Details, Migrationsschritte – mit Link zur passenden Doku-Seite.",
    questions: [
      "Welche Voraussetzungen nennt die Dokumentation für die Installation?",
      "Wie konfiguriere ich [Funktion], und welche Optionen gibt es dafür?",
      "Was ändert sich beim Umstieg von Version [X] auf [Y]?",
    ],
    more: { href: "/dokumentation-durchsuchen", label: "Mehr zum Durchsuchen von Dokumentationen" },
  },
  {
    id: "hilfe-center",
    title: "Hilfe-Center und FAQ-Bereiche",
    description:
      "Die Antwort steht irgendwo zwischen dutzenden Hilfeartikeln? Lies den Hilfebereich ein und frag in deinen eigenen Worten, ohne die richtigen Suchbegriffe kennen zu müssen.",
    questions: [
      "Wie kann ich mein Konto kündigen oder den Tarif wechseln?",
      "Was muss ich tun, wenn [Fehlermeldung] erscheint?",
      "Welche Fristen gelten für Rückgabe und Erstattung?",
    ],
  },
  {
    id: "hochschule",
    title: "Hochschul- und Studieninfos",
    description:
      "Studiengänge, Zulassung, Fristen und Prüfungsordnungen verteilen sich oft über viele Seiten einer Hochschul-Website. Frag gezielt nach dem, was für dich gilt.",
    questions: [
      "Welche Zulassungsvoraussetzungen gelten für den Master [Studiengang]?",
      "Bis wann muss ich mich für das Wintersemester bewerben?",
      "Welche Schwerpunkte kann ich im Studiengang [Name] wählen?",
    ],
    note: "Prüfungs- und Studienordnungen liegen oft als PDF vor. PDF-Dateien liest CraCha nicht ein, nur die HTML-Seiten.",
  },
  {
    id: "foerderprogramme",
    title: "Förderprogramme und Behördenseiten",
    description:
      "Voraussetzungen, Antragswege und benötigte Unterlagen sind auf Förder- und Verwaltungsseiten oft verstreut. Lass dir die Informationen zusammentragen – mit Link zur Originalseite zum Nachlesen.",
    questions: [
      "Wer ist für das Programm [Name] antragsberechtigt?",
      "Welche Unterlagen brauche ich für den Antrag?",
      "Welche Fristen und Förderhöhen nennt die Website?",
    ],
    note: "Verbindlich ist immer die Originalseite. Prüfe Angaben zu Fristen und Beträgen dort, bevor du dich darauf verlässt.",
  },
  {
    id: "marktrecherche",
    title: "Wettbewerber- und Marktrecherche",
    description:
      "Lies die Websites mehrerer Anbieter in je eine eigene Wissensbasis ein und vergleiche Angebote, Positionierung und Argumente – belegt mit den Seiten, auf denen es steht.",
    questions: [
      "Welche Produkte und Pakete bietet [Anbieter] an?",
      "Mit welchen Argumenten wirbt [Anbieter] um Neukunden?",
      "Welche Branchen oder Referenzen nennt die Website?",
    ],
  },
  {
    id: "onboarding",
    title: "Einarbeitung in ein neues Projekt oder Thema",
    description:
      "Neu im Team, im Open-Source-Projekt oder in einem Fachgebiet? Lies die öffentlichen Seiten ein und stell die Fragen, die du sonst Kolleginnen und Kollegen stellen würdest.",
    questions: [
      "Wie ist das Projekt aufgebaut, und wo fange ich am besten an?",
      "Welche Richtlinien gelten für Beiträge oder Änderungen?",
      "Welche Begriffe werden auf der Website erklärt, und was bedeuten sie?",
    ],
  },
  {
    id: "produktkatalog",
    title: "Shops und Produktkataloge",
    description:
      "Produktseiten enthalten Maße, Materialien, Kompatibilität und Lieferbedingungen. Frag danach, statt dich durch Kategorien und Filter zu klicken.",
    questions: [
      "Welche Modelle sind mit [Gerät] kompatibel?",
      "Welche Produkte gibt es aus [Material] oder in [Größe]?",
      "Was steht zu Versand, Lieferzeit und Garantie?",
    ],
    note: "Preise und Verfügbarkeit ändern sich schnell. CraCha kennt den Stand des Einlesens.",
  },
  {
    id: "wissensartikel",
    title: "Blogs, Magazine und Wissensartikel",
    description:
      "Ein Blog oder Ratgeber mit hunderten Artikeln wird zum Nachschlagewerk: Frag nach einem Thema und bekomm die passenden Artikel verlinkt.",
    questions: [
      "Welche Artikel behandeln [Thema], und was sind die wichtigsten Aussagen?",
      "Welche Tipps gibt der Ratgeber zu [Problem]?",
      "Was empfehlen die Artikel für Einsteiger in [Thema]?",
    ],
  },
  {
    id: "eigene-website",
    title: "Die eigene Website prüfen",
    description:
      "Widersprechen sich Angaben auf verschiedenen Unterseiten? Fehlt etwas, das Kunden oft fragen? Befrag deine eigene Website so, wie es ein Besucher tun würde.",
    questions: [
      "Welche Öffnungszeiten, Preise oder Kontaktdaten nennt die Website – und stimmen sie überall überein?",
      "Beantwortet die Website, wie [Leistung] abläuft?",
      "Auf welchen Seiten wird [Produkt] erwähnt?",
    ],
  },
];
