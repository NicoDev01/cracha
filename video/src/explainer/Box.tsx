import { ArrowUp, CornerDownLeft } from "lucide-react";
import { Logo } from "../Logo";
import { PageContent } from "../PageCard";
import { C, CX, CY, GRADIENT, SHADOW, prog, track, ui, windowIn, type Keyframe } from "../theme";
import { QUESTION } from "./Chat";
import { K, SITE, clamp01, ez, pressAt, useT } from "./kit";
import { SIZES } from "./Map";
import { DOT } from "./Problem";

// The one shape the light world follows: the full stop of "nichts." becomes
// the logo, the URL field and the start page; later the chat input, the
// question, and at the end the logo again.

type B = { cx: number; cy: number; w: number; h: number; r: number; op: number; o: number };

const W = "#ffffff";
const PILL = { w: 640, h: 176, r: 88 };
const URL = { cx: CX, cy: CY, w: 980, h: 112, r: 56 };
const ROOT = { cx: CX, cy: CY + 10, ...SIZES[0], r: 20 };
const INPUT = { cx: CX, cy: CY, w: 940, h: 104, r: 52 };
const Q = { cx: QUESTION.cx, cy: QUESTION.cy, w: QUESTION.w, h: QUESTION.h, r: QUESTION.h / 2 };
const END_PILL = { cx: CX, cy: 420, ...PILL };

/** `o` is how orange the box is (0 white, 1 brand gradient). */
const KEYS: Keyframe<B>[] = [
  { t: 0, cx: CX, cy: CY, w: DOT, h: DOT, r: DOT / 2, op: 0, o: 1 },
  { t: K.drop - 0.001, cx: CX, cy: CY, w: DOT, h: DOT, r: DOT / 2, op: 0, o: 1 },
  { t: K.drop, cx: CX, cy: CY, w: DOT, h: DOT, r: DOT / 2, op: 1, o: 1, e: ez.soft },
  { t: K.drop + 0.6, cx: CX, cy: CY - 40, ...PILL, op: 1, o: 0, e: ez.land },
  { t: K.intro.out, cx: CX, cy: CY - 40, ...PILL, op: 1, o: 0 },
  { t: K.url.morph + 0.45, ...URL, op: 1, o: 0, e: ez.land },
  { t: K.crawl.root, ...URL, op: 1, o: 0 },
  { t: K.crawl.root + 0.42, ...ROOT, op: 1, o: 0, e: ez.soft },
  { t: K.crawl.root + 0.43, ...ROOT, op: 0, o: 0, e: (x) => x },
  { t: K.base.toInput + 0.1, cx: CX, cy: CY, w: 40, h: 40, r: 20, op: 0, o: 0 },
  { t: K.base.toInput + 0.15, cx: CX, cy: CY, w: 40, h: 40, r: 20, op: 1, o: 0, e: (x) => x },
  { t: K.base.toInput + 0.7, ...INPUT, op: 1, o: 0, e: ez.land },
  { t: K.ask.send, ...INPUT, op: 1, o: 0 },
  { t: K.ask.send + 0.45, ...Q, op: 1, o: 1, e: ez.land },
  { t: K.answer.dive, ...Q, op: 1, o: 1 },
  { t: K.answer.dive + 0.01, ...Q, op: 0, o: 1, e: (x) => x },
  { t: K.cta.logo - 0.05, cx: CX, cy: END_PILL.cy, w: 40, h: 40, r: 20, op: 0, o: 1 },
  { t: K.cta.logo, cx: CX, cy: END_PILL.cy, w: 40, h: 40, r: 20, op: 1, o: 1, e: (x) => x },
  { t: K.cta.logo + 0.55, ...END_PILL, op: 1, o: 0, e: ez.land },
];

const Layer: React.FC<{ o: number; children: React.ReactNode }> = ({ o, children }) =>
  o <= 0.001 ? null : <div style={{ position: "absolute", inset: 0, opacity: Math.min(1, o) }}>{children}</div>;

const Center: React.FC<{ w: number; h: number; children: React.ReactNode; style?: React.CSSProperties }> = ({ w, h, children, style }) => (
  <div style={{ position: "absolute", left: "50%", top: "50%", width: w, height: h, marginLeft: -w / 2, marginTop: -h / 2, display: "flex", alignItems: "center", fontFamily: ui, ...style }}>
    {children}
  </div>
);

const Caret: React.FC<{ t: number; h: number }> = ({ t, h }) => (
  <span style={{ width: 3, height: h, marginLeft: 3, background: C.orange, opacity: Math.floor(t * 2.4) % 2 ? 0 : 1 }} />
);

