import { ArrowRight } from "lucide-react";
import React from "react";
import { BlurWord, Cursor, Ring } from "./kit";
import { FRAME, LogoMorph } from "./LogoMorph";
import { C, FONT, T, TEXT, ease, lerp, prog, shadow, springAt } from "./theme";

const LOGO_W = 760;
const CONFETTI_COLORS = [C.accent, C.ink, C.mark, "#8b7cf6", "#60a5fa", "#fdba74"];

// Fixed pseudo-random confetti, so every render is the same.
const CONFETTI = Array.from({ length: 46 }, (_, i) => {
  const r = (n: number) => (Math.sin(i * 12.9898 + n * 78.233) * 43758.5453) % 1;
  const a = -Math.PI / 2 + (Math.abs(r(1)) - 0.5) * 2.6;
  const v = 900 + Math.abs(r(2)) * 900;
  return { vx: Math.cos(a) * v, vy: Math.sin(a) * v, spin: r(3) * 900, color: CONFETTI_COLORS[i % CONFETTI_COLORS.length], w: 14 + Math.abs(r(4)) * 12, round: i % 3 === 0 };
});

/** Dot → logo, "Crawl-Chat-Agent", then the call to action with a click and confetti. */
export const End: React.FC<{ t: number }> = ({ t }) => {
  if (t < T.collapse2 + 0.4) return null;

  const toLogo = (tt: number) => prog(tt, T.logo2, T.logo2 + 0.45, ease.inOut);
  const land = t < T.logo2 ? 1 - 0.25 * Math.sin(Math.min(1, (t - T.collapse2 - 0.4) / 0.2) * Math.PI) : 1;
  const bounce = t >= T.logo2 ? lerp(0.92, 1, springAt(t, T.logo2 + 0.3, 10, 0.5)) : 1;
  // The lockup moves up to make room for the button.
  const up = prog(t, T.cta - 0.3, T.cta + 0.15, ease.inOut);
  const y0 = lerp(-40, -200, up);
  const cta = springAt(t, T.cta, 11, 0.6);
  const press = Math.max(0, 1 - Math.abs(t - T.ctaClick) / 0.1);
  const [cw, ch1, ag] = T.tagline;

  return (
    <>
      <div style={{ position: "absolute", left: 0, top: y0, transform: `scale(${bounce}, ${bounce * land})` }}>
        <LogoMorph x={0} y={0} width={LOGO_W} from={{ kind: "dot", r: 14 }} to={{ kind: "logo" }} p={toLogo(t)} pAt={(k) => toLogo(t - k * FRAME)} />
      </div>
      <Ring t={t} at={T.logo2 + 0.1} x={0} y={y0} size={1150} />
      <div
        style={{
          position: "absolute",
          left: -700,
          width: 1400,
          top: y0 + 150,
          textAlign: "center",
          fontFamily: FONT,
          fontSize: 76,
          fontWeight: 700,
          letterSpacing: "-0.02em",
          color: C.ink,
        }}
      >
        <BlurWord t={t} at={cw - 0.05}>
          <span style={{ color: C.accent }}>Cr</span>awl-
        </BlurWord>
        <BlurWord t={t} at={ch1 - 0.05}>
          <span style={{ color: C.accent }}>Ch</span>at-
        </BlurWord>
        <BlurWord t={t} at={ag - 0.05}>Agent</BlurWord>
      </div>

      {cta > 0 && (
        <div
          style={{
            position: "absolute",
            left: -360,
            width: 720,
            top: 150,
            height: 120,
            borderRadius: 60,
            background: C.accent,
            boxShadow: shadow(0.9),
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 18,
            fontFamily: FONT,
            fontSize: 50,
            fontWeight: 700,
            color: "white",
            transform: `scale(${cta * (1 - 0.06 * press)})`,
          }}
        >
          {TEXT.cta}
          <ArrowRight size={50} color="white" strokeWidth={2.8} />
        </div>
      )}
      <div
        style={{
          position: "absolute",
          left: -400,
          width: 800,
          top: 300,
          textAlign: "center",
          fontFamily: FONT,
          fontSize: 40,
          fontWeight: 600,
          color: C.sub,
        }}
      >
        <BlurWord t={t} at={T.url}>{TEXT.url}</BlurWord>
      </div>
      <Ring t={t} at={T.ctaClick} x={0} y={210} size={900} />
      {CONFETTI.map((c, i) => {
        const x = t - T.ctaClick;
        if (x <= 0 || x > 1.6) return null;
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: c.vx * x,
              top: 210 + c.vy * x + 1400 * x * x,
              width: c.w,
              height: c.round ? c.w : c.w * 0.5,
              borderRadius: c.round ? "50%" : 3,
              background: c.color,
              opacity: 1 - Math.max(0, (x - 1.1) / 0.5),
              transform: `rotate(${c.spin * x}deg)`,
            }}
          />
        );
      })}
      <Cursor
        t={t}
        show={[T.url + 0.1, T.ctaClick + 0.6]}
        clicks={[T.ctaClick]}
        path={[
          { t: T.url + 0.1, x: 560, y: 420 },
          { t: T.ctaClick - 0.08, x: 250, y: 215 },
          { t: T.ctaClick + 0.6, x: 300, y: 260 },
        ]}
      />
    </>
  );
};
