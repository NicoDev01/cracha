import { Globe, Sparkles } from "lucide-react";
import { C, CX, CY, SHADOW, SHADOW_SM, heading, lerp, prog, ui } from "../theme";
import { K, SITE, clamp01, ez, sp, useT } from "./kit";
import { PAGES_READ } from "./Crawl";

// The question is the morphing box; this scene draws the answer, its sources,
// and the dive from source 1 into the page it was taken from.

const A = K.answer;
export const QUESTION = { text: "Welche Zahlungsarten bietet ihr an?", cx: 1130, cy: 250, w: 620, h: 84 };
const CARD = { left: 480, top: 330, w: 960, h: 196 };
const PILL = { w: 470, h: 72 };
const CHIP_TOP = CARD.top + CARD.h + 30;
const CHIP_H = 62;
export const CHIPS = [
  { n: 1, url: `${SITE}/service/hilfe/zahlung`, left: 480, w: 590 },
  { n: 2, url: `${SITE}/versand`, left: 1086, w: 354 },
];
const CHIP1 = { cx: CHIPS[0].left + CHIPS[0].w / 2, cy: CHIP_TOP + CHIP_H / 2 };
export const SOURCE = { cx: CX, cy: CY, w: 1320, h: 776 };

type Token = { w: string; bold?: boolean; cite?: number };
const TOKENS: Token[] = [
  ..."Du kannst per".split(" ").map((w) => ({ w })),
  ..."PayPal, Kreditkarte oder Rechnung".split(" ").map((w) => ({ w, bold: true })),
  { w: "bezahlen." },
  { w: "", cite: 1 },
  ..."Ab 50 € Bestellwert ist der Versand kostenlos.".split(" ").map((w) => ({ w })),
  { w: "", cite: 2 },
];

/** 0..1 while everything but source 1 falls back during the dive. */
export const diveAt = (t: number) => prog(t, A.dive, A.dive + 0.45, ez.in);
/** Where the chat zooms from during the dive. */
export const DIVE_ORIGIN = CHIP1;

const Cite: React.FC<{ n: number; glow: number }> = ({ n, glow }) => (
  <span
    style={{
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      minWidth: 34,
      height: 34,
      marginLeft: 2,
      borderRadius: 10,
      fontSize: 19,
      fontWeight: 700,
      color: glow > 0.05 ? "white" : C.accent,
      background: glow > 0.05 ? C.accent : `${C.orange}18`,
      transform: `scale(${1 + glow * 0.18})`,
      boxShadow: `0 0 0 ${glow * 8}px rgba(249,115,22,${glow * 0.25})`,
      verticalAlign: "middle",
    }}
  >
    {n}
  </span>
);

export const ChipContent: React.FC<{ n: number; url: string }> = ({ n, url }) => (
  <div style={{ display: "flex", alignItems: "center", gap: 12, height: CHIP_H, padding: "0 24px 0 12px", fontFamily: ui, fontSize: 21, fontWeight: 500, color: C.text, whiteSpace: "nowrap" }}>
    <div style={{ width: 38, height: 38, borderRadius: 19, background: `${C.orange}14`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, fontWeight: 700, color: C.accent }}>{n}</div>
    <Globe size={20} color={C.muted} strokeWidth={2} />
    {url}
  </div>
);

/** Answer card and sources; lives inside the chat's depth layer. */
export const Answer: React.FC = () => {
  const t = useT();
  if (t < A.card - 0.1 || t > A.dive + 0.6) return null;
  const appear = sp(t, A.card, 13, 200);
  const open = prog(t, A.card + 0.2, A.card + 0.6, ez.soft);
  const w = lerp(PILL.w, CARD.w, open);
  const h = lerp(PILL.h, CARD.h, open);
  const perWord = (A.sources - 0.2 - (A.card + 0.35)) / TOKENS.length;
  const glow = prog(t, A.sources, A.sources + 0.25, ez.out);
  const sweep = ((t - A.card) * 160) % 170 - 40;
  return (
    <>
      <div
        style={{
          position: "absolute",
          left: CARD.left,
          top: CARD.top,
          width: w,
          height: h,
          borderRadius: lerp(PILL.h / 2, 30, open),
          background: "white",
          boxShadow: SHADOW,
          outline: `1px solid ${C.line}`,
          overflow: "hidden",
          transformOrigin: "0% 0%",
          transform: `scale(${0.5 + 0.5 * appear})`,
          opacity: Math.min(1, appear * 2),
          fontFamily: ui,
        }}
      >
        <div style={{ position: "absolute", left: 0, top: 0, height: PILL.h, display: "flex", alignItems: "center", gap: 14, padding: "0 26px", whiteSpace: "nowrap", opacity: 1 - open }}>
          <Sparkles size={28} color={C.orange} strokeWidth={2.2} />
          <span
            style={{
              fontSize: 25,
              fontWeight: 600,
              backgroundImage: `linear-gradient(90deg, ${C.faint} 0%, ${C.faint} ${sweep}%, ${C.orange} ${sweep + 20}%, ${C.faint} ${sweep + 40}%, ${C.faint} 100%)`,
              WebkitBackgroundClip: "text",
              backgroundClip: "text",
              color: "transparent",
            }}
          >
            Durchsucht {PAGES_READ} Seiten …
          </span>
        </div>
        <div style={{ position: "absolute", left: 38, top: 30, width: CARD.w - 76, fontSize: 32, lineHeight: 1.6, color: C.text }}>
          {TOKENS.map((tok, i) => {
            const at = A.card + 0.35 + i * perWord;
            const p = sp(t, at, 14, 240);
            return (
              <span
                key={i}
                style={{
                  display: "inline-block",
                  marginRight: "0.28em",
                  opacity: clamp01((t - at) / 0.15),
                  transform: `translateY(${(1 - p) * 14}px)`,
                  filter: `blur(${(1 - clamp01((t - at) / 0.2)) * 6}px)`,
                  fontWeight: tok.bold ? 700 : 400,
                  color: tok.bold ? C.ink : undefined,
                }}
              >
                {tok.cite ? <Cite n={tok.cite} glow={tok.cite === 1 ? glow : glow * 0.5} /> : tok.w}
              </span>
            );
          })}
        </div>
      </div>
      {CHIPS.map((s, i) => {
        if (i === 0 && t >= A.dive) return null;
        const p = sp(t, A.sources + i * 0.12, 11, 200);
        const lit = i === 0 ? glow : 0;
        return (
          <div
            key={s.url}
            style={{
              position: "absolute",
              left: s.left,
              top: CHIP_TOP,
              width: s.w,
              height: CHIP_H,
              borderRadius: CHIP_H / 2,
              background: "white",
              boxShadow: SHADOW_SM,
              outline: `${1 + lit * 1.5}px solid ${lit > 0.05 ? C.orange : C.line}`,
              opacity: Math.min(1, p * 2),
              transform: `translateY(${(1 - p) * 40}px) scale(${0.7 + 0.3 * p})`,
            }}
          >
            <ChipContent n={s.n} url={s.url} />
          </div>
        );
      })}
    </>
  );
};

