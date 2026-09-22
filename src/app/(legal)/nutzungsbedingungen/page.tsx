import type { Metadata } from "next";
import Link from "next/link";

import { LegalPage, List, Section } from "@/components/legal/legal-page";

export const metadata: Metadata = {
  alternates: { canonical: "/nutzungsbedingungen" },
  title: "Nutzungsbedingungen",
  description:
    "Bedingungen für die Nutzung von CraCha: Konto, Credit-Modell, erlaubte Nutzung, Verantwortung für abgerufene Websites, Haftung und Laufzeit.",
};

export default function NutzungsbedingungenPage() {
  return (
    <LegalPage
      title="Nutzungsbedingungen"
      updated="20. September 2026"
      intro={
        <>
          Diese Bedingungen regeln die Nutzung von CraCha unter cracha-app.com.
          Mit der Registrierung erklärst du dich mit ihnen einverstanden.
        </>
      }
    >
      <Section heading="1. Anbieter">
        <p>
          Nicolas Guerrero Tello, Meyerstraße 216, 28201 Bremen, Deutschland.
          Kontakt: hallo@cracha-app.com
        </p>
      </Section>

      <Section heading="2. Gegenstand des Dienstes">
        <p>
          CraCha ruft öffentlich zugängliche Websites ab, die du auswählst,
          bereitet deren Inhalte auf und beantwortet deine Fragen dazu mit Hilfe
          von Sprachmodellen. Die Antworten werden maschinell erzeugt und mit
          Quellenangaben versehen.
        </p>
        <p>
          <strong className="text-foreground">
            Antworten können falsch oder unvollständig sein.
          </strong>{" "}
          Sprachmodelle können Inhalte fehlerhaft wiedergeben. Prüfe jede
          Antwort, auf die du dich verlassen willst, anhand der angegebenen
          Quelle. CraCha ersetzt keine rechtliche, medizinische, steuerliche oder
          sonstige fachliche Beratung.
        </p>
      </Section>

      <Section heading="3. Vergütung, Guthaben-Tokens (Credits) & Widerruf">
        <p>
          Die Inanspruchnahme von CraCha erfolgt über ein token-basiertes Guthaben-Modell (Credits):
        </p>
        <List
          items={[
            <>
              Neue Konten erhalten ein einmaliges Startguthaben zum unverbindlichen Testen.
            </>,
            <>
              Weiteres Guthaben kann in Form von Credit-Paketen über den Zahlungsdienstleister
              Stripe entgeltlich erworben werden. Alle Preise verstehen sich inklusive der gesetzlichen Umsatzsteuer.
            </>,
            <>
              Credits werden bei der Durchführung von Website-Crawls und bei Chat-Anfragen verbraucht.
              Die jeweiligen Tarife und der aktuelle Kontostand werden transparent im Dashboard angezeigt.
              Bei technischen Fehlern ohne vollständige Antwort werden Chat-Credits erstattet.
              Stoppst du die Übertragung nach Beginn der Antwort, bleibt diese Anfrage berechnet.
            </>,
            <>
              Credits sind an dein Konto gebunden und nicht auf andere Konten übertragbar.
              Eine automatische zeitbasierte Löschung von Guthaben ist derzeit nicht vorgesehen.
              Gesetzliche Ansprüche auf Erstattung, insbesondere bei Widerruf, bleiben unberührt.
            </>,
            <>
              <strong>Widerrufsrecht:</strong> Verbrauchern steht beim Kauf von Credits grundsätzlich
              ein gesetzliches Widerrufsrecht zu. Näheres regelt unsere{" "}
              <Link href="/widerrufsbelehrung" className="text-blue-600 underline">
                Widerrufsbelehrung
              </Link>. Ein verlangter sofortiger Leistungsbeginn ist kein pauschaler Verzicht auf das Widerrufsrecht.
              Für vor einem Widerruf erbrachte Dienstleistungen kann unter den gesetzlichen Voraussetzungen anteiliger Wertersatz anfallen.
            </>,
          ]}
        />
      </Section>

      <Section heading="4. Konto">
        <p>
          Für die Nutzung ist ein Konto erforderlich. Du sicherst zu, wahre
          Angaben zu machen, mindestens 16 Jahre alt zu sein und deine
          Zugangsdaten nicht weiterzugeben. Für Handlungen, die über dein Konto
          erfolgen, bist du verantwortlich. Bei Verdacht auf unbefugten Zugriff
          informiere uns bitte umgehend.
        </p>
      </Section>

      <Section heading="5. Deine Verantwortung für abgerufene Websites">
        <p>
          Dies ist der wichtigste Abschnitt dieser Bedingungen. Du bestimmst,
          welche Website abgerufen wird — und trägst dafür die Verantwortung. Du
          sicherst zu, dass du für jede von dir angegebene Adresse:
        </p>
        <List
          items={[
            <>
              zum Abruf und zur Auswertung der Inhalte berechtigt bist, sei es
              als Betreiber der Website oder mit dessen Erlaubnis, oder weil die
              Nutzung nach den Nutzungsbedingungen der Website und dem geltenden
              Recht zulässig ist,
            </>,
            <>
              keine Urheber-, Marken- oder sonstigen Schutzrechte Dritter
              verletzt,
            </>,
            <>
              bei personenbezogenen Daten Dritter die für deinen Nutzungszweck geltenden Datenschutzvorschriften beachtest.
            </>,
          ]}
        />
        <p>
          Nicht abgerufen werden dürfen insbesondere Bereiche hinter einer
          Anmeldung, Seiten, deren Betreiber den automatisierten Abruf untersagt
          hat, sowie Angebote, deren Inhalte offensichtlich rechtswidrig sind.
        </p>
        <p>
          Für schuldhafte Rechtsverletzungen gelten die gesetzlichen Haftungsregelungen.
        </p>
      </Section>

      <Section heading="6. Unzulässige Nutzung">
        <p>Nicht gestattet sind insbesondere:</p>
        <List
          items={[
            <>
              der Versuch, auf Wissensbasen, Konten oder Daten anderer Nutzer
              zuzugreifen,
            </>,
            <>
              Handlungen, die die Verfügbarkeit des Dienstes beeinträchtigen,
              etwa automatisierte Massenanfragen, DoS-Angriffe oder das Anlegen von Schein-Konten in
              großer Zahl,
            </>,
            <>
              das Umgehen technischer Beschränkungen, Erstattungsmechanismen oder Sicherheitsgrenzen,
            </>,
            <>
              die Weiterveräußerung des Dienstes oder seiner Ergebnisse ohne
              unsere schriftliche Zustimmung.
            </>,
          ]}
        />
      </Section>

      <Section heading="7. Rechte an Inhalten">
        <p>
          An den von dir eingebrachten Inhalten und den daraus erzeugten
          Wissensbasen erwerben wir keine Rechte. Du räumst uns lediglich das
          einfache Recht ein, sie zu speichern und zu verarbeiten, soweit dies
          für die Erbringung des Dienstes erforderlich ist. Dieses Recht endet
          mit der Löschung der jeweiligen Wissensbasis.
        </p>
      </Section>

      <Section heading="8. Haftung">
        <p>
          Wir haften unbeschränkt bei Vorsatz und grober Fahrlässigkeit sowie
          bei der Verletzung von Leben, Körper oder Gesundheit. Bei einfacher
          Fahrlässigkeit haften wir nur bei Verletzung einer wesentlichen
          Vertragspflicht, deren Erfüllung die ordnungsgemäße Durchführung des
          Vertrags überhaupt erst ermöglicht und auf deren Einhaltung du
          regelmäßig vertrauen darfst, und der Höhe nach begrenzt auf den bei
          Vertragsschluss vorhersehbaren, vertragstypischen Schaden.
        </p>
        <p>
          Die Haftung nach dem Produkthaftungsgesetz sowie für ausdrücklich
          übernommene Garantien bleibt unberührt.
        </p>
      </Section>

      <Section heading="9. Laufzeit und Beendigung">
        <p>
          Du kannst die Beendigung und Löschung deines Kontos jederzeit über den Support anfragen. Wir
          können den Vertrag mit einer Frist von 14 Tagen kündigen. Bei einem
          schwerwiegenden Verstoß gegen diese Bedingungen — insbesondere gegen
          Abschnitt 5 oder 6 — können wir den Zugang ohne Vorankündigung sperren
          und das Konto schließen.
        </p>
      </Section>

      <Section heading="10. Änderungen">
        <p>
          Änderungen dieser Bedingungen teilen wir dir mit. Soweit eine Zustimmung erforderlich ist, holen wir sie ausdrücklich ein; dein Schweigen gilt nicht als Zustimmung. Für bereits gekaufte Leistungen bleiben die vereinbarten Bedingungen maßgeblich.
        </p>
      </Section>

      <Section heading="11. Schlussbestimmungen">
        <p>
          Es gilt deutsches Recht unter Ausschluss des UN-Kaufrechts. Bist du
          Verbraucher, bleiben zwingende Verbraucherschutzvorschriften deines
          Aufenthaltsstaats unberührt. Sollte eine Bestimmung unwirksam sein,
          bleibt die Wirksamkeit der übrigen unberührt.
        </p>
        <p>
          Zur Teilnahme an einem Streitbeilegungsverfahren vor einer
          Verbraucherschlichtungsstelle sind wir weder bereit noch verpflichtet.
        </p>
      </Section>
    </LegalPage>
  );
}
