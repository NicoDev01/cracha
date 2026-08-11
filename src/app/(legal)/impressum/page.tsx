import type { Metadata } from "next";

import { LegalPage, Platzhalter, Section } from "@/components/legal/legal-page";

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
          <Platzhalter>Vor- und Nachname bzw. Firma</Platzhalter>
          <br />
          <Platzhalter>Straße und Hausnummer</Platzhalter>
          <br />
          <Platzhalter>PLZ und Ort</Platzhalter>
          <br />
          Deutschland
        </p>
        <p>
          Bei einer eingetragenen Gesellschaft zusätzlich: Rechtsform,
          Vertretungsberechtigte, Registergericht und Registernummer.
        </p>
      </Section>

      <Section heading="Kontakt">
        <p>
          E-Mail: <Platzhalter>kontakt@cracha-app.com</Platzhalter>
          <br />
          Telefon: <Platzhalter>optional, aber empfohlen</Platzhalter>
        </p>
        <p>
          Eine Telefonnummer ist nicht zwingend, wenn eine andere Möglichkeit zur
          unmittelbaren und effizienten Kommunikation besteht — ein zuverlässig
          betreutes E-Mail-Postfach genügt.
        </p>
      </Section>

      <Section heading="Umsatzsteuer">
        <p>
          Umsatzsteuer-Identifikationsnummer gemäß § 27 a UStG:{" "}
          <Platzhalter>USt-IdNr., falls vorhanden</Platzhalter>
        </p>
        <p>
          Bei Kleinunternehmerregelung nach § 19 UStG entfällt dieser Punkt.
        </p>
      </Section>

      <Section heading="Verantwortlich für den Inhalt">
        <p>
          <Platzhalter>Vor- und Nachname</Platzhalter>, Anschrift wie oben.
        </p>
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
