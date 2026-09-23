import Link from "next/link";

import { AppEntryLink } from "@/components/landing/app-entry-link";
import { usageExamples } from "@/lib/marketing/examples";
import { marketingPageMetadata } from "@/lib/marketing/page-metadata";

export const metadata = marketingPageMetadata({
  path: "/beispiele",
  title: "Beispiele zur Nutzung: Was du mit CraCha fragen kannst",
  description:
    "Von der Firmenwebsite über Dokumentationen und Hilfe-Center bis zu Förderprogrammen: Beispiele, wie du Websites mit CraCha in eine Wissensbasis verwandelst – mit Beispielfragen.",
  keywords: ["Website mit KI durchsuchen Beispiele", "Website Wissensbasis Beispiele", "Fragen an eine Website stellen"],
});

const ctaClass =
  "inline-flex min-h-11 items-center justify-center rounded-full bg-primary px-6 py-3 font-medium text-primary-foreground focus-visible:outline-2 focus-visible:outline-offset-4";

export default function BeispielePage() {
  return (
    <article className="mx-auto max-w-5xl space-y-14 px-5 py-12 sm:py-20">
      <header className="max-w-3xl">
        <Link href="/" className="text-sm text-muted-foreground underline">CraCha kennenlernen</Link>
        <h1 className="mt-6 text-balance text-4xl font-bold tracking-tight sm:text-5xl">Beispiele zur Nutzung</h1>
        <p className="mt-5 text-lg leading-8 text-muted-foreground">
          CraCha passt überall dort, wo die Antwort irgendwo auf einer Website mit vielen Unterseiten steht. Du gibst
          die Start-URL ein, CraCha findet und liest die Unterseiten ein, und du stellst deine Fragen – jede Antwort
          mit Link zur Quelle. Hier ein paar Anregungen.
        </p>
        <p className="mt-4 text-sm leading-6 text-muted-foreground">
          Die Fragen sind Formulierungshilfen, keine aufgezeichneten Ergebnisse. Ersetze die Platzhalter in eckigen
          Klammern durch deine eigenen Begriffe.
        </p>
      </header>

      <div className="grid gap-4 md:grid-cols-2">
        {usageExamples.map((example) => (
          <section key={example.id} id={example.id} className="scroll-mt-24 rounded-2xl border p-6">
            <h2 className="text-xl font-semibold">{example.title}</h2>
            <p className="mt-3 leading-7 text-muted-foreground">{example.description}</p>
            <h3 className="mt-5 text-sm font-medium">Beispielfragen</h3>
            <ul className="mt-2 list-disc space-y-2 pl-5 leading-7">
              {example.questions.map((question) => <li key={question}>{question}</li>)}
            </ul>
            {example.note && <p className="mt-4 text-sm leading-6 text-muted-foreground">{example.note}</p>}
            {example.more && (
              <Link href={example.more.href} className="mt-4 inline-block py-1 font-medium underline underline-offset-4">
                {example.more.label}
              </Link>
            )}
          </section>
        ))}
      </div>

      <section className="max-w-3xl space-y-4">
        <h2 className="text-2xl font-semibold">Was für alle Beispiele gilt</h2>
        <ul className="list-disc space-y-3 pl-5 leading-7 text-muted-foreground">
          <li>CraCha liest öffentlich erreichbare HTML-Seiten ein. Login-Bereiche, Paywalls und PDF-Dateien gehören nicht dazu.</li>
          <li>Pro Einlesevorgang sind bis zu 500 Seiten möglich. Mit Mustern beschränkst du das Einlesen auf die Bereiche, die du brauchst.</li>
          <li>CraCha arbeitet mit dem Stand des Einlesens. Ändert sich die Website, liest du sie erneut ein.</li>
          <li>Auch Antworten mit Quellen können unvollständig oder falsch sein. Prüfe Wichtiges über den Quellenlink im Original.</li>
        </ul>
      </section>

      <div className="max-w-3xl rounded-2xl border p-6">
        <h2 className="text-2xl font-semibold">Probier es mit deiner Website aus</h2>
        <p className="mb-5 mt-3 leading-7 text-muted-foreground">
          Du brauchst nur eine Start-URL und eine konkrete Frage. 100 Start-Credits gratis, keine Kreditkarte nötig.
        </p>
        <AppEntryLink signedOutHref="/register" className={ctaClass}>Kostenlos starten</AppEntryLink>
      </div>
    </article>
  );
}
