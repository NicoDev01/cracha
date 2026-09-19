import Link from "next/link";
import MaxWidthWrapper from "@/components/shared/max-width-wrapper";

const questions = [
  ["Für wen ist CraCha gedacht?", "Für Menschen, die regelmäßig in öffentlichen Websites recherchieren: etwa in Produktdokumentationen, Hilfecentern oder umfangreichen Angebotsseiten. Du stellst Fragen in deinem eigenen CraCha-Konto. Ein Chatwidget zum Einbetten auf einer Kundenwebsite ist derzeit nicht enthalten."],
  ["Welche Inhalte kann ich verwenden?", "Öffentliche, zugängliche HTML-Seiten, die du einlesen darfst. Login-Bereiche, Paywalls, PDF-Uploads und jede beliebige Website werden nicht unterstützt oder garantiert. Umfang, Verlinkung und technische Sperren beeinflussen, welche Seiten erreicht werden."],
  ["Sind die Antworten immer richtig?", "Nein. Auch Antworten mit Quellen können unvollständig oder falsch sein. Prüfe wichtige Aussagen im Original. CraCha arbeitet mit den eingelesenen Inhalten; spätere Änderungen einer Website erfordern ein erneutes Einlesen."],
  ["Was passiert nach dem Startguthaben?", "Zum Weiterarbeiten brauchst du ausreichend Credits. Zusätzliche Credit-Pakete kannst du bei Bedarf im Dashboard kaufen. Vor einer Bestellung siehst du den Preis im Checkout. Durch das Aufbrauchen des Startguthabens wird kein Kauf ausgelöst."],
  ["Muss ich Software installieren?", "Nein. CraCha läuft im Browser. Nach der Registrierung bestätigst du deine E-Mail-Adresse und kannst im Dashboard eine Website einlesen."],
];

export default function GettingStarted() {
  return (
    <section id="kosten" className="scroll-mt-24 py-16 md:py-24">
      <MaxWidthWrapper>
        <div className="grid gap-8 rounded-3xl border bg-muted/30 p-6 sm:p-10 md:grid-cols-2">
          <div>
            <p className="text-sm font-medium text-muted-foreground">Erst ausprobieren, dann entscheiden</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight">Was kosten die ersten Schritte?</h2>
            <p className="mt-4 leading-7 text-muted-foreground">Du startest mit 100 Credits ohne Kreditkarte. Eine eingelesene und indexierte Seite kostet 1 Credit, eine Chat-Antwort 5 Credits.</p>
          </div>
          <div className="rounded-2xl border bg-background p-6">
            <h3 className="font-semibold">Beispiel für deinen ersten Test</h3>
            <dl className="mt-4 space-y-3 text-sm">
              <div className="flex justify-between gap-4"><dt>Startguthaben</dt><dd>100 Credits</dd></div>
              <div className="flex justify-between gap-4"><dt>20 Seiten einlesen</dt><dd>−20 Credits</dd></div>
              <div className="flex justify-between gap-4 border-t pt-3"><dt>Für bis zu 16 Fragen übrig</dt><dd>80 Credits</dd></div>
            </dl>
            <p className="mt-4 text-xs leading-5 text-muted-foreground">Rechenbeispiel bei vollständig eingelesenen 20 Seiten und ohne weitere Nutzung. Wähle für den Test einen überschaubaren Bereich.</p>
          </div>
        </div>
        <div id="fragen" className="mx-auto mt-14 max-w-3xl scroll-mt-24">
          <h2 className="mb-6 text-2xl font-semibold">Gut zu wissen, bevor du startest</h2>
          {questions.map(([question, answer]) => (
            <details key={question} className="border-b py-4">
              <summary className="cursor-pointer py-2 font-medium focus-visible:outline-2 focus-visible:outline-offset-4">{question}</summary>
              <p className="pb-2 pt-3 leading-7 text-muted-foreground">{answer}</p>
            </details>
          ))}
          <Link href="/website-mit-ki-durchsuchen" className="mt-6 inline-block py-2 font-medium underline underline-offset-4">Website mit KI durchsuchen: Anleitung und Beispielfragen</Link>
        </div>
      </MaxWidthWrapper>
    </section>
  );
}
