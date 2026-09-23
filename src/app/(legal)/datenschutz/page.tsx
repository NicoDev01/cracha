import type { Metadata } from "next";

import { LegalPage, List, Section } from "@/components/legal/legal-page";

export const metadata: Metadata = {
  alternates: { canonical: "/datenschutz" },
  title: "Datenschutzerklärung",
  description:
    "Welche personenbezogenen Daten CraCha verarbeitet, zu welchem Zweck, auf welcher Rechtsgrundlage und welche Rechte du hast.",
};

export default function DatenschutzPage() {
  return (
    <LegalPage
      title="Datenschutzerklärung"
      updated="23. September 2026"
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
          Nicolas Guerrero Tello
          <br />
          Meyerstraße 216
          <br />
          28201 Bremen
          <br />
          Deutschland
        </p>
        <p>E-Mail: hallo@cracha-app.com</p>
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
          <strong className="text-foreground">
            Reichweiten- und Leistungsmessung.
          </strong>{" "}
          Wir nutzen Cloudflare Web Analytics, um zu sehen, welche Seiten
          aufgerufen werden und wie schnell sie laden. Dazu lädt dein Browser ein
          Skript von <code className="rounded bg-foreground/10 px-1 py-0.5 text-sm">static.cloudflareinsights.com</code>,
          das beim Laden und beim Verlassen einer Seite Messwerte an Cloudflare
          sendet: die aufgerufene Seite, die verweisende Seite (Referrer) sowie
          Lade- und Leistungswerte wie Ladezeiten. URL-Parameter werden nach
          Angaben von Cloudflare nicht protokolliert. Wie bei jeder Anfrage
          übermittelt dein Browser dabei technisch auch deine IP-Adresse und
          seine Browserkennung.
        </p>
        <p>
          Nach Angaben von Cloudflare setzt das Skript keine Cookies und liest
          oder schreibt keinen Speicher in deinem Browser (weder localStorage
          noch sessionStorage oder IndexedDB). Die IP-Adresse wird im
          nächstgelegenen Cloudflare-Rechenzentrum verworfen und nicht in
          Datenbanken oder Protokollen gespeichert. Cloudflare erkennt Besucher
          nach eigenen Angaben nicht über IP-Adresse, Browserkennung oder andere
          Merkmale wieder („Fingerprinting“) und verfolgt einzelne Personen
          nicht über verschiedene Websites hinweg. Wir sehen ausschließlich
          zusammengefasste Statistiken und können daraus keine einzelnen
          Besucher erkennen. Details beschreibt Cloudflare in der{" "}
          <a
            href="https://developers.cloudflare.com/speed/observatory/rum-beacon/"
            className="text-foreground underline underline-offset-4"
            target="_blank"
            rel="noopener noreferrer"
          >
            Dokumentation zum Web-Analytics-Beacon
          </a>
          . Du kannst die Messung verhindern, indem du Skripte dieser Adresse
          in deinem Browser blockierst, etwa mit einem Inhaltsblocker; die
          Website funktioniert dann unverändert.
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
          Fragen, Antworten, Quellenverweise und deine lokale Bewertung einer Antwort werden kontobezogen im lokalen Speicher deines Browsers gespeichert. Du kannst Verläufe im Chat löschen und exportieren. Eine Synchronisierung zwischen Geräten findet nicht statt. Für die Antworterzeugung werden die Frage, ein begrenzter Gesprächsverlauf und relevante Quelltexte an die eingesetzten KI-Dienste übermittelt. Die Protokollierung von Frage- und Antwortinhalten am KI-Gateway ist für diese Aufrufe deaktiviert.
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
            <>
              <strong className="text-foreground">
                Reichweiten- und Leistungsmessung mit Cloudflare Web Analytics
              </strong>{" "}
              — Art. 6 Abs. 1 lit. f DSGVO (berechtigtes Interesse daran, zu
              erkennen, welche Seiten genutzt werden und wo Ladezeiten das
              Angebot verschlechtern). Du kannst dieser Verarbeitung nach Art. 21
              DSGVO widersprechen.
            </>,
          ]}
        />
      </Section>

      <Section heading="4. Cookies und lokale Speicherung">
        <p>
          Wir setzen <strong className="text-foreground">keine</strong> Cookies
          zu Analyse-, Werbe- oder Trackingzwecken ein. Es sind keine
          Werbenetzwerke und keine Social-Media-Plugins eingebunden. Die in
          Abschnitt 2 beschriebene Reichweitenmessung mit Cloudflare Web
          Analytics kommt nach Angaben von Cloudflare ohne Cookies und ohne
          Speicherung in deinem Browser aus.
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
              Browsers für deine Theme-Auswahl, Chatverläufe mit Quellen und Bewertungen sowie zuletzt gestartete Abrufe. Kontobezogene Verläufe werden beim Nutzerwechsel zurückgesetzt. Fragen und notwendiger Gesprächskontext werden bei einer Anfrage an unsere Dienste übertragen.
            </>,
          ]}
        />
      </Section>

      <Section heading="5. Empfänger und Auftragsverarbeiter">
        <p>
          Wir betreiben CraCha nicht auf eigener Hardware, sondern auf Diensten
          Dritter. Je nach Dienst verarbeiten diese Daten als Auftragsverarbeiter oder in eigener datenschutzrechtlicher Verantwortung:
        </p>
        <List
          items={[
            <>
              <strong className="text-foreground">Cloudflare</strong> — Auslieferung
              der Website, Reichweiten- und Leistungsmessung (Web Analytics),
              Speicherung der Wissensbasen und der abgerufenen Inhalte,
              Betrieb der Sprachmodelle, die deine Fragen beantworten, sowie
              Weiterleitung von E-Mails an hallo@cracha-app.com (Email Routing).
            </>,
            <>
              <strong className="text-foreground">Supabase</strong> — Verwaltung
              der Benutzerkonten und Anmeldung.
            </>,
            <>
              <strong className="text-foreground">Resend</strong> — Versand der
              Bestätigungs- und Passwort-E-Mails.
            </>,
            <>
              <strong className="text-foreground">Modal</strong> — Ausführung der
              Abrufe der von dir angegebenen Websites.
            </>,
            <>
              <strong className="text-foreground">Google</strong> — für die Antworterzeugung mit Gemini über das Cloudflare AI Gateway sowie bei freiwilliger Anmeldung über Google. Zur Generierung erhält das Modell Fragen, begrenzten Gesprächsverlauf und relevante Quelltexte. Außerdem landen E-Mails an hallo@cracha-app.com in einem Google-Mail-Postfach.
            </>,
          ]}
        />
        <p>
          Bei Zahlungen verarbeitet Stripe Zahlungs- und Rechnungsdaten. Wir speichern die Zuordnung zu deinem Konto, Zahlungsreferenzen, Credit-Buchungen und die dokumentierte Erklärung zum sofortigen Leistungsbeginn. Vollständige Kartendaten speichern wir nicht. Die Verarbeitung dient der Vertragsabwicklung (Art. 6 Abs. 1 lit. b DSGVO), gesetzlichen Aufbewahrungspflichten (lit. c) sowie der Verhinderung von Missbrauch (lit. f).
        </p>
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
              werden auf Wunsch beachtet (Einstellung beim Einlesen).
            </>,
            <>
              Wähle nur Inhalte, die du rechtmäßig abrufen und auswerten darfst. Die datenschutzrechtlichen Pflichten hängen vom Inhalt und deinem Nutzungszweck ab. Näheres regeln die{" "}
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
              werden gespeichert, solange dein Konto besteht. Du kannst dein Konto
              jederzeit unter „Mein Konto“ selbst löschen. Dabei brechen wir
              laufende Abrufe ab und löschen sofort deine Zugangsdaten (E-Mail-Adresse,
              Name, Passwort-Hash, Google-Verknüpfung), alle Wissensbasen mit den
              abgerufenen Inhalten und dem Suchindex, zwischengespeicherte
              Suchergebnisse, dein Guthaben und deine Credit-Buchungen. Restguthaben,
              auch gekauftes, verfällt dabei ohne Erstattung. Chat- und Abrufverläufe
              werden in dem Browser entfernt, in dem du die Löschung auslöst; auf
              anderen Geräten liegen sie nur lokal und lassen sich dort im Browser
              löschen.
            </>,
            <>
              <strong className="text-foreground">Wissensbasen und Inhalte</strong>{" "}
              werden bei Löschung der Wissensbasis oder deines Kontos entfernt.
            </>,
            <>
              <strong className="text-foreground">Zahlungsnachweise</strong> zu
              gekauften Credit-Paketen (Betrag, Credits, Zahlungsreferenz, Stand von
              Erstattungen und Rückbuchungen, dokumentierte Erklärung zum sofortigen
              Leistungsbeginn) bewahren wir für die gesetzlichen Fristen auf (§ 147
              AO, § 257 HGB). Nach einer Kontolöschung geschieht das ohne Zuordnung
              zu deinem Konto. Über die Zahlungsreferenz bleibt eine Zuordnung bei
              Stripe möglich; Stripe speichert Zahlungs- und Kundendaten in eigener
              Verantwortung nach eigenen Fristen.
            </>,
            <>
              <strong className="text-foreground">Statusdaten von Abrufen</strong>{" "}
              beim Crawler-Dienst (Modal) enthalten eine Auftragskennung, den
              Fortschritt, die zuletzt abgerufene Seitenadresse und gegebenenfalls
              eine Fehlermeldung, aber keine Nutzerkennung. Sie werden automatisch
              entfernt, sobald ihre letzte Aktualisierung sieben Tage zurückliegt
              und der Abruf abgerechnet ist.
            </>,
            <>
              <strong className="text-foreground">Zwischengespeicherte Suchergebnisse</strong>{" "}
              werden automatisch verworfen, sobald sich der zugrundeliegende
              Index ändert.
            </>,
            <>
              <strong className="text-foreground">Anmeldeprotokolle</strong> unseres
              Authentifizierungsdienstleisters (Anmeldungen, Abmeldungen, Passwort-
              und Kontoänderungen mit E-Mail-Adresse) löschen wir nach 30 Tagen,
              nach einer Kontolöschung spätestens am folgenden Tag.
            </>,
            <>
              <strong className="text-foreground">Server-Protokolle</strong> werden
              nach den für den jeweiligen Dienst eingerichteten Aufbewahrungsfristen gelöscht. Technische Betriebsdaten können Fehler, Zeitpunkte, Nutzer- bzw. Anfragekennungen und Verbrauchswerte enthalten.
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
