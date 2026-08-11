import type { Metadata } from "next";

import { LegalPage, List, Section } from "@/components/legal/legal-page";

export const metadata: Metadata = {
  alternates: { canonical: "/nutzungsbedingungen" },
  title: "Nutzungsbedingungen",
  description:
    "Bedingungen für die Nutzung von CraCha während der Beta-Phase: Konto, erlaubte Nutzung, Verantwortung für abgerufene Websites, Haftung und Laufzeit.",
};

export default function NutzungsbedingungenPage() {
  return (
    <LegalPage
      title="Nutzungsbedingungen"
      updated="10. August 2026"
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
          Kontakt: aimpact.agency@gmail.com
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

      <Section heading="3. Beta-Phase">
        <p>
          CraCha befindet sich in einer offenen Testphase und wird unentgeltlich
          bereitgestellt. In dieser Phase gilt:
        </p>
        <List
          items={[
            <>
              Es besteht kein Anspruch auf Verfügbarkeit, auf einen bestimmten
              Funktionsumfang oder auf eine bestimmte Antwortqualität.
            </>,
            <>
              Funktionen können ohne Vorankündigung geändert, eingeschränkt oder
              eingestellt werden.
            </>,
            <>
              Sichere dir wichtige Inhalte selbst. Wir übernehmen keine Gewähr
              dafür, dass angelegte Wissensbasen dauerhaft erhalten bleiben.
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
              bei enthaltenen personenbezogenen Daten Dritter über eine
              Rechtsgrundlage nach der DSGVO verfügst. Für diese Verarbeitung
              bist du der Verantwortliche; wir verarbeiten die Inhalte
              ausschließlich weisungsgebunden für dich.
            </>,
          ]}
        />
        <p>
          Nicht abgerufen werden dürfen insbesondere Bereiche hinter einer
          Anmeldung, Seiten, deren Betreiber den automatisierten Abruf untersagt
          hat, sowie Angebote, deren Inhalte offensichtlich rechtswidrig sind.
        </p>
        <p>
          Du stellst uns von Ansprüchen Dritter frei, die auf einer Verletzung
          dieser Zusicherungen beruhen, einschließlich angemessener Kosten der
          Rechtsverteidigung.
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
              etwa automatisierte Massenanfragen oder das Anlegen von Konten in
              großer Zahl,
            </>,
            <>
              das Umgehen technischer Beschränkungen sowie das Erzeugen
              rechtswidriger Inhalte,
            </>,
            <>
              die Weiterveräußerung des Dienstes oder seiner Ergebnisse ohne
              unsere Zustimmung.
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
          mit der Löschung.
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
          Da der Dienst in der Beta-Phase unentgeltlich bereitgestellt wird,
          haften wir im Übrigen nach den gesetzlichen Vorschriften für die
          Schenkung und Leihe nur für Vorsatz und grobe Fahrlässigkeit. Die
          Haftung nach dem Produkthaftungsgesetz bleibt unberührt.
        </p>
      </Section>

      <Section heading="9. Laufzeit und Beendigung">
        <p>
          Du kannst dein Konto jederzeit löschen; damit endet der Vertrag. Wir
          können den Vertrag mit einer Frist von 14 Tagen kündigen. Bei einem
          schwerwiegenden Verstoß gegen diese Bedingungen — insbesondere gegen
          Abschnitt 5 oder 6 — können wir den Zugang ohne Vorankündigung sperren
          und das Konto löschen.
        </p>
      </Section>

      <Section heading="10. Änderungen">
        <p>
          Wir können diese Bedingungen ändern und informieren dich mindestens 14
          Tage vor Wirksamwerden per E-Mail. Widersprichst du nicht bis zum
          genannten Zeitpunkt, gelten die geänderten Bedingungen als angenommen;
          hierauf weisen wir in der Mitteilung gesondert hin. Du kannst in diesem
          Fall dein Konto jederzeit löschen.
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