const UrlContent: React.FC<{ t: number }> = ({ t }) => {
  const pasted = t >= K.url.paste;
  const flash = pasted ? clamp01(1 - (t - K.url.paste) / 0.45) : 0;
  const pop = prog(t, K.url.paste, K.url.paste + 0.25, ez.land);
  const press = pressAt(t, K.url.enter);
  return (
    <Center w={URL.w} h={URL.h} style={{ padding: "0 20px 0 44px", gap: 18 }}>
      <div style={{ flex: 1, fontSize: 38, fontWeight: 500, display: "flex", alignItems: "center" }}>
        {pasted ? (
          <span
            style={{
              color: C.ink,
              padding: "2px 6px",
              margin: "0 -6px",
              borderRadius: 8,
              background: `rgba(249,115,22,${flash * 0.25})`,
              transform: `scale(${0.9 + 0.1 * pop})`,
              display: "inline-block",
            }}
          >
            https://{SITE}
          </span>
        ) : (
          <span style={{ color: C.faint }}>Website-Link einfügen …</span>
        )}
        <Caret t={t} h={42} />
      </div>
      <div
        style={{
          height: 76,
          padding: "0 30px",
          borderRadius: 38,
          background: GRADIENT,
          color: C.ink,
          display: "flex",
          alignItems: "center",
          gap: 12,
          fontSize: 28,
          fontWeight: 700,
          transform: `scale(${1 - press * 0.1})`,
          boxShadow: `0 ${10 + press * 10}px 28px -8px rgba(249,115,22,0.6)`,
        }}
      >
        Einlesen <CornerDownLeft size={26} strokeWidth={2.6} />
      </div>
    </Center>
  );
};

const InputContent: React.FC<{ t: number }> = ({ t }) => {
  const n = Math.round(prog(t, K.ask.typeStart, K.ask.typeEnd, (x) => x) * QUESTION.text.length);
  const typed = QUESTION.text.slice(0, n);
  return (
    <Center w={INPUT.w} h={INPUT.h} style={{ padding: "0 16px 0 42px" }}>
      <div style={{ flex: 1, fontSize: 32, fontWeight: 500, color: typed ? C.ink : C.faint, display: "flex", alignItems: "center" }}>
        {typed || "Frag die ganze Website …"}
        <Caret t={t} h={36} />
      </div>
      <div
        style={{
          width: 72,
          height: 72,
          borderRadius: 36,
          background: typed ? GRADIENT : "#e8e0d6",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          transform: `scale(${1 - pressAt(t, K.ask.send) * 0.14})`,
        }}
      >
        <ArrowUp size={36} color={typed ? C.ink : "white"} strokeWidth={2.6} />
      </div>
    </Center>
  );
};

export const Box: React.FC = () => {
  const t = useT();
  const b = track(t, KEYS);
  if (b.op <= 0.001) return null;
  const pulse = pressAt(t, K.cta.pulse) * 0.6;
  // A glint sweeps over the closing logo when the name is spoken.
  const shine = prog(t, K.cta.pulse - 0.1, K.cta.pulse + 0.5, ez.soft);
  return (
    <div
      style={{
        position: "absolute",
        left: b.cx - b.w / 2,
        top: b.cy - b.h / 2,
        width: b.w,
        height: b.h,
        borderRadius: b.r,
        background: W,
        opacity: b.op,
        overflow: "hidden",
        boxShadow: `${SHADOW}${b.o > 0.5 && b.w < 100 ? ", 0 0 60px 16px rgba(249,115,22,0.45)" : ""}`,
        outline: `1px solid ${C.line}`,
        transform: `scale(${1 + pulse * 0.1})`,
      }}
    >
      <Layer o={b.o}>
        <div style={{ position: "absolute", inset: 0, background: GRADIENT }} />
      </Layer>
      <Layer o={t > K.drop + 0.1 && t < K.url.morph + 0.3 ? 1 : 0}>
        <Center w={b.w} h={b.h} style={{ justifyContent: "center" }}>
          <Logo width={440} start={K.drop + 0.3} end={K.intro.out} />
        </Center>
      </Layer>
      <Layer o={windowIn(t, K.url.morph + 0.3, K.crawl.root + 0.15, 0.25)}>
        <UrlContent t={t} />
      </Layer>
      <Layer o={t < K.crawl.root + 0.45 ? prog(t, K.crawl.root + 0.2, K.crawl.root + 0.4, ez.out) : 0}>
        <PageContent w={b.w} h={b.h} s={b.w / 360} tint={C.orange} url="kundenwebsite.de" />
      </Layer>
      <Layer o={windowIn(t, K.base.toInput + 0.45, K.ask.send + 0.15, 0.25)}>
        <InputContent t={t} />
      </Layer>
      <Layer o={windowIn(t, K.ask.send + 0.3, K.answer.dive + 0.1, 0.25)}>
        <Center w={Q.w} h={Q.h} style={{ justifyContent: "center", color: C.ink, fontSize: 29, fontWeight: 600, whiteSpace: "nowrap" }}>
          {QUESTION.text}
        </Center>
      </Layer>
      <Layer o={t >= K.cta.logo + 0.2 ? 1 : 0}>
        <Center w={b.w} h={b.h} style={{ justifyContent: "center" }}>
          <Logo width={440} start={K.cta.logo + 0.3} end={99} />
        </Center>
      </Layer>
      {shine > 0 && shine < 1 ? (
        <div
          style={{
            position: "absolute",
            top: 0,
            bottom: 0,
            left: `${-40 + shine * 160}%`,
            width: "30%",
            background: "linear-gradient(100deg, rgba(255,255,255,0) 0%, rgba(255,200,150,0.55) 50%, rgba(255,255,255,0) 100%)",
          }}
        />
      ) : null}
    </div>
  );
};
