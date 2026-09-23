import type { Metadata } from "next";
import Link from "next/link";
import socialImage from "../opengraph-image.png";
import { AppEntryLink } from "@/components/landing/app-entry-link";

const title = "Website mit KI durchsuchen: Anleitung und Beispielfragen";
const description = "So recherchierst du mit CraCha in Website-Inhalten: passende Seiten auswählen, Fragen formulieren, Quellen prüfen und das Startguthaben sinnvoll nutzen.";
export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: "/website-mit-ki-durchsuchen" },
  openGraph: { title, description, type: "article", locale: "de_DE", url: "/website-mit-ki-durchsuchen", images: [{ url: socialImage.src, width: socialImage.width, height: socialImage.height, alt: "CraCha" }] },
  twitter: { card: "summary_large_image", title, description, images: [socialImage.src] },
};

export default function WebsiteGuide() {
  return (
    <article className="mx-auto max-w-3xl space-y-10 px-5 py-12 sm:py-20">
      <header>
        <Link href="/" className="text-sm text-muted-foreground underline">CraCha kennenlernen</Link>
        <h1 className="mt-6 text-4xl font-bold tracking-tight sm:text-5xl">Eine Website mit KI durchsuchen</h1>
        <p className="mt-5 text-lg leading-8 text-muted-foreground">Die gesuchte Information steckt irgendwo zwischen Produktseiten, Hilfeartikeln und Dokumentation. Mit CraCha kannst du ausgewählte Website-Inhalte einlesen und anschließend in deinem Konto Fragen dazu stellen. Hier erfährst du, wann das hilft und wie du klein anfängst.</p>
      </header>
      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Wann lohnt sich ein Website-Chat?</h2>
        <p className="leading-7 text-muted-foreground">Wenn du wiederholt Informationen aus mehreren Seiten einer Website zusammentragen musst. Zum Beispiel, wenn du für eine Beratung Produkteigenschaften recherchierst oder regelmäßig eine umfangreiche Hilfedokumentation nutzt. Für eine einzelne bekannte Textstelle ist die Suche im Browser oft schon ausreichend.</p>
        <p className="leading-7 text-muted-foreground">CraCha ist eine Rechercheanwendung. Du baust damit derzeit keinen öffentlich eingebetteten Supportbot und durchsuchst auch nicht automatisch das gesamte Internet.</p>
      </section>
      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Zwei typische Anwendungsfälle</h2>
        <ul className="list-disc space-y-3 pl-5 leading-7 text-muted-foreground">
          <li><Link href="/kundenwebsite-durchsuchen" className="font-medium text-foreground underline underline-offset-4">Kundenwebsite durchsuchen</Link>: für Agenturen und Marketing-Teams, die sich schnell in die Website eines Kunden einarbeiten wollen.</li>
          <li><Link href="/dokumentation-durchsuchen" className="font-medium text-foreground underline underline-offset-4">Dokumentation durchsuchen</Link>: für Entwicklerinnen und Entwickler, die große Docs gezielt befragen wollen.</li>
        </ul>
      </section>
      <section className="space-y-5">
        <h2 className="text-2xl font-semibold">Von der Website zur ersten prüfbaren Antwort</h2>
        <ol className="list-decimal space-y-5 pl-6 leading-7 text-muted-foreground">
          <li><strong className="text-foreground">Eine Aufgabe festlegen.</strong> Notiere eine konkrete Frage, deren Antwort du auf der Website erwartest. Wähle einen öffentlichen Bereich, den du einlesen darfst.</li>
          <li><strong className="text-foreground">Konto erstellen und bestätigen.</strong> Öffne den Bestätigungslink in deiner E-Mail. Falls die Nachricht fehlt, prüfe auch den Spam-Ordner.</li>
          <li><strong className="text-foreground">Klein anfangen.</strong> Starte im Dashboard einen Crawl, also das Einlesen von Seiten. Vergib einen Namen und beginne mit höchstens 20 Seiten. Nutze bei Bedarf einen passenden Unterbereich statt der ganzen Website.</li>
          <li><strong className="text-foreground">Auf die Aufbereitung warten.</strong> Öffne deine Wissensbasis erst, wenn sie bereit ist. Nicht erreichbare oder gesperrte Seiten können fehlen.</li>
          <li><strong className="text-foreground">Fragen und nachprüfen.</strong> Öffne die Wissensbasis über „Fragen“. Lies die verlinkten Originalseiten und prüfe, ob sie die Aussagen tatsächlich tragen.</li>
        </ol>
      </section>
      <section className="rounded-2xl border bg-muted/30 p-6">
        <h2 className="text-2xl font-semibold">Drei Beispielfragen für eine Produktdokumentation</h2>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">Formulierungshilfen, keine aufgezeichneten Produktergebnisse. Ersetze die Platzhalter durch Begriffe aus deiner Website.</p>
        <ul className="mt-5 list-disc space-y-3 pl-5 leading-7">
          <li>Welche Voraussetzungen nennt die Dokumentation für die Installation von [Produkt]?</li>
          <li>Wie unterscheiden sich [Option A] und [Option B] laut den eingelesenen Seiten?</li>
          <li>Welche Einschränkungen werden für [Funktion] genannt? Verlinke die passenden Quellen.</li>
        </ul>
        <p className="mt-5 leading-7 text-muted-foreground">Bleibt die Antwort unklar, frage nach einem einzelnen Teilaspekt. Fehlt die relevante Seite in der Wissensbasis, kann auch eine anders formulierte Frage diese Quelle nicht ersetzen.</p>
      </section>
      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Das Startguthaben für den ganzen Ablauf nutzen</h2>
        <p className="leading-7 text-muted-foreground">100 Start-Credits reichen beispielsweise für 20 indexierte Seiten und danach bis zu 16 Antworten: 20 × 1 Credit + 16 × 5 Credits = 100 Credits. Wer zuerst 100 Seiten einliest, hat dagegen kein Startguthaben mehr für Fragen. Ein erneutes Einlesen verbraucht ebenfalls Credits.</p>
        <Link href="/#kosten" className="inline-block underline underline-offset-4">Kosten und häufige Fragen ansehen</Link>
      </section>
      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Grenzen bewusst prüfen</h2>
        <p className="leading-7 text-muted-foreground">Ein Quellenlink ist keine Garantie für eine korrekte Antwort. Vergleiche wichtige Aussagen mit dem Original und prüfe dessen Aktualität. CraCha arbeitet mit einem eingelesenen Stand; Änderungen an der Quelle erscheinen erst nach erneuter Aufbereitung.</p>
        <p className="leading-7 text-muted-foreground">Login-Bereiche, Paywalls und PDF-Uploads gehören nicht zum beschriebenen Ablauf. Welche öffentlichen Seiten erreichbar sind, hängt unter anderem von Verlinkung und technischen Zugriffsbeschränkungen ab. Informiere dich in den <Link className="underline" href="/datenschutz">Datenschutzhinweisen</Link> über die Verarbeitung, bevor du Inhalte verwendest.</p>
      </section>
      <div className="rounded-2xl border p-6">
        <h2 className="text-2xl font-semibold">Teste eine Frage aus deinem Alltag</h2>
        <p className="mb-5 mt-3 leading-7 text-muted-foreground">Du brauchst eine passende öffentliche Website und eine konkrete Recherchefrage. Eine Kreditkarte ist für den Einstieg nicht erforderlich.</p>
        <AppEntryLink signedOutHref="/register" className="inline-flex min-h-11 items-center rounded-full bg-primary px-6 py-3 font-medium text-primary-foreground">Kostenlos starten</AppEntryLink>
      </div>
    </article>
  );
}
