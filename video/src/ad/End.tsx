import { ArrowRight } from "lucide-react";
import React from "react";
import { AbsoluteFill } from "remotion";
import { LOGO_LETTERS, LOGO_VIEWBOX } from "../logo-paths";
import { Dot, Ring, Stack } from "./kit";
import { CX, CY, K, P, URL_CTA, clamp01, ez, mono, prog, serif, sp, ui, useT } from "./look";

const FI = K.finale;
const E = K.end;

/** "Link rein. / Fragen. / Quelle sehen." stack on the drop, then collapse into a dot. */
export const Finale: React.FC = () => {
  const t = useT();
  if (t < FI.words[0] || t >= E.hit + 0.1) return null;
  const words = ["Link rein.", "Fragen.", "Quelle sehen."].map((text, i) => ({ text, at: FI.words[i] }));
  return (
    <AbsoluteFill>
      <Stack words={words} collapse={FI.collapse} />
      <Dot scale={prog(t, FI.collapse + 0.18, FI.collapse + 0.3, ez.out)} color={P.ink} size={26} pulseFrom={FI.collapse + 0.5} />
    </AbsoluteFill>
  );
};

const LOGO_W = 860;
const LOGO_H = (LOGO_W * 19.6) / 80.7;

export const End: React.FC = () => {
  const t = useT();
  if (t < E.hit) return null;
  const claim = clamp01((t - E.claim) / 0.4);
  const cta = sp(t, E.cta, 11, 190);
  const url = clamp01((t - E.url) / 0.35);
  const rise = prog(t, E.claim - 0.1, E.claim + 0.5, ez.inOut);
  return (
    <AbsoluteFill>
      <Ring x={CX} y={CY} at={E.hit} size={1500} dur={1.1} width={3} />
      <Ring x={CX} y={CY} at={E.hit + 0.1} size={900} dur={1.0} width={2} color={P.ink} />
      <svg
        viewBox={LOGO_VIEWBOX}
        width={LOGO_W}
        height={LOGO_H}
        style={{ position: "absolute", left: CX - LOGO_W / 2, top: CY - LOGO_H / 2 - rise * 150, overflow: "visible", transform: `scale(${1 - rise * 0.12})` }}
      >
        {LOGO_LETTERS.map((d, i) => {
          const p = sp(t, E.hit + i * 0.04, 12, 210, 0.7);
          return <path key={i} d={d} fill={P.ink} opacity={clamp01(p * 2)} transform={`translate(0 ${(1 - p) * 10})`} />;
        })}
      </svg>
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: CY + 10,
          textAlign: "center",
          fontFamily: serif,
          fontStyle: "italic",
          fontSize: 100,
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
          left: CX - 290,
          top: CY + 180,
          width: 580,
          height: 108,
          borderRadius: 54,
          background: P.accent,
          color: "white",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 16,
          fontFamily: ui,
          fontSize: 38,
          fontWeight: 600,
          transform: `scale(${cta})`,
        }}
      >
        Kostenlos starten
        <ArrowRight size={38} strokeWidth={2.4} />
      </div>
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: CY + 330,
          textAlign: "center",
          fontFamily: mono,
          fontSize: 26,
          letterSpacing: "0.14em",
          color: P.muted,
          opacity: url,
          transform: `translateY(${(1 - url) * 10}px)`,
        }}
      >
        {URL_CTA.toUpperCase()}
      </div>
    </AbsoluteFill>
  );
};