/** The original page. Drawn at 1320 × 776 and scaled by whoever shows it. */
export const SourcePage: React.FC<{ t: number }> = ({ t }) => {
  const mark = prog(t, A.marker, A.marker + 0.55, ez.soft);
  return (
    <div style={{ position: "absolute", left: 0, top: 0, width: SOURCE.w, height: SOURCE.h, fontFamily: ui, background: "white" }}>
      <div style={{ position: "absolute", left: 0, right: 0, height: 70, borderBottom: `1px solid ${C.line}`, display: "flex", alignItems: "center", gap: 10, padding: "0 28px" }}>
        {["#ff8a80", "#ffd166", "#7bdcb5"].map((c) => (
          <div key={c} style={{ width: 15, height: 15, borderRadius: 8, background: c }} />
        ))}
        <div style={{ marginLeft: 18, padding: "8px 20px", borderRadius: 24, background: "#f8f3ed", fontSize: 22, fontWeight: 500, color: C.muted }}>
          {SITE}
          <span style={{ color: C.ink }}>/service/hilfe/zahlung</span>
        </div>
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 10, padding: "8px 20px 8px 10px", borderRadius: 24, background: `${C.orange}16`, fontSize: 20, fontWeight: 700, color: C.accent }}>
          <div style={{ width: 30, height: 30, borderRadius: 15, background: C.accent, color: "white", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>1</div>
          Quelle · Ebene 4
        </div>
      </div>
      <div style={{ position: "absolute", left: 72, right: 72, top: 124 }}>
        <div style={{ fontSize: 24, fontWeight: 500, color: C.muted }}>Start › Service › Hilfe › Zahlung</div>
        <div style={{ marginTop: 12, fontFamily: heading, fontWeight: 800, fontSize: 68, letterSpacing: "-0.03em", color: C.ink }}>Zahlungsarten</div>
        <div style={{ marginTop: 22, fontSize: 36, lineHeight: 1.6, color: C.text, maxWidth: 1080 }}>
          Bei uns bezahlst du ganz bequem per{" "}
          <span
            style={{
              padding: "2px 8px",
              margin: "0 -4px",
              borderRadius: 10,
              fontWeight: 700,
              color: C.ink,
              backgroundImage: "linear-gradient(90deg, rgba(249,115,22,0.35), rgba(245,158,11,0.35))",
              backgroundRepeat: "no-repeat",
              backgroundSize: `${mark * 100}% 100%`,
            }}
          >
            PayPal, Kreditkarte oder Rechnung
          </span>
          . Alle Zahlungen sind verschlüsselt.
        </div>
        {[760, 640, 700].map((w, i) => (
          <div key={i} style={{ marginTop: i ? 16 : 40, width: w, height: 16, borderRadius: 16, background: "#f0e9e1" }} />
        ))}
      </div>
    </div>
  );
};

/** Source 1 grows out of its chip into the full page. */
export const SourceDive: React.FC = () => {
  const t = useT();
  if (t < A.dive || t >= K.edge.back) return null;
  const p = prog(t, A.dive, A.dive + 0.6, ez.cam);
  const cx = lerp(CHIP1.cx, SOURCE.cx, p);
  const cy = lerp(CHIP1.cy, SOURCE.cy, p);
  const w = lerp(CHIPS[0].w, SOURCE.w, p);
  const h = lerp(CHIP_H, SOURCE.h, p);
  const page = prog(t, A.dive + 0.3, A.dive + 0.55, ez.out);
  return (
    <div
      style={{
        position: "absolute",
        left: cx - w / 2,
        top: cy - h / 2,
        width: w,
        height: h,
        borderRadius: lerp(CHIP_H / 2, 28, p),
        background: "white",
        boxShadow: SHADOW,
        outline: `${2.5 * (1 - page) + 1}px solid ${page < 0.9 ? C.orange : C.line}`,
        overflow: "hidden",
      }}
    >
      <div style={{ position: "absolute", inset: 0, opacity: 1 - prog(t, A.dive, A.dive + 0.15, ez.out) }}>
        <ChipContent n={1} url={CHIPS[0].url} />
      </div>
      <div style={{ position: "absolute", left: 0, top: 0, transformOrigin: "0 0", transform: `scale(${w / SOURCE.w}, ${h / SOURCE.h})`, opacity: page }}>
        <SourcePage t={t} />
      </div>
    </div>
  );
};
