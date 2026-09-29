import { Globe, Sparkles } from "lucide-react";
import { useCurrentFrame } from "remotion";
import { C, FPS, SHADOW, SHADOW_SM, ease, heading, lerp, prog, ui } from "../theme";
import { ANSWER, CHAT, CHIP_H, CHIP_TOP, SOURCE, SOURCES } from "./layout";
import { E, SITE } from "./timeline";

// The question itself is the morphing box; this scene draws what answers it:
// a search pill that opens into the answer, and the sources under it.

type Token = { w: string; bold?: boolean; cite?: number };
const TOKENS: Token[] = [
  ..."Du kannst per".split(" ").map((w) => ({ w })),
  ..."PayPal, Kreditkarte oder Rechnung".split(" ").map((w) => ({ w, bold: true })),
  { w: "bezahlen." },
  { w: "", cite: 1 },
  ..."Ab 50 € Bestellwert ist der Versand kostenlos.".split(" ").map((w) => ({ w })),
  { w: "", cite: 2 },
];

const PILL = { w: 470, h: 72 };
const CARD = { w: CHAT.right - CHAT.left, h: ANSWER.h };

const hex = (x: number) => Math.round(x).toString(16).padStart(2, "0");

/** How strongly source 1 and its marker are lit. */
export const glowAt = (t: number) => prog(t, E.highlight, E.highlight + 0.3, ease.out);

const Cite: React.FC<{ n: number; glow: number }> = ({ n, glow }) => (
  <span
    style={{
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      minWidth: 32,
      height: 32,
      marginLeft: 2,
      borderRadius: 10,
      fontSize: 18,
      fontWeight: 700,
      color: glow > 0.05 ? "white" : C.accent,
      background: glow > 0.05 ? C.accent : `${C.orange}18`,
      boxShadow: `0 0 0 ${glow * 8}px ${C.orange}${hex(glow * 60)}`,
      verticalAlign: "middle",
    }}
  >
    {n}
  </span>
);

/** What a source chip shows; drawn by the chat and, for source 1, by the morphing box. */
export const ChipContent: React.FC<{ n: number; url: string }> = ({ n, url }) => (
  <div
    style={{
      display: "flex",
      alignItems: "center",
      gap: 12,
      height: CHIP_H,
      padding: "0 24px 0 12px",
      fontFamily: ui,
      fontSize: 21,
      fontWeight: 500,
      color: C.text,
      whiteSpace: "nowrap",
    }}
  >
    <div
      style={{
        width: 38,
        height: 38,
        borderRadius: 19,
        background: `${C.orange}14`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: 18,
        fontWeight: 700,
        color: C.accent,
      }}
    >
      {n}
    </div>
    <Globe size={20} color={C.muted} strokeWidth={2} />
    {url}
  </div>
);

export const Chat: React.FC = () => {
  const t = useCurrentFrame() / FPS;
  if (t < E.search - 0.1 || t > E.focus + 0.4) return null;

  // Everything but source 1 steps back; source 1 is handed to the morphing box.
  const out = prog(t, E.focus, E.focus + 0.35, ease.in);
  const appear = prog(t, E.search, E.search + 0.5, ease.back);
  const open = prog(t, E.answer - 0.15, E.answer + 0.5, ease.inOut);
  const w = lerp(PILL.w, CARD.w, open);
  const h = lerp(PILL.h, CARD.h, open);
  const perWord = (E.answerEnd - E.answer - 0.3) / TOKENS.length;
  const glow = glowAt(t);
  const sweep = ((t - E.search) * 110) % 170 - 40;

  return (
    <>
      <div
        style={{
          position: "absolute",
          left: CHAT.left,
          top: ANSWER.top,
          width: w,
          height: h,
          borderRadius: lerp(PILL.h / 2, 32, open),
          background: "white",
          boxShadow: SHADOW,
          outline: `1px solid ${C.line}`,
          overflow: "hidden",
          transformOrigin: "0% 0%",
          transform: `scale(${0.6 + 0.4 * appear}) translateY(${out * 20}px)`,
          opacity: Math.min(1, appear * 1.5) * (1 - out),
          fontFamily: ui,
        }}
      >
        {/* Searching: a shimmer running over the text. */}
        <div
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            height: PILL.h,
            display: "flex",
            alignItems: "center",
            gap: 14,
            padding: "0 28px",
            whiteSpace: "nowrap",
            opacity: 1 - prog(t, E.answer - 0.2, E.answer + 0.05, ease.linear),
          }}
        >
          <Sparkles size={28} color={C.orange} strokeWidth={2.2} />
          <span
            style={{
              fontSize: 26,
              fontWeight: 600,
              backgroundImage: `linear-gradient(90deg, ${C.faint} 0%, ${C.faint} ${sweep}%, ${C.orange} ${sweep + 20}%, ${C.faint} ${sweep + 40}%, ${C.faint} 100%)`,
              WebkitBackgroundClip: "text",
              backgroundClip: "text",
              color: "transparent",
            }}
          >
            Durchsucht alle Unterseiten …
          </span>
        </div>

        {/* The answer, streaming in word by word. */}
        <div style={{ position: "absolute", left: 36, top: 26, width: CARD.w - 72, fontSize: 29, lineHeight: 1.6, color: C.text }}>
          {TOKENS.map((tok, i) => {
            const p = prog(t, E.answer + 0.3 + i * perWord, E.answer + 0.3 + i * perWord + 0.35, ease.out);
            return (
              <span
                key={i}
                style={{
                  opacity: p,
                  filter: `blur(${(1 - p) * 6}px)`,
                  fontWeight: tok.bold ? 700 : 400,
                  color: tok.bold ? C.ink : undefined,
                }}
              >
                {tok.cite ? <Cite n={tok.cite} glow={tok.cite === 1 ? glow : 0} /> : tok.w}{" "}
              </span>
            );
          })}
        </div>
      </div>

      {SOURCES.map((s, i) => {
        if (i === 0 && t >= E.focus + 0.35) return null;
        const p = prog(t, E.sources + i * 0.15, E.sources + 0.55 + i * 0.15, ease.back);
        const lit = i === 0 ? glow : 0;
        const fade = i === 0 ? 0 : out;
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
              opacity: Math.min(1, p * 1.5) * (1 - fade),
              transform: `translateY(${(1 - p) * 24 + fade * 20}px) scale(${0.85 + 0.15 * p})`,
            }}
          >
            <ChipContent n={s.n} url={s.url} />
          </div>
        );
      })}
    </>
  );
};

