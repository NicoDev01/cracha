import { setRequestLocale } from "next-intl/server";

import { LegalPage, List, Section } from "@/components/legal/legal-page";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { legalMetadata } from "../legal-metadata";

export async function generateMetadata({ params }: PageProps<"/[locale]/datenschutz">) {
  const locale = (await params).locale as Locale;
  return locale === "en"
    ? legalMetadata("/datenschutz", locale, "Privacy policy", "Which personal data CraCha processes, for what purpose, on which legal basis, and what rights you have.")
    : legalMetadata("/datenschutz", locale, "Datenschutzerklärung", "Welche personenbezogenen Daten CraCha verarbeitet, zu welchem Zweck, auf welcher Rechtsgrundlage und welche Rechte du hast.");
}

export default async function DatenschutzPage({ params }: PageProps<"/[locale]/datenschutz">) {
  const locale = (await params).locale as Locale;
  setRequestLocale(locale);
  return locale === "en" ? <PrivacyPolicy /> : <Datenschutz />;
}

function Datenschutz() {
  return (
    <LegalPage
      title="Datenschutzerklärung"
      updated="29. September 2026"
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
          <strong className="text-foreground">Fehlerberichte.</strong> Tritt in
          deinem Browser ein Programmfehler auf, sendet die Website einen
          Fehlerbericht an Sentry. Er enthält die Fehlermeldung und die Stelle im
          Programmcode, die aufgerufene Seite ohne URL-Parameter, die zuvor
          aufgerufenen Seiten und Anfragen ohne deren Inhalt, Browser,
          Betriebssystem sowie den Zeitpunkt. Namen, E-Mail-Adressen, Cookies und
          Chatinhalte übermitteln wir nicht. Wie bei jeder Anfrage übermittelt
          dein Browser dabei technisch auch deine IP-Adresse. Die Berichte werden
          in der EU-Region von Sentry (Frankfurt am Main) gespeichert und nach
          Ablauf der Aufbewahrungsfrist des Dienstes automatisch gelöscht.
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
          Fragen, Antworten und Quellenverweise speichern wir als Chatverlauf in deinem Konto, zusammen mit der verwendeten Wissensbasis, damit du deine Chats später und auf anderen Geräten wieder aufrufen kannst. Nur du kannst sie sehen. Aus der ersten Frage eines Chats erzeugt ein Sprachmodell bei Cloudflare (Workers AI) einen kurzen Titel. Du kannst Chats jederzeit umbenennen, löschen und Antworten exportieren. Für die Antworterzeugung werden die Frage, ein begrenzter Gesprächsverlauf und relevante Quelltexte an die eingesetzten KI-Dienste übermittelt. Die Protokollierung von Frage- und Antwortinhalten am KI-Gateway ist für diese Aufrufe deaktiviert.
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
        <p>
          <strong className="text-foreground">Einmalige Erinnerung.</strong>{" "}
          Hast du 24 Stunden nach der Registrierung noch keine Website
          eingelesen, schicken wir dir einmalig eine E-Mail mit Hinweisen zum
          Einstieg. Dafür verwenden wir deine E-Mail-Adresse und speichern den
          Zeitpunkt des Versands. Weitere E-Mails dieser Art senden wir nicht.
          Du kannst dem jederzeit widersprechen, etwa mit einer kurzen Antwort
          auf die E-Mail oder an hallo@cracha-app.com; dabei entstehen dir keine
          anderen als die Übermittlungskosten nach den Basistarifen.
        </p>
        <p>
          <strong className="text-foreground">Auswertung der Nutzung.</strong>{" "}
          Um zu verstehen, wo neue Nutzer beim Einstieg hängen bleiben, zählen
          wir aus den ohnehin vorhandenen Konto- und Credit-Buchungen, wie viele
          Konten bestätigt wurden, eine Website eingelesen, eine Antwort erhalten
          oder CraCha an mehreren Tagen genutzt haben. Wir sehen dabei nur
          Gesamtzahlen, keine einzelnen Personen. Es werden dafür keine
          zusätzlichen Daten erhoben und keine Cookies oder Tracking-Skripte
          eingesetzt.
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
            <>
              <strong className="text-foreground">Fehlerberichte mit Sentry</strong>{" "}
              — Art. 6 Abs. 1 lit. f DSGVO (berechtigtes Interesse daran,
              Programmfehler zu erkennen und zu beheben, bevor sie viele Nutzer
              treffen). Du kannst nach Art. 21 DSGVO widersprechen.
            </>,
            <>
              <strong className="text-foreground">
                Einmalige Erinnerungs-E-Mail
              </strong>{" "}
              — Art. 6 Abs. 1 lit. f DSGVO (berechtigtes Interesse daran, neuen
              Nutzern den Einstieg in den bereits angelegten Dienst zu
              erleichtern) in Verbindung mit § 7 Abs. 3 UWG. Du kannst nach Art.
              21 DSGVO jederzeit widersprechen.
            </>,
            <>
              <strong className="text-foreground">
                Zusammengefasste Auswertung der Nutzung
              </strong>{" "}
              — Art. 6 Abs. 1 lit. f DSGVO (berechtigtes Interesse daran, den
              Einstieg in den Dienst zu verbessern). Du kannst nach Art. 21 DSGVO
              widersprechen.
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
              der Benutzerkonten und Anmeldung sowie Speicherung deines Chatverlaufs.
            </>,
            <>
              <strong className="text-foreground">Resend</strong> — Versand der
              Bestätigungs- und Passwort-E-Mails sowie der einmaligen
              Erinnerungs-E-Mail.
            </>,
            <>
              <strong className="text-foreground">Modal</strong> — Ausführung der
              Abrufe der von dir angegebenen Websites.
            </>,
            <>
              <strong className="text-foreground">Sentry</strong> (Functional
              Software, Inc.) — Empfang und Speicherung der Fehlerberichte aus dem
              Browser in der EU-Region.
            </>,
            <>
              <strong className="text-foreground">OpenRouter</strong> (OpenRouter, Inc., USA) — Vermittlung der Antworterzeugung an das Sprachmodell DeepSeek V4.1 Flash, betrieben von DeepInfra, Fireworks AI oder Together AI (jeweils USA), ersatzweise GPT-6 Luna bei Microsoft Azure oder OpenAI. Zur Generierung erhält das Modell Fragen, begrenzten Gesprächsverlauf und relevante Quelltexte. Wir lassen nur Anbieter zu, die diese Daten nicht zum Training verwenden; Anbieter in China sind ausgeschlossen. OpenRouter speichert nach eigenen Angaben keine Frage- und Antwortinhalte.
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
              <Link href="/nutzungsbedingungen" className="text-foreground underline underline-offset-4">
                Nutzungsbedingungen
              </Link>
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
              Suchergebnisse, deinen Chatverlauf, dein Guthaben und deine
              Credit-Buchungen. Restguthaben, auch gekauftes, verfällt dabei ohne
              Erstattung. Der Abrufverlauf wird in dem Browser entfernt, in dem du
              die Löschung auslöst; auf anderen Geräten liegt er nur lokal und lässt
              sich dort im Browser löschen.
            </>,
            <>
              <strong className="text-foreground">Wissensbasen und Inhalte</strong>{" "}
              werden bei Löschung der Wissensbasis oder deines Kontos entfernt.
            </>,
            <>
              <strong className="text-foreground">Chats</strong>{" "}
              speichern wir, bis du sie löschst, die Wissensbasis löschst, mit der
              du sie geführt hast, oder dein Konto löschst.
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

function PrivacyPolicy() {
  return (
    <LegalPage
      title="Privacy policy"
      updated="September 29, 2026"
      locale="en"
      intro={
        <>
          CraCha is a tool that turns publicly accessible websites into a searchable knowledge base that you can then
          ask questions. This policy describes which personal data is involved, why we process it and what rights you
          have.
        </>
      }
    >
      <Section heading="1. Controller">
        <p>The controller for data processing on this website within the meaning of the General Data Protection Regulation (GDPR) is:</p>
        <p>
          Nicolas Guerrero Tello
          <br />
          Meyerstraße 216
          <br />
          28201 Bremen
          <br />
          Germany
        </p>
        <p>Email: hallo@cracha-app.com</p>
        <p>No data protection officer has been appointed, as the statutory requirements for this are not met.</p>
      </Section>

      <Section heading="2. Which data we process">
        <p>
          <strong className="text-foreground">When you visit the website.</strong>{" "}
          Our hosting provider processes technically necessary connection data such as IP address, time of the
          request, address requested, amount of data transferred and browser identifier. This data is needed to
          deliver the page and serves to fend off attacks.
        </p>
        <p>
          <strong className="text-foreground">Audience and performance measurement.</strong>{" "}
          We use Cloudflare Web Analytics to see which pages are visited and how fast they load. For this, your
          browser loads a script from <code className="rounded bg-foreground/10 px-1 py-0.5 text-sm">static.cloudflareinsights.com</code> that sends measurements to
          Cloudflare when a page loads and when you leave it: the page visited, the referring page (referrer) and load
          and performance values such as load times. According to Cloudflare, URL parameters are not logged. As with
          every request, your browser technically also transmits your IP address and its browser identifier.
        </p>
        <p>
          According to Cloudflare, the script sets no cookies and does not read or write any storage in your browser
          (neither localStorage nor sessionStorage nor IndexedDB). The IP address is discarded at the nearest
          Cloudflare data center and not stored in databases or logs. According to Cloudflare, it does not recognize
          visitors by IP address, browser identifier or other characteristics (&ldquo;fingerprinting&rdquo;) and does
          not track individuals across websites. We only see aggregated statistics and cannot identify individual
          visitors from them. Cloudflare describes the details in the{" "}
          <a
            href="https://developers.cloudflare.com/speed/observatory/rum-beacon/"
            className="text-foreground underline underline-offset-4"
            target="_blank"
            rel="noopener noreferrer"
          >
            documentation on the Web Analytics beacon
          </a>
          . You can prevent the measurement by blocking scripts from this address in your browser, for example with a
          content blocker; the website then works unchanged.
        </p>
        <p>
          <strong className="text-foreground">Error reports.</strong> If a program error occurs in your browser, the
          website sends an error report to Sentry. It contains the error message and the place in the program code,
          the page visited without URL parameters, the previously visited pages and requests without their content,
          browser, operating system and the time. We do not transmit names, email addresses, cookies or chat content.
          As with every request, your browser technically also transmits your IP address. The reports are stored in
          Sentry&apos;s EU region (Frankfurt am Main) and deleted automatically after the service&apos;s retention
          period.
        </p>
        <p>
          <strong className="text-foreground">When you sign up.</strong> We process your email address, the name you
          give and your password. We do not store the password in plain text, only as a cryptographic hash at our
          authentication provider. If you sign in with Google, we receive your email address, your name and your
          profile picture from Google — no password.
        </p>
        <p>
          <strong className="text-foreground">When you use the service.</strong> For every knowledge base you create
          we store its name, the source address you entered, the time of the last update, counts on its size and your
          user ID. We also store the content created when the website you specified is fetched. Your chat questions
          are processed to answer them; we store questions, answers and source references as chat history in your
          account, together with the knowledge base used, so you can open your chats later and on other devices. Only
          you can see them. A language model at Cloudflare (Workers AI) creates a short title from the first question
          of a chat. You can rename and delete chats and export answers at any time. To generate answers, the
          question, a limited conversation history and relevant source texts are sent to the AI services used.
          Logging of question and answer content at the AI gateway is disabled for these calls.
        </p>
        <p>
          <strong className="text-foreground">Content of the websites you fetch.</strong>{" "}
          CraCha fetches the website you specify and stores its text content in a search index. If that website
          contains personal data of third parties — such as names and contact details on a team page — this is
          processed as well. See section 6 on this processing.
        </p>
        <p>
          <strong className="text-foreground">One-time reminder.</strong>{" "}
          If you haven&apos;t read a website 24 hours after signing up, we send you a single email with tips for
          getting started. For this we use your email address and store the time it was sent. We send no further
          emails of this kind. You can object at any time, for example with a short reply to the email or to
          hallo@cracha-app.com; this costs you nothing beyond the transmission costs at basic rates.
        </p>
        <p>
          <strong className="text-foreground">Usage analysis.</strong>{" "}
          To understand where new users get stuck, we count from the account and credit records that exist anyway how
          many accounts were confirmed, read a website, received an answer or used CraCha on several days. We only see
          totals, not individual people. No additional data is collected for this, and no cookies or tracking scripts
          are used.
        </p>
      </Section>

      <Section heading="3. Purposes and legal bases">
        <List
          items={[
            <>
              <strong className="text-foreground">Providing the service, account and sign-in</strong>{" "}
              — Art. 6(1)(b) GDPR (performance of a contract or pre-contractual measures).
            </>,
            <>
              <strong className="text-foreground">Confirming your email address</strong>{" "}
              — Art. 6(1)(b) and (f) GDPR. It prevents other people&apos;s addresses from being used for accounts and
              limits abusive use of our resources.
            </>,
            <>
              <strong className="text-foreground">Delivering the website, stability and security</strong>{" "}
              — Art. 6(1)(f) GDPR (legitimate interest in a working service that is secure against attacks).
            </>,
            <>
              <strong className="text-foreground">Audience and performance measurement with Cloudflare Web Analytics</strong>{" "}
              — Art. 6(1)(f) GDPR (legitimate interest in seeing which pages are used and where load times make the
              service worse). You can object to this processing under Art. 21 GDPR.
            </>,
            <>
              <strong className="text-foreground">Error reports with Sentry</strong>{" "}
              — Art. 6(1)(f) GDPR (legitimate interest in detecting and fixing program errors before they affect many
              users). You can object under Art. 21 GDPR.
            </>,
            <>
              <strong className="text-foreground">One-time reminder email</strong>{" "}
              — Art. 6(1)(f) GDPR (legitimate interest in helping new users get started with the service they already
              signed up for) in conjunction with Section 7(3) of the German Act against Unfair Competition (UWG). You
              can object at any time under Art. 21 GDPR.
            </>,
            <>
              <strong className="text-foreground">Aggregated usage analysis</strong>{" "}
              — Art. 6(1)(f) GDPR (legitimate interest in improving how people get started with the service). You can
              object under Art. 21 GDPR.
            </>,
          ]}
        />
      </Section>

      <Section heading="4. Cookies and local storage">
        <p>
          We use <strong className="text-foreground">no</strong> cookies for analytics, advertising or tracking. No
          ad networks and no social media plugins are embedded. According to Cloudflare, the audience measurement with
          Cloudflare Web Analytics described in section 2 works without cookies and without storage in your browser.
        </p>
        <p>We only use:</p>
        <List
          items={[
            <>
              <strong className="text-foreground">Session cookies</strong> of the authentication service that keep you
              signed in between page views. Without them, signing in is technically not possible.
            </>,
            <>
              <strong className="text-foreground">A language cookie</strong> (NEXT_LOCALE) that remembers whether you
              chose German or English.
            </>,
            <>
              <strong className="text-foreground">Local storage</strong> in your browser for your theme choice, chat
              histories with sources and ratings, and recently started crawls. Account-related histories are reset
              when the user changes. Questions and the necessary conversation context are transmitted with a request to
              our services.
            </>,
          ]}
        />
      </Section>

      <Section heading="5. Recipients and processors">
        <p>
          We don&apos;t run CraCha on our own hardware but on third-party services. Depending on the service, they
          process data as processors or under their own data protection responsibility:
        </p>
        <List
          items={[
            <>
              <strong className="text-foreground">Cloudflare</strong> — delivering the website, audience and
              performance measurement (Web Analytics), storing knowledge bases and fetched content, running the
              language models that answer your questions, and forwarding emails to hallo@cracha-app.com (Email
              Routing).
            </>,
            <>
              <strong className="text-foreground">Supabase</strong> — managing user accounts and sign-in, and storing
              your chat history.
            </>,
            <>
              <strong className="text-foreground">Resend</strong> — sending the confirmation and password emails and
              the one-time reminder email.
            </>,
            <>
              <strong className="text-foreground">Modal</strong> — running the fetches of the websites you specify.
            </>,
            <>
              <strong className="text-foreground">Sentry</strong> (Functional Software, Inc.) — receiving and storing
              error reports from the browser in the EU region.
            </>,
            <>
              <strong className="text-foreground">OpenRouter</strong> (OpenRouter, Inc., USA) — routing answer
              generation to the language model DeepSeek V4.1 Flash, run by DeepInfra, Fireworks AI or Together AI
              (each USA), alternatively GPT-6 Luna at Microsoft Azure or OpenAI. For generation, the model receives
              questions, limited conversation history and relevant source texts. We only allow providers that do not
              use this data for training; providers in China are excluded. According to OpenRouter, it does not store
              question and answer content.
            </>,
            <>
              <strong className="text-foreground">Google</strong> — for answer generation with Gemini via the
              Cloudflare AI Gateway and for optional sign-in with Google. For generation, the model receives questions,
              limited conversation history and relevant source texts. Emails to hallo@cracha-app.com also end up in a
              Google Mail inbox.
            </>,
          ]}
        />
        <p>
          For payments, Stripe processes payment and billing data. We store the link to your account, payment
          references, credit records and the documented declaration on the immediate start of performance. We do not
          store full card details. The processing serves the performance of the contract (Art. 6(1)(b) GDPR),
          statutory retention obligations (point (c)) and the prevention of abuse (point (f)).
        </p>
        <p>Your data is not transferred for advertising purposes or sold to third parties.</p>
        <p>
          <strong className="text-foreground">Transfers to third countries.</strong> Some of these providers are based
          in the United States or also process data there. Transfers are based on the European Commission&apos;s
          standard contractual clauses under Art. 46(2)(c) GDPR and, where the provider is certified, the EU-US Data
          Privacy Framework under Art. 45 GDPR.
        </p>
      </Section>

      <Section heading="6. Content of third-party websites">
        <p>
          When you specify a website, we fetch its publicly accessible pages and store the text in a search index only
          you can access. The following applies:
        </p>
        <List
          items={[
            <>We only fetch publicly accessible pages. Areas behind a login are not fetched.</>,
            <>
              The instructions in the <code className="rounded bg-foreground/10 px-1 py-0.5 text-sm">robots.txt</code> file are respected on request (a setting when
              reading).
            </>,
            <>
              Only choose content you may lawfully fetch and analyze. The data protection obligations depend on the
              content and your purpose. Details are set out in the{" "}
              <Link href="/nutzungsbedingungen" className="text-foreground underline underline-offset-4">
                terms of use
              </Link>
              .
            </>,
            <>If you delete a knowledge base, the associated content and search index are deleted.</>,
          ]}
        />
      </Section>

      <Section heading="7. Storage period">
        <List
          items={[
            <>
              <strong className="text-foreground">Account and usage data</strong>{" "}
              is stored as long as your account exists. You can delete your account yourself at any time under
              &ldquo;My account&rdquo;. We then cancel running fetches and immediately delete your login data (email
              address, name, password hash, Google link), all knowledge bases with the fetched content and the search
              index, cached search results, your chat history, your balance and your credit records. Any remaining
              balance, including purchased credits, is forfeited without refund. The crawl history is removed in the
              browser in which you trigger the deletion; on other devices it only exists locally and can be deleted in
              the browser there.
            </>,
            <>
              <strong className="text-foreground">Knowledge bases and content</strong>{" "}
              are removed when the knowledge base or your account is deleted.
            </>,
            <>
              <strong className="text-foreground">Chats</strong>{" "}
              are stored until you delete them, delete the knowledge base you used for them, or delete your account.
            </>,
            <>
              <strong className="text-foreground">Payment records</strong> for purchased credit packs (amount,
              credits, payment reference, status of refunds and chargebacks, documented declaration on the immediate
              start of performance) are kept for the statutory periods (Section 147 of the German Fiscal Code, Section
              257 of the German Commercial Code). After an account is deleted, this happens without a link to your
              account. Stripe can still match the payment reference; Stripe stores payment and customer data under its
              own responsibility and retention periods.
            </>,
            <>
              <strong className="text-foreground">Crawl status data</strong>{" "}
              at the crawler service (Modal) contains a job ID, the progress, the last page address fetched and, if
              applicable, an error message, but no user ID. It is removed automatically once its last update is seven
              days old and the crawl has been settled.
            </>,
            <>
              <strong className="text-foreground">Cached search results</strong>{" "}
              are discarded automatically as soon as the underlying index changes.
            </>,
            <>
              <strong className="text-foreground">Sign-in logs</strong> of our authentication provider (sign-ins,
              sign-outs, password and account changes with email address) are deleted after 30 days, and after an
              account deletion by the following day at the latest.
            </>,
            <>
              <strong className="text-foreground">Server logs</strong> are deleted according to the retention periods
              set up for the respective service. Technical operating data can include errors, times, user or request
              IDs and usage values.
            </>,
          ]}
        />
      </Section>

      <Section heading="8. Your rights">
        <p>You have the following rights towards us:</p>
        <List
          items={[
            <>Access to the data stored about you (Art. 15 GDPR)</>,
            <>Rectification of inaccurate data (Art. 16 GDPR)</>,
            <>Erasure (Art. 17 GDPR)</>,
            <>Restriction of processing (Art. 18 GDPR)</>,
            <>Data portability (Art. 20 GDPR)</>,
            <>Objection to processing based on a legitimate interest (Art. 21 GDPR)</>,
          ]}
        />
        <p>
          An informal message to the email address above is enough to exercise them. Regardless of this, you have the
          right to lodge a complaint with a data protection supervisory authority (Art. 77 GDPR), for example the
          authority where you live.
        </p>
      </Section>

      <Section heading="9. Changes to this policy">
        <p>
          We adapt this policy when the service or the legal situation changes. The version available on this page
          applies. We inform registered users of significant changes by email.
        </p>
      </Section>
    </LegalPage>
  );
}
