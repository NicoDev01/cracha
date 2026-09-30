import { ArrowRight } from "lucide-react";
import React from "react";
import { AbsoluteFill } from "remotion";
import { Ring } from "../ad/kit";
import { LogoMorph } from "../ad/LogoMorph";
import { CX, CY, P, URL_CTA, clamp01, ez, prog, sp, ui, useT } from "../ad/look";
import K from "./cues.json";

const E = K.end;
const LOGO_W = 820;

/** Blur-in for one word, on the voice. */
const blurIn = (t: number, at: number) => {
  const q = clamp01((t - at) / 0.35);
  const e = ez.out(q);
  return { opacity: e, filter: q < 1 ? `blur(${(1 - e) * 12}px)` : undefined, transform: `translateY(${(1 - e) * 24}px)`, display: "inline-block" } as const;
};

/** The dot becomes the wordmark; "Crawl-Chat-Agent" explains the name, then the button. */
export const End: React.FC = () => {
  const t = useT();
  if (t < E.hit) return null;
  const cta = sp(t, E.cta, 11, 190);
  const url = clamp01((t - E.url) / 0.35);
  const rise = prog(t, E.claim - 0.3, E.claim + 0.15, ez.inOut);
  const push = prog(t, E.hit, K.duration, (x) => x) * 0.03;
  const accent = (s: string) => <span style={{ color: P.accent }}>{s}</span>;
  return (
    <AbsoluteFill style={{ transform: `scale(${1 + push})` }}>
      <Ring x={CX} y={CY} at={E.hit + 0.1} size={1500} dur={1.1} width={3} />
      <Ring x={CX} y={CY} at={E.hit + 0.1} size={900} dur={1.0} width={2} color={P.ink} />
      <LogoMorph cx={CX} cy={CY - rise * 170} width={LOGO_W * (1 - rise * 0.12)} p={prog(t, E.hit, E.hit + 0.45, ez.inOut)} />
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: CY - 10,
          textAlign: "center",
          fontFamily: ui,
          fontWeight: 800,
          fontSize: 76,
          letterSpacing: "-0.03em",
          color: P.ink,
          whiteSpace: "nowrap",
        }}
      >
        <span style={blurIn(t, E.claim + 0.05)}>der&nbsp;</span>
        <span style={blurIn(t, E.claim + 0.18)}>
          {accent("Cra")}wl-{accent("Cha")}t-Agent
        </span>
      </div>
      <div
        style={{
          position: "absolute",
          left: CX - 290,
          top: CY + 150,
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
          fontSize: 40,
          fontWeight: 700,
          transform: `scale(${cta})`,
        }}
      >
        Kostenlos starten
        <ArrowRight size={40} strokeWidth={2.6} />
      </div>
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: CY + 300,
          textAlign: "center",
          fontFamily: ui,
          fontWeight: 700,
          fontSize: 34,
          color: P.muted,
          opacity: url,
          transform: `translateY(${(1 - url) * 10}px)`,
        }}
      >
        {URL_CTA}
      </div>
    </AbsoluteFill>
  );
};
