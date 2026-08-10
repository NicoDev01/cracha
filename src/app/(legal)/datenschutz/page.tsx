import type { Metadata } from "next";

import { LegalPage, List, Platzhalter, Section } from "@/components/legal/legal-page";

export const metadata: Metadata = {
  title: "Datenschutzerklärung – CraCha",
  description:
    "Welche personenbezogenen Daten CraCha verarbeitet, zu welchem Zweck, auf welcher Rechtsgrundlage und welche Rechte du hast.",
};

export default function DatenschutzPage() {
  return (
    <LegalPage
      title="Datenschutzerklärung"
      updated="10. August 2026"
      intro={
        <>
          CraCha ist ein Werkzeug, mit dem du öffentlich zugängliche Websites in
          eine durchsuchbare Wissensbasis verwandelst und ihr anschließend Fragen
          stellst. Diese Erklärung beschreibt, welche personenbezogenen Daten
          dabei anfallen, wozu wir sie verarbeiten und welche Rechte du hast.
        </>
      }
    >
      <Section heading="1. Verantwortlicher">
        <p>
          Verantwortlich für die Datenverarbeitung auf dieser Website im Sinne
          der Datenschutz-Grundverordnung (DSGVO) ist:
        </p>
        <p>
          <Platzhalter>Vor- und Nachname bzw. Firma</Platzhalter>
          <br />
          <Platzhalter>Straße und Hausnummer</Platzhalter>
          <br />
          <Platzhalter>PLZ und Ort</Platzhalter>
          <br />
          Deutschland
        </p>
        <p>
          E-Mail: <Platzhalter>kontakt@cracha-app.com</Platzhalter>
        </p>
        <p>
          Ein Datenschutzbeauftragter ist nicht bestellt, da die gesetzlichen
          Voraussetzungen hierfür nicht vorliegen.
        </p>
      </Section>

      <Section heading="2. Welche Daten wir verarbeiten">
        <p>
          <strong className="text-foreground">Beim Aufruf der Website.</strong>{" "}
          Unser Hosting-Dienstleister verarbeitet technisch notwendige
          Verbindungsdaten wie IP-Adresse, Zeitpunkt der Anfrage, aufgerufene
          Adresse, übertragene Datenmenge und Browserkennung. Diese Daten sind
          erforderlich, damit die Seite ausgeliefert werden kann, und dienen der
          Abwehr von Angriffen.
        </p>
        <p>
          <strong className="text-foreground">Bei der Registrierung.</strong> Wir
          verarbeiten deine E-Mail-Adresse, den von dir angegebenen Namen und
          dein Passwort. Das Passwort speichern wir nicht im Klartext, sondern
          ausschließlich als kryptografischen Hash bei unserem
          Authentifizierungsdienstleister. Meldest du dich über Google an,
          erhalten wir von Google deine E-Mail-Adresse, deinen Namen und dein
          Profilbild — kein Passwort.
        </p>
        <p>
          <strong className="text-foreground">Bei der Nutzung.</strong> Zu jeder
          von dir angelegten Wissensbasis speichern wir deren Namen, die von dir
          angegebene Quell-Adresse, den Zeitpunkt der letzten Aktualisierung,
          Zählwerte zum Umfang sowie deine Nutzerkennung. Zusätzlich speichern
          wir die Inhalte, die beim Abruf der von dir angegebenen Website
          entstehen. Deine Fragen im Chat werden zur Beantwortung verarbeitet;
          die Antworten selbst speichern wir nicht dauerhaft auf unseren
          Systemen.
        </p>
        <p>
          <strong className="text-foreground">
            Inhalte der von dir abgerufenen Websites.
          </strong>{" "}
          CraCha ruft die von dir angegebene Website ab und legt deren Textinhalt
          in einem Suchindex ab. Enthält diese Website personenbezogene Daten
          Dritter — etwa Namen und Kontaktdaten auf einer Teamseite —, werden
          diese mitverarbeitet. Zu dieser Verarbeitung siehe Abschnitt 6.
        </p>
      </Section>

      <Section heading="3. Zwecke und Rechtsgrundlagen">
        <List
          items={[
            <>
              <strong className="text-foreground">
                Bereitstellung des Dienstes, Konto und Anmeldung
              </strong>{" "}
              — Art. 6 Abs. 1 lit. b DSGVO (Erfüllung eines Vertrags bzw.
              vorvertragliche Maßnahmen).
            </>,
            <>
              <strong className="text-foreground">
                Bestätigung der E-Mail-Adresse
              </strong>{" "}
              — Art. 6 Abs. 1 lit. b und lit. f DSGVO. Sie schützt davor, dass
              fremde Adressen für Konten verwendet werden, und begrenzt den
              missbräuchlichen Verbrauch unserer Ressourcen.
            </>,
            <>
              <strong className="text-foreground">
                Auslieferung der Website, Stabilität und Sicherheit
              </strong>{" "}
              — Art. 6 Abs. 1 lit. f DSGVO (berechtigtes Interesse an einem
              funktionsfähigen und angriffssicheren Angebot).
            </>,
          ]}
        />
      </Section>

      <Section heading="4. Cookies und lokale Speicherung">
        <p>
          Wir setzen <strong className="text-foreground">keine</strong> Cookies
          zu Analyse-, Werbe- oder Trackingzwecken ein. Es sind keine
          Analysedienste, keine Werbenetzwerke und keine Social-Media-Plugins
          eingebunden. Deshalb gibt es auch kein Einwilligungsbanner.
        </p>
        <p>Verwendet werden ausschließlich:</p>
        <List
          items={[
            <>
              <strong className="text-foreground">Sitzungs-Cookies</strong> des
              Authentifizierungsdienstes, die dich zwischen zwei Seitenaufrufen
              angemeldet halten. Ohne sie ist eine Anmeldung technisch nicht
              möglich.
            </>,
            <>
              <strong className="text-foreground">Lokaler Speicher</strong> deines
              Browsers für deine Theme-Auswahl (hell oder dunkel) und die Liste
              deiner zuletzt gestarteten Abrufe. Diese Angaben verlassen deinen
              Browser nicht und werden bei einem Nutzerwechsel verworfen.
            </>,
          ]}
        />
      </Section>

      <Section heading="5. Empfänger und Auftragsverarbeiter">
        <p>
          Wir betreiben CraCha nicht auf eigener Hardware, sondern auf Diensten
          Dritter. Diese verarbeiten Daten weisungsgebunden für uns auf
          Grundlage von Verträgen zur Auftragsverarbeitung nach Art. 28 DSGVO:
        </p>
        <List
          items={[
            <>
              <strong className="text-foreground">Cloudflare</strong> — Auslieferung
              der Website, Speicherung der Wissensbasen und der abgerufenen
              Inhalte sowie Betrieb der Sprachmodelle, die deine Fragen
              beantworten.
            </>,
            <>
              <strong className="text-foreground">Supabase</strong> — Verwaltung
              der Benutzerkonten, Anmeldung und Versand der Bestätigungs- und
              Passwort-E-Mails.
            </>,
            <>
              <strong className="text-foreground">Modal</strong> — Ausführung der
              Abrufe der von dir angegebenen Websites.
            </>,
            <>
              <strong className="text-foreground">Google</strong> — nur, wenn du
              die Anmeldung über Google wählst.
            </>,
          ]}
        />
        <p>
          Eine Übermittlung deiner Daten zu Werbezwecken oder ein Verkauf an
          Dritte findet nicht statt.
        </p>
        <p>
          <strong className="text-foreground">Drittlandübermittlung.</strong> Ein
          Teil dieser Anbieter hat seinen Sitz in den Vereinigten Staaten oder
          verarbeitet Daten auch dort. Die Übermittlung erfolgt auf Grundlage von
          Standardvertragsklauseln der Europäischen Kommission nach Art. 46 Abs.
          2 lit. c DSGVO und, soweit der jeweilige Anbieter zertifiziert ist, des
          EU-US Data Privacy Framework nach Art. 45 DSGVO.
        </p>
      </Section>

      <Section heading="6. Inhalte fremder Websites">
        <p>
          Wenn du eine Website angibst, rufen wir deren öffentlich zugängliche
          Seiten ab und legen den Text in einem nur dir zugänglichen Suchindex
          ab. Dabei gilt:
        </p>
        <List
          items={[
            <>
              Wir rufen ausschließlich öffentlich erreichbare Seiten ab. Bereiche
              hinter einer Anmeldung werden nicht abgerufen.
            </>,
            <>
              Die Angaben der Datei <code className="rounded bg-foreground/10 px-1 py-0.5 text-sm">robots.txt</code>{" "}
              werden standardmäßig beachtet.
            </>,
            <>
              Für die Auswahl der Website bist du verantwortlich. Enthält sie
              personenbezogene Daten Dritter, bist du für diese Verarbeitung der
              Verantwortliche im Sinne der DSGVO; wir handeln insoweit als
              Auftragsverarbeiter für dich. Näheres regeln die{" "}
              <a href="/nutzungsbedingungen" className="text-foreground underline underline-offset-4">
                Nutzungsbedingungen
              </a>
              .
            </>,
            <>
              Löschst du eine Wissensbasis, werden die zugehörigen Inhalte und
              der zugehörige Suchindex gelöscht.
            </>,
          ]}
        />
      </Section>

      <Section heading="7. Speicherdauer">
        <List
          items={[
            <>
              <strong className="text-foreground">Konto- und Nutzungsdaten</strong>{" "}
              werden gespeichert, solange dein Konto besteht.
            </>,
            <>
              <strong className="text-foreground">Wissensbasen und Inhalte</strong>{" "}
              werden gelöscht, sobald du die jeweilige Wissensbasis oder dein
              Konto löschst.
            </>,
            <>
              <strong className="text-foreground">Zwischengespeicherte Suchergebnisse</strong>{" "}
              werden automatisch verworfen, sobald sich der zugrundeliegende
              Index ändert.
            </>,
            <>
              <strong className="text-foreground">Server-Protokolle</strong> werden
              von unseren Dienstleistern nach deren Fristen gelöscht, in der
              Regel innerhalb weniger Tage.
            </>,
          ]}
        />
      </Section>

      <Section heading="8. Deine Rechte">
        <p>Dir stehen gegenüber uns die folgenden Rechte zu:</p>
        <List
          items={[
            <>Auskunft über die zu dir gespeicherten Daten (Art. 15 DSGVO)</>,
            <>Berichtigung unrichtiger Daten (Art. 16 DSGVO)</>,
            <>Löschung (Art. 17 DSGVO)</>,
            <>Einschränkung der Verarbeitung (Art. 18 DSGVO)</>,
            <>Datenübertragbarkeit (Art. 20 DSGVO)</>,
            <>
              Widerspruch gegen Verarbeitungen, die auf einem berechtigten
              Interesse beruhen (Art. 21 DSGVO)
            </>,
          ]}
        />
        <p>
          Zur Ausübung genügt eine formlose Nachricht an die oben genannte
          E-Mail-Adresse. Unabhängig davon steht dir ein Beschwerderecht bei
          einer Datenschutz-Aufsichtsbehörde zu (Art. 77 DSGVO), etwa bei der
          Behörde deines Wohnorts.
        </p>
      </Section>

      <Section heading="9. Änderungen dieser Erklärung">
        <p>
          Wir passen diese Erklärung an, wenn sich der Dienst oder die
          Rechtslage ändert. Es gilt die jeweils auf dieser Seite abrufbare
          Fassung. Wesentliche Änderungen teilen wir angemeldeten Nutzerinnen
          und Nutzern per E-Mail mit.
        </p>
      </Section>
    </LegalPage>
  );
}
