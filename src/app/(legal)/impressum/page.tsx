import type { Metadata } from "next";

import { LegalPage, Section } from "@/components/legal/legal-page";

export const metadata: Metadata = {
  alternates: { canonical: "/impressum" },
  title: "Impressum",
  description: "Anbieterkennzeichnung nach § 5 DDG.",
};

export default function ImpressumPage() {
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
