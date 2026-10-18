import { setRequestLocale } from "next-intl/server";

import { LegalPage, List, Section } from "@/components/legal/legal-page";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { legalMetadata } from "../legal-metadata";

export async function generateMetadata({ params }: PageProps<"/[locale]/nutzungsbedingungen">) {
  const locale = (await params).locale as Locale;
  return locale === "en"
    ? legalMetadata("/nutzungsbedingungen", locale, "Terms of use", "Terms for using CraCha: account, credit model, permitted use, responsibility for websites read, liability and term.")
    : legalMetadata("/nutzungsbedingungen", locale, "Nutzungsbedingungen", "Bedingungen für die Nutzung von CraCha: Konto, Credit-Modell, erlaubte Nutzung, Verantwortung für abgerufene Websites, Haftung und Laufzeit.");
}

export default async function NutzungsbedingungenPage({ params }: PageProps<"/[locale]/nutzungsbedingungen">) {
  const locale = (await params).locale as Locale;
  setRequestLocale(locale);
  return locale === "en" ? <TermsOfUse /> : <Nutzungsbedingungen />;
}

function Nutzungsbedingungen() {
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

function TermsOfUse() {
  return (
    <LegalPage
      title="Terms of use"
      updated="September 20, 2026"
      locale="en"
      intro={<>These terms govern the use of CraCha at cracha-app.com. By signing up, you agree to them.</>}
    >
      <Section heading="1. Provider">
        <p>Nicolas Guerrero Tello, Meyerstraße 216, 28201 Bremen, Germany. Contact: hallo@cracha-app.com</p>
      </Section>

      <Section heading="2. Subject of the service">
        <p>
          CraCha fetches publicly accessible websites that you choose, processes their content and answers your
          questions about it with the help of language models. The answers are generated automatically and come with
          source references.
        </p>
        <p>
          <strong className="text-foreground">Answers can be wrong or incomplete.</strong>{" "}
          Language models can reproduce content incorrectly. Check every answer you want to rely on against the source
          given. CraCha does not replace legal, medical, tax or other professional advice.
        </p>
      </Section>

      <Section heading="3. Fees, credits & withdrawal">
        <p>CraCha is used through a credit-based balance model:</p>
        <List
          items={[
            <>New accounts receive a one-time starting balance for trying the service without obligation.</>,
            <>
              Additional balance can be purchased as credit packs through the payment provider Stripe. All prices
              include statutory VAT.
            </>,
            <>
              Credits are used when crawling websites and for chat requests. The applicable rates and the current
              balance are shown transparently in the dashboard. Chat credits are refunded for technical errors without
              a complete answer. If you stop the transmission after the answer has started, the request remains
              charged.
            </>,
            <>
              Credits are tied to your account and cannot be transferred to other accounts. There is currently no
              automatic time-based expiry of credits. Statutory refund claims, in particular in the event of
              withdrawal, remain unaffected.
            </>,
            <>
              <strong>Right of withdrawal:</strong> consumers generally have a statutory right of withdrawal when
              buying credits. Details are set out in our{" "}
              <Link href="/widerrufsbelehrung" className="text-blue-600 underline">
                withdrawal policy
              </Link>. Requesting an immediate start of performance is not a blanket waiver of the right of
              withdrawal. For services provided before a withdrawal, proportionate compensation may be due under the
              statutory requirements.
            </>,
          ]}
        />
      </Section>

      <Section heading="4. Account">
        <p>
          An account is required to use the service. You confirm that you provide truthful information, are at least
          16 years old and will not share your login details. You are responsible for actions taken through your
          account. If you suspect unauthorized access, please inform us immediately.
        </p>
      </Section>

      <Section heading="5. Your responsibility for the websites read">
        <p>
          This is the most important section of these terms. You decide which website is fetched — and you are
          responsible for it. You confirm that for every address you enter you:
        </p>
        <List
          items={[
            <>
              are entitled to fetch and analyze the content, whether as the operator of the website, with the
              operator&apos;s permission, or because the use is permitted under the website&apos;s terms and
              applicable law,
            </>,
            <>do not infringe any copyrights, trademarks or other third-party rights,</>,
            <>comply with the data protection rules that apply to your purpose when third-party personal data is involved.</>,
          ]}
        />
        <p>
          In particular, areas behind a login, pages whose operator has prohibited automated retrieval, and services
          whose content is obviously unlawful must not be fetched.
        </p>
        <p>The statutory liability rules apply to culpable infringements.</p>
      </Section>

      <Section heading="6. Prohibited use">
        <p>The following are not permitted in particular:</p>
        <List
          items={[
            <>attempting to access other users&apos; knowledge bases, accounts or data,</>,
            <>
              actions that impair the availability of the service, such as automated mass requests, DoS attacks or
              creating fake accounts in large numbers,
            </>,
            <>circumventing technical restrictions, refund mechanisms or security limits,</>,
            <>reselling the service or its results without our written consent.</>,
          ]}
        />
      </Section>

      <Section heading="7. Rights to content">
        <p>
          We acquire no rights to the content you bring in or to the knowledge bases created from it. You merely grant
          us the simple right to store and process it to the extent necessary to provide the service. This right ends
          when the respective knowledge base is deleted.
        </p>
      </Section>

      <Section heading="8. Liability">
        <p>
          We are liable without limitation for intent and gross negligence and for injury to life, body or health. In
          cases of simple negligence we are only liable for breach of an essential contractual obligation — one whose
          fulfillment makes the proper performance of the contract possible in the first place and on whose
          observance you may regularly rely — and limited to the foreseeable damage typical for the contract at the
          time it was concluded.
        </p>
        <p>Liability under the German Product Liability Act and for expressly assumed guarantees remains unaffected.</p>
      </Section>

      <Section heading="9. Term and termination">
        <p>
          You can request the termination and deletion of your account at any time via support. We can terminate the
          contract with 14 days&apos; notice. In the event of a serious breach of these terms — in particular of
          section 5 or 6 — we can block access without prior notice and close the account.
        </p>
      </Section>

      <Section heading="10. Changes">
        <p>
          We will notify you of changes to these terms. Where consent is required, we will ask for it explicitly;
          your silence does not count as consent. For services already purchased, the agreed terms remain decisive.
        </p>
      </Section>

      <Section heading="11. Final provisions">
        <p>
          German law applies, excluding the UN Convention on Contracts for the International Sale of Goods. If you
          are a consumer, mandatory consumer protection provisions of your country of residence remain unaffected. If
          any provision is invalid, the validity of the remaining provisions remains unaffected.
        </p>
        <p>We are neither willing nor obliged to take part in dispute resolution proceedings before a consumer arbitration board.</p>
      </Section>
    </LegalPage>
  );
}
