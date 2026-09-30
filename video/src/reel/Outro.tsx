import { ArrowRight } from "lucide-react";
import React from "react";
import { Row } from "./Intro";
import { Cursor, Ring } from "./kit";
import { Sentence } from "./Sentence";
import { C, T, TEXT, ease, lerp, prog, springAt } from "./theme";
import { GradientField, Logo } from "./ui";

/** Brand line with the logo in the sentence, then the end card with the call to action. */
export const Outro: React.FC<{ t: number }> = ({ t }) => {
  if (t < T.sourceOut) return null;
  const logo = prog(t, T.endLogo, T.endLogo + 0.5, ease.out);
  const pill = springAt(t, T.url, 12, 0.6);
  const press = Math.max(0, 1 - Math.abs(t - T.ctaClick) / 0.1);
  return (
    <>
      <Row y={0}>
        <Sentence
          t={t}
          id="brand"
          keys={["Crawl-Chat-Agent"]}
          out={T.brandOut}
          maxWidth={1700}
          inline={{ CraCha: <Logo h={78} style={{ verticalAlign: "-0.12em" }} /> }}
        />
      </Row>

      {logo > 0 && (
        <div
          style={{
            position: "absolute",
            left: 0,
            top: -150,
            transform: `translate(-50%, -50%) scale(${lerp(0.92, 1, logo)})`,
            opacity: logo,
            filter: logo < 1 ? `blur(${(1 - logo) * 12}px)` : undefined,
          }}
        >
          <Logo h={150} />
        </div>
      )}
      <Row y={40}>
        <Sentence t={t} id="cta" size="h2" keys={["kostenlos"]} align="center" />
      </Row>
      {pill > 0 && (
        <GradientField x={0} y={180} w={560} h={104} scale={lerp(0.8, 1, pill) * (1 - 0.05 * press)} opacity={Math.min(1, pill * 1.5)}>
          <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", gap: 16, fontSize: 44, fontWeight: 600 }}>
            {TEXT.url}
            <ArrowRight size={40} color={C.accent} strokeWidth={2.6} />
          </div>
        </GradientField>
      )}
      <Ring t={t} at={T.ctaClick} x={0} y={180} size={760} />
      <Cursor
        t={t}
        show={[T.url + 0.2, T.ctaClick + 0.8]}
        clicks={[T.ctaClick]}
        path={[
          { t: T.url + 0.2, x: 520, y: 400 },
          { t: T.ctaClick - 0.08, x: 180, y: 190 },
          { t: T.ctaClick + 0.8, x: 230, y: 250 },
        ]}
      />
    </>
  );
};
