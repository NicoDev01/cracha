import { setRequestLocale } from "next-intl/server";

import { LegalPage, Section } from "@/components/legal/legal-page";
import type { Locale } from "@/i18n/routing";
import { legalMetadata } from "../legal-metadata";

export async function generateMetadata({ params }: PageProps<"/[locale]/impressum">) {
  const locale = (await params).locale as Locale;
  return locale === "en"
    ? legalMetadata("/impressum", locale, "Legal notice", "Provider identification under Section 5 of the German Digital Services Act (DDG).")
    : legalMetadata("/impressum", locale, "Impressum", "Anbieterkennzeichnung nach § 5 DDG.");
}

export default async function ImpressumPage({ params }: PageProps<"/[locale]/impressum">) {
  const locale = (await params).locale as Locale;
  setRequestLocale(locale);
  return locale === "en" ? <LegalNotice /> : <Impressum />;
}

function Impressum() {
  return (
    <LegalPage title="Impressum" updated="10. August 2026">
      <Section heading="Angaben gemäß § 5 DDG">
        <p>
          Nicolas Guerrero Tello
          <br />
          Meyerstraße 216
          <br />
          28201 Bremen
          <br />
          Deutschland
        </p>
      </Section>

      <Section heading="Kontakt">
        <p>E-Mail: hallo@cracha-app.com</p>
      </Section>

      <Section heading="Verantwortlich für den Inhalt">
        <p>Nicolas Guerrero Tello, Anschrift wie oben.</p>
      </Section>

      <Section heading="Streitbeilegung">
        <p>
          Wir sind nicht bereit und nicht verpflichtet, an
          Streitbeilegungsverfahren vor einer Verbraucherschlichtungsstelle
          teilzunehmen.
        </p>
      </Section>

      <Section heading="Haftung für Inhalte und Links">
        <p>
          Als Diensteanbieter sind wir für eigene Inhalte auf diesen Seiten nach
          den allgemeinen Gesetzen verantwortlich. Wir sind jedoch nicht
          verpflichtet, übermittelte oder gespeicherte fremde Informationen zu
          überwachen oder nach Umständen zu forschen, die auf eine rechtswidrige
          Tätigkeit hinweisen.
        </p>
        <p>
          Unser Angebot enthält Verweise auf externe Websites Dritter, auf deren
          Inhalte wir keinen Einfluss haben. Für diese Inhalte ist stets der
          jeweilige Anbieter verantwortlich. Bei Bekanntwerden von
          Rechtsverletzungen entfernen wir derartige Verweise umgehend.
        </p>
      </Section>
    </LegalPage>
  );
}

function LegalNotice() {
  return (
    <LegalPage title="Legal notice" updated="August 10, 2026" locale="en">
      <Section heading="Information under Section 5 DDG">
        <p>
          Nicolas Guerrero Tello
          <br />
          Meyerstraße 216
          <br />
          28201 Bremen
          <br />
          Germany
        </p>
      </Section>

      <Section heading="Contact">
        <p>Email: hallo@cracha-app.com</p>
      </Section>

      <Section heading="Responsible for the content">
        <p>Nicolas Guerrero Tello, address as above.</p>
      </Section>

      <Section heading="Dispute resolution">
        <p>
          We are neither willing nor obliged to take part in dispute resolution proceedings before a consumer
          arbitration board.
        </p>
      </Section>

      <Section heading="Liability for content and links">
        <p>
          As a service provider we are responsible for our own content on these pages under general law. However, we
          are not obliged to monitor third-party information transmitted or stored, or to look for circumstances that
          indicate illegal activity.
        </p>
        <p>
          Our service contains links to external third-party websites whose content we have no influence on. The
          respective provider is always responsible for that content. If we become aware of legal violations, we will
          remove such links immediately.
        </p>
      </Section>
    </LegalPage>
  );
}
