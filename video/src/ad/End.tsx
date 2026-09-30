import { ArrowRight } from "lucide-react";
import React from "react";
import { AbsoluteFill } from "remotion";
import { LOGO_LETTERS, LOGO_VIEWBOX } from "../logo-paths";
import { MiniPage, Ring } from "./kit";
import { CX, CY, K, P, URL_CTA, clamp01, ez, lerp, mono, prog, rnd, serif, sp, ui, useT } from "./look";

const FI = K.finale;
const E = K.end;

/** Dozens of pages whirl around the centre and are pulled into one point. */
const Swirl: React.FC = () => {
  const t = useT();
  if (t < FI.swirl || t >= E.hit) return null;
  const n = 44;
  const pull = prog(t, FI.swirl + 0.3, FI.collapse + 0.2, ez.in);
  const dot = prog(t, FI.collapse + 0.1, FI.collapse + 0.25, ez.out);
  return (
    <AbsoluteFill>
      {Array.from({ length: n }, (_, i) => {
        const appear = prog(t, FI.swirl + (i / n) * 0.15, FI.swirl + (i / n) * 0.15 + 0.15, ez.out);
        const a0 = (i / n) * Math.PI * 2 * 3 + rnd(i, 2);
        const a = a0 + (t - FI.swirl) * (2.2 + rnd(i, 5)) + pull * 3;
        const r = lerp(260 + rnd(i, 3) * 420, 0, pull) * (0.4 + 0.6 * appear);
        const s = (0.35 + rnd(i, 4) * 0.25) * (1 - pull);
        if (s <= 0.01) return null;
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: CX + Math.cos(a) * r * 1.4 - 150,
              top: CY + Math.sin(a) * r * 0.8 - 100,
              width: 300,
              height: 200,
              transform: `scale(${s}) rotate(${(a * 180) / Math.PI / 6}deg)`,
              opacity: appear,
            }}
          >
            <MiniPage title={["Hilfe", "FAQ", "Konto", "Preise", "Blog"][i % 5]} path="" seed={i} />
          </div>
        );
      })}
      {dot > 0 ? (
        <div
          style={{
            position: "absolute",
            left: CX - 14,
            top: CY - 14,
            width: 28,
            height: 28,
            borderRadius: 14,
            background: P.ink,
            transform: `scale(${dot * (1 + 0.2 * Math.sin((t - FI.collapse) * Math.PI * 4))})`,
          }}
        />
      ) : null}
    </AbsoluteFill>
  );
};

const LOGO_W = 900;
const LOGO_H = (LOGO_W * 19.6) / 80.7;

export const End: React.FC = () => {
  const t = useT();
  if (t < FI.swirl) return null;
  const claim = clamp01((t - E.claim) / 0.4);
  const cta = sp(t, E.cta, 11, 190);
  const url = clamp01((t - E.credits) / 0.35);
  const settle = prog(t, E.hit, E.hit + 0.9, ez.out);
  return (
    <AbsoluteFill style={{ background: P.accent }}>
      <Swirl />
      {t >= E.hit ? (
        <>
          {[0, 0.08, 0.2].map((d, i) => (
            <Ring key={i} x={CX} y={CY - 120} at={E.hit + d} size={2400 - i * 500} width={10 - i * 3} dur={1.0} color={i === 1 ? P.paper : P.ink} />
          ))}
          <svg
            viewBox={LOGO_VIEWBOX}
            width={LOGO_W}
            height={LOGO_H}
            style={{ position: "absolute", left: CX - LOGO_W / 2, top: CY - 130 - LOGO_H / 2, overflow: "visible", transform: `scale(${1.08 - 0.08 * settle})` }}
          >
            {LOGO_LETTERS.map((d, i) => {
              const p = sp(t, E.hit + i * 0.035, 12, 210, 0.7);
              return <path key={i} d={d} fill={P.ink} opacity={clamp01(p * 2)} transform={`translate(0 ${(1 - p) * 9}) `} />;
            })}
          </svg>
          <div
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              top: CY + 30,
              textAlign: "center",
              fontFamily: serif,
              fontStyle: "italic",
              fontSize: 96,
              color: P.ink,
              opacity: claim,
              filter: `blur(${(1 - claim) * 12}px)`,
              transform: `translateY(${(1 - claim) * 24}px)`,
            }}
          >
            Frag deine Website.
          </div>
          <div
            style={{
              position: "absolute",
              left: CX - 280,
              top: CY + 190,
              width: 560,
              height: 104,
              borderRadius: 52,
              background: P.ink,
              color: P.paper,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 16,
              fontFamily: ui,
              fontSize: 36,
              fontWeight: 600,
              transform: `scale(${cta})`,
            }}
          >
            Kostenlos starten
            <ArrowRight size={36} strokeWidth={2.4} />
          </div>
          <div
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              top: CY + 332,
              textAlign: "center",
              fontFamily: mono,
              fontSize: 26,
              letterSpacing: "0.14em",
              color: P.ink,
              opacity: url * 0.8,
              transform: `translateY(${(1 - url) * 10}px)`,
            }}
          >
            {URL_CTA.toUpperCase()}
          </div>
        </>
      ) : null}
    </AbsoluteFill>
  );
};
