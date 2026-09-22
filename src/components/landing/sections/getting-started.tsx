import Link from "next/link";
import { CREDITS, CREDIT_PACKAGES } from "@/lib/credit-tariff";
import MaxWidthWrapper from "@/components/shared/max-width-wrapper";

const questions = [
  ["Für wen ist CraCha gedacht?", "Für Menschen, die regelmäßig in öffentlichen Websites recherchieren: etwa in Produktdokumentationen, Hilfecentern oder umfangreichen Angebotsseiten. Du stellst Fragen in deinem eigenen CraCha-Konto. Ein Chatwidget zum Einbetten auf einer Kundenwebsite ist derzeit nicht enthalten."],
  ["Was unterscheidet CraCha von Suchmaschinen wie Perplexity?", "Statt bei jeder einzelnen Frage eine flüchtige Websuche nach Schlagwörtern neu zu starten, liest CraCha Websites und Dokumentationen rekursiv mit bis zu hunderten Unterseiten ein und sichert sie als dauerhafte Wissensbasis. So können beispielsweise Marketing-Teams den gesamten Internetauftritt von Kunden zur Content-Verifikation und zum Faktenabgleich nutzen, während Entwickler ganze API- und Framework-Docs dauerhaft als Coding-Referenz parat haben."],
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
            <p className="mt-4 leading-7 text-muted-foreground">Du startest mit {CREDITS.welcome} Credits ohne Kreditkarte. Eine eingelesene und indexierte Seite kostet {CREDITS.perPage} Credit, eine Chat-Antwort {CREDITS.perChatMessage} Credits.</p>
          </div>
          <div className="rounded-2xl border bg-background p-6">
            <h3 className="font-semibold">Beispiel für deinen ersten Test</h3>
            <dl className="mt-4 space-y-3 text-sm">
              <div className="flex justify-between gap-4"><dt>Startguthaben</dt><dd>{CREDITS.welcome} Credits</dd></div>
              <div className="flex justify-between gap-4"><dt>20 Seiten einlesen</dt><dd>−{20 * CREDITS.perPage} Credits</dd></div>
              <div className="flex justify-between gap-4 border-t pt-3"><dt>Für bis zu {Math.floor((CREDITS.welcome - 20 * CREDITS.perPage) / CREDITS.perChatMessage)} Fragen übrig</dt><dd>{CREDITS.welcome - 20 * CREDITS.perPage} Credits</dd></div>
            </dl>
            <p className="mt-4 text-xs leading-5 text-muted-foreground">Rechenbeispiel bei vollständig eingelesenen 20 Seiten und ohne weitere Nutzung. Wähle für den Test einen überschaubaren Bereich.</p>
          </div>
        </div>
        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          {CREDIT_PACKAGES.map(pack => <div key={pack.id} className="rounded-2xl border bg-background p-6">
            <h3 className="font-semibold">{pack.label}</h3>
            <p className="mt-3 text-3xl font-semibold">{new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(pack.priceCents / 100)}</p>
            <p className="mt-2 font-medium">{pack.credits.toLocaleString('de-DE')} Credits</p>
            <p className="mt-2 text-sm text-muted-foreground">Zum Beispiel {Math.floor(pack.credits / CREDITS.perChatMessage).toLocaleString('de-DE')} Antworten auf bereits eingelesene Inhalte – oder eine Mischung aus Einlesen und Fragen.</p>
            <Link href="/register" className="mt-4 inline-block rounded-full border px-4 py-2 text-sm font-medium">Kostenlos starten</Link>
          </div>)}
        </div>
        <p className="mt-4 text-sm text-muted-foreground">Einmalige Aufladung, kein Abonnement und keine automatische Nachbuchung. Alle Preise inklusive ggf. anfallender Umsatzsteuer. Credits sind feste Nutzungseinheiten, keine nach Antwortlänge abgerechneten KI-Tokens. Bis zu {CREDITS.maxDatabases} Wissensbasen je Konto.</p>
        <div className="mt-12 rounded-2xl border p-6">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Illustratives Beispiel · redaktionell geprüft, kein Live-Chat</p>
          <h3 className="mt-3 text-xl font-semibold">Eine Dokumentation gezielt befragen</h3>
          <p className="mt-4 font-medium">„Wie öffne ich in HTML einen Link in einem neuen Tab?“</p>
          <p className="mt-3 leading-7 text-muted-foreground">Beim Link-Element verwendest du das Attribut <code>target=&quot;_blank&quot;</code>. Ob ein neuer Tab oder ein Fenster geöffnet wird, hängt vom Browser ab. Der Link sollte erkennen lassen, dass er einen neuen Kontext öffnet.</p>
          <a className="mt-3 inline-block text-sm underline" href="https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/a" target="_blank" rel="noopener noreferrer">Quelle prüfen: MDN – das HTML-Link-Element</a>
          <p className="mt-3 text-sm text-muted-foreground">So kannst du Aussagen im Original nachlesen. Die tatsächliche Antwort hängt davon ab, welche Seiten du eingelesen hast. Stand des Beispiels: 20. September 2026.</p>
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
