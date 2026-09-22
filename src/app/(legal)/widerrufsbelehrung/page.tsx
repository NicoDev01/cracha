import type { Metadata } from "next";

import { LegalPage, Section } from "@/components/legal/legal-page";

export const metadata: Metadata = {
  alternates: { canonical: "/widerrufsbelehrung" },
  title: "Widerrufsbelehrung",
  description: "Widerrufsbelehrung und Muster-Widerrufsformular für Verbraucher beim Kauf von CraCha-Nutzungsguthaben.",
};

export default function WiderrufsbelehrungPage() {
  return (
    <LegalPage
      title="Widerrufsbelehrung"
      updated="20. September 2026"
      intro={
        <>
          Verbrauchern steht beim Kauf von Nutzungsguthaben (Credits) ein gesetzliches
          Widerrufsrecht nach Maßgabe der folgenden Belehrung zu.
        </>
      }
    >
      <Section heading="Widerrufsrecht">
        <p>
          Du hast das Recht, binnen vierzehn Tagen ohne Angabe von Gründen diesen Vertrag zu
          widerrufen.
        </p>
        <p>
          Die Widerrufsfrist beträgt vierzehn Tage ab dem Tag des Vertragsabschlusses.
        </p>
        <p>
          Um dein Widerrufsrecht auszuüben, musst du uns (Nicolas Guerrero Tello, Meyerstraße 216,
          28201 Bremen, Deutschland, E-Mail: hallo@cracha-app.com) mittels einer eindeutigen
          Erklärung (z. B. ein mit der Post versandter Brief oder eine E-Mail) über deinen
          Entschluss, diesen Vertrag zu widerrufen, informieren. Du kannst dafür das beigefügte
          Muster-Widerrufsformular verwenden, das jedoch nicht vorgeschrieben ist.
        </p>
        <p>
          Zur Wahrung der Widerrufsfrist reicht es aus, dass du die Mitteilung über die Ausübung
          des Widerrufsrechts vor Ablauf der Widerrufsfrist absendest.
        </p>
      </Section>

      <Section heading="Folgen des Widerrufs">
        <p>
          Wenn du diesen Vertrag widerrufst, haben wir dir alle Zahlungen, die wir von dir
          erhalten haben, unverzüglich und spätestens binnen vierzehn Tagen ab dem Tag
          zurückzuzahlen, an dem die Mitteilung über deinen Widerruf dieses Vertrags bei uns
          eingegangen ist. Für diese Rückzahlung verwenden wir dasselbe Zahlungsmittel, das du bei
          der ursprünglichen Transaktion eingesetzt hast, es sei denn, mit dir wurde ausdrücklich
          etwas anderes vereinbart; in keinem Fall werden dir wegen dieser Rückzahlung Entgelte
          berechnet.
        </p>
      </Section>

      <Section heading="Leistungsbeginn vor Ablauf der Widerrufsfrist">
        <p>Du kannst verlangen, dass CraCha bereits während der Widerrufsfrist mit der Leistung beginnt. Allein die Gutschrift oder Nutzung von Credits führt bei uns nicht zu einem pauschalen Verzicht auf dein Widerrufsrecht.</p>
        <p>Hast du den vorzeitigen Beginn ausdrücklich verlangt, kann bei einem Widerruf für die bis dahin erbrachten Dienstleistungen ein angemessener, anteiliger Betrag anfallen, soweit die gesetzlichen Voraussetzungen für Wertersatz erfüllt sind. Maßgeblich ist der Anteil der erbrachten Leistungen am vereinbarten Gesamtumfang. Gesetzliche Rechte bleiben unberührt.</p>
      </Section>

      <Section heading="Muster-Widerrufsformular">
        <p className="text-sm text-muted-foreground">
          (Wenn du den Vertrag widerrufen willst, dann fülle bitte dieses Formular aus und sende es
          zurück.)
        </p>
        <div className="rounded-xl border border-border p-4 text-sm space-y-2 bg-muted/30">
          <p>An: Nicolas Guerrero Tello, Meyerstraße 216, 28201 Bremen, Deutschland, E-Mail: hallo@cracha-app.com</p>
          <p>
            Hiermit widerrufe(n) ich/wir (*) den von mir/uns (*) abgeschlossenen Vertrag über den
            Kauf der folgenden Waren (*) / die Erbringung der folgenden Dienstleistung (*):
          </p>
          <p>Bestellt am (*) / erhalten am (*):</p>
          <p>Name des/der Verbraucher(s):</p>
          <p>Anschrift des/der Verbraucher(s):</p>
          <p>Unterschrift des/der Verbraucher(s) (nur bei Mitteilung auf Papier):</p>
          <p>Datum:</p>
          <p className="text-xs text-muted-foreground">(*) Unzutreffendes streichen.</p>
        </div>
      </Section>
    </LegalPage>
  );
}