/** The page the answer came from, with the quoted sentence marked. */
export const SourcePage: React.FC<{ t: number }> = ({ t }) => {
  const mark = prog(t, E.marker, E.marker + 0.7, ease.inOut);
  return (
    <div
      style={{
        position: "absolute",
        left: "50%",
        top: "50%",
        width: SOURCE.w,
        height: SOURCE.h,
        marginLeft: -SOURCE.w / 2,
        marginTop: -SOURCE.h / 2,
        fontFamily: ui,
      }}
    >
      <div style={{ position: "absolute", left: 0, right: 0, height: 58, borderBottom: `1px solid ${C.line}`, display: "flex", alignItems: "center", gap: 8, padding: "0 20px" }}>
        {["#ff8a80", "#ffd166", "#7bdcb5"].map((c) => (
          <div key={c} style={{ width: 12, height: 12, borderRadius: 6, background: c }} />
        ))}
        <div style={{ marginLeft: 14, padding: "6px 16px", borderRadius: 20, background: "#f8f3ed", fontSize: 19, fontWeight: 500, color: C.muted }}>
          {SITE}
          <span style={{ color: C.ink }}>/service/hilfe/zahlung</span>
        </div>
        <div
          style={{
            marginLeft: "auto",
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "6px 16px 6px 8px",
            borderRadius: 20,
            background: `${C.orange}14`,
            fontSize: 18,
            fontWeight: 600,
            color: C.accent,
          }}
        >
          <div style={{ width: 28, height: 28, borderRadius: 14, background: C.accent, color: "white", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, fontWeight: 700 }}>
            1
          </div>
          Quelle
        </div>
      </div>

      <div style={{ position: "absolute", left: 56, right: 56, top: 96 }}>
        <div style={{ fontSize: 20, fontWeight: 500, color: C.muted }}>Service › Hilfe › Zahlung</div>
        <div style={{ marginTop: 10, fontFamily: heading, fontWeight: 800, fontSize: 46, letterSpacing: "-0.02em", color: C.ink }}>Zahlungsarten</div>
        <div style={{ marginTop: 16, fontSize: 28, lineHeight: 1.6, color: C.text }}>
          Bei uns bezahlst du ganz bequem per{" "}
          <span
            style={{
              padding: "2px 6px",
              margin: "0 -2px",
              borderRadius: 8,
              fontWeight: 600,
              color: C.ink,
              backgroundImage: `linear-gradient(90deg, ${C.orange}45, ${C.amber}45)`,
              backgroundRepeat: "no-repeat",
              backgroundSize: `${mark * 100}% 100%`,
            }}
          >
            PayPal, Kreditkarte oder Rechnung
          </span>
          . Alle Zahlungen sind verschlüsselt.
        </div>
        <div style={{ marginTop: 26, width: 620, height: 12, borderRadius: 12, background: "#f0e9e1" }} />
        <div style={{ marginTop: 14, width: 520, height: 12, borderRadius: 12, background: "#f0e9e1" }} />
      </div>
    </div>
  );
};
