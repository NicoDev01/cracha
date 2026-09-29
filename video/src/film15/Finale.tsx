import { useCurrentFrame } from "remotion";
import { LOGO_LETTERS, LOGO_VIEWBOX } from "../logo-paths";
import { CX, FPS, ease, heading, prog, ui } from "../theme";
import { Layer, phase } from "./Box";
import { K, cues } from "./look";

const F = cues.finale;

/** The one number we can back: the page slider in the crawl form stops at 500. */
export const Metric: React.FC = () => {
  const t = useCurrentFrame() / FPS;
  const n = Math.round(prog(t, 12.62, 13.15, ease.out) * 500);
  return (
    <Layer w={760} h={320} style={phase(t, 12.62, F)}>
      <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
        <div style={{ fontFamily: heading, fontWeight: 800, fontSize: 168, lineHeight: 1, letterSpacing: "-0.04em", color: K.ink, fontVariantNumeric: "tabular-nums" }}>
          {n}
        </div>
        <div style={{ fontFamily: ui, fontSize: 28, fontWeight: 600, color: K.ink, marginTop: 10 }}>Seiten pro Crawl</div>
        <div style={{ fontFamily: ui, fontSize: 20, color: K.gray5, marginTop: 8 }}>bis zu 5 Ebenen tief · jede Antwort mit Quelle</div>
      </div>
    </Layer>
  );
};

/** The container ends as the call to action; the wordmark rises above it. */
export const Cta: React.FC = () => {
  const t = useCurrentFrame() / FPS;
  return (
    <Layer w={540} h={96} style={phase(t, F + 0.3, 99)}>
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: ui,
          fontSize: 28,
          fontWeight: 600,
          color: "#fff",
        }}
      >
        100 Start-Credits gratis
      </div>
    </Layer>
  );
};

export const Wordmark: React.FC = () => {
  const t = useCurrentFrame() / FPS;
  if (t < F) return null;
  const width = 720;
  const height = (width * 19.6) / 80.7;
  const url = prog(t, F + 0.55, F + 0.9, ease.out);
  return (
    <>
      <svg
        viewBox={LOGO_VIEWBOX}
        width={width}
        height={height}
        style={{ position: "absolute", left: CX - width / 2, top: 420 - height / 2, overflow: "visible" }}
      >
        {LOGO_LETTERS.map((d, i) => {
          const p = prog(t, F + 0.05 + i * 0.055, F + 0.6 + i * 0.055, ease.out);
          return <path key={i} d={d} fill={K.ink} opacity={p} transform={`translate(0 ${(1 - p) * 10})`} />;
        })}
      </svg>
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: 780,
          textAlign: "center",
          fontFamily: ui,
          fontSize: 24,
          color: K.gray5,
          opacity: url,
          transform: `translateY(${(1 - url) * 10}px)`,
        }}
      >
        cracha.aimpact-agency.workers.dev
      </div>
    </>
  );
};
