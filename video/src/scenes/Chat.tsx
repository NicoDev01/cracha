import { Globe, Sparkles } from "lucide-react";
import { useCurrentFrame } from "remotion";
import { CHAT, QUESTION } from "../layout";
import { C, FPS, SHADOW, SHADOW_SM, ease, lerp, prog, ui } from "../theme";
import { PAGES, SITE, T } from "../timeline";

// The question itself is the morphing box; this scene draws what answers it:
// a search pill that opens into the answer, and the sources under it.

type Token = { w: string; bold?: boolean; cite?: number };
const ANSWER: Token[] = [
  ..."Du kannst per".split(" ").map((w) => ({ w })),
  ..."PayPal, Kreditkarte oder Rechnung".split(" ").map((w) => ({ w, bold: true })),
  { w: "bezahlen." },
  { w: "", cite: 1 },
  ..."Ab 50 € Bestellwert ist der Versand kostenlos.".split(" ").map((w) => ({ w })),
  { w: "", cite: 2 },
];

const SOURCES = [
  { n: 1, url: `${SITE}/hilfe/zahlung` },
  { n: 2, url: `${SITE}/hilfe/versand` },
];

const TOP = QUESTION.cy + QUESTION.h / 2 + 34;
const PILL = { w: 470, h: 72 };
const CARD = { w: CHAT.right - CHAT.left, h: 158 };

const hex = (x: number) => Math.round(x).toString(16).padStart(2, "0");

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
      color: glow > 0.05 ? "white" : C.indigo,
      background: glow > 0.05 ? C.indigo : `${C.indigo}18`,
      boxShadow: `0 0 0 ${glow * 8}px ${C.indigo}${hex(glow * 60)}`,
      verticalAlign: "middle",
    }}
  >
    {n}
  </span>
);

export const Chat: React.FC = () => {
  const t = useCurrentFrame() / FPS;
  if (t < T.search - 0.1 || t > T.cta + 0.6) return null;

  const out = prog(t, T.cta - 0.05, T.cta + 0.35, ease.in);
  const appear = prog(t, T.search, T.search + 0.5, ease.back);
  const open = prog(t, T.answer - 0.15, T.answer + 0.5, ease.inOut);
  const w = lerp(PILL.w, CARD.w, open);
  const h = lerp(PILL.h, CARD.h, open);
  const perWord = (T.answerEnd - T.answer - 0.3) / ANSWER.length;
  const glow = prog(t, T.highlight, T.highlight + 0.3, ease.out) * (1 - prog(t, T.highlight + 1.1, T.highlight + 1.4, ease.in));
  const sweep = ((t - T.search) * 110) % 170 - 40;

  return (
    <div style={{ position: "absolute", left: CHAT.left, top: TOP, width: CARD.w, opacity: 1 - out, transform: `translateY(${out * 20}px)`, fontFamily: ui }}>
      <div
        style={{
          position: "relative",
          width: w,
          height: h,
          borderRadius: lerp(PILL.h / 2, 32, open),
          background: "white",
          boxShadow: SHADOW,
          outline: `1px solid ${C.line}`,
          overflow: "hidden",
          transformOrigin: "0% 0%",
          transform: `scale(${0.6 + 0.4 * appear})`,
          opacity: Math.min(1, appear * 1.5),
        }}
      >
        {/* Searching: the pages being read, as a shimmer running over the text. */}
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
            opacity: 1 - prog(t, T.answer - 0.2, T.answer + 0.05, ease.linear),
          }}
        >
          <Sparkles size={28} color={C.indigo} strokeWidth={2.2} />
          <span
            style={{
              fontSize: 26,
              fontWeight: 600,
              backgroundImage: `linear-gradient(90deg, ${C.faint} 0%, ${C.faint} ${sweep}%, ${C.indigo} ${sweep + 20}%, ${C.faint} ${sweep + 40}%, ${C.faint} 100%)`,
              WebkitBackgroundClip: "text",
              backgroundClip: "text",
              color: "transparent",
            }}
          >
            Durchsucht {PAGES.toLocaleString("de-DE")} Seiten …
          </span>
        </div>

        {/* The answer, streaming in word by word. */}
        <div style={{ position: "absolute", left: 36, top: 26, width: CARD.w - 72, fontSize: 29, lineHeight: 1.6, color: C.text }}>
          {ANSWER.map((tok, i) => {
            const p = prog(t, T.answer + 0.3 + i * perWord, T.answer + 0.3 + i * perWord + 0.35, ease.out);
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

      <div style={{ display: "flex", gap: 16, marginTop: 22 }}>
        {SOURCES.map((s, i) => {
          const p = prog(t, T.sources + i * 0.15, T.sources + 0.55 + i * 0.15, ease.back);
          const lit = i === 0 ? glow : 0;
          return (
            <div
              key={s.url}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                height: 60,
                padding: "0 24px 0 12px",
                borderRadius: 30,
                background: "white",
                boxShadow: SHADOW_SM,
                outline: `${1 + lit * 1.5}px solid ${lit > 0.05 ? C.indigo : C.line}`,
                opacity: Math.min(1, p * 1.5),
                transform: `translateY(${(1 - p) * 24 - lit * 4}px) scale(${0.85 + 0.15 * p})`,
                fontSize: 21,
                fontWeight: 500,
                color: C.text,
              }}
            >
              <div
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 19,
                  background: `${C.indigo}14`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 18,
                  fontWeight: 700,
                  color: C.indigo,
                }}
              >
                {s.n}
              </div>
              <Globe size={20} color={C.muted} strokeWidth={2} />
              {s.url}
            </div>
          );
        })}
      </div>
    </div>
  );
};
