import { ArrowRight, ArrowUp } from "lucide-react";
import { useCurrentFrame } from "remotion";
import { CHAT, CTA, DB_POS, INPUT, QUESTION, ROOT_BIG, ROOT_SMALL } from "./layout";
import { Logo } from "./Logo";
import { PageContent, ScanBand } from "./PageCard";
import { C, CX, CY, FPS, GRADIENT, SHADOW, ease, heading, prog, track, ui, windowIn, type Keyframe } from "./theme";
import { SITE, T } from "./timeline";

type Box = { cx: number; cy: number; w: number; h: number; r: number; bg: string; op: number };

const W = "#ffffff";
const Q_CX = CHAT.right - QUESTION.w / 2;

// The one shape the film follows: a dot that becomes the logo, the URL field,
// the crawled start page, later the chat input, the question, the button and
// the logo again.
const KEYS: Keyframe<Box>[] = [
  { t: 0, cx: CX, cy: CY, w: 0, h: 0, r: 0, bg: W, op: 1 },
  { t: T.dot, cx: CX, cy: CY, w: 0, h: 0, r: 0, bg: W, op: 1 },
  { t: T.dot + 0.45, cx: CX, cy: CY, w: 44, h: 44, r: 22, bg: W, op: 1, e: ease.back },
  { t: T.pill, cx: CX, cy: CY, w: 44, h: 44, r: 22, bg: W, op: 1 },
  { t: T.pill + 0.6, cx: CX, cy: CY, w: 640, h: 176, r: 88, bg: W, op: 1 },
  { t: T.tagline, cx: CX, cy: CY, w: 640, h: 176, r: 88, bg: W, op: 1 },
  { t: T.tagline + 0.6, cx: CX, cy: 470, w: 640, h: 176, r: 88, bg: W, op: 1 },
  { t: T.input, cx: CX, cy: 470, w: 640, h: 176, r: 88, bg: W, op: 1 },
  { t: T.input + 0.65, cx: CX, cy: 560, w: 920, h: 108, r: 54, bg: W, op: 1 },
  { t: T.root, cx: CX, cy: 560, w: 920, h: 108, r: 54, bg: W, op: 1 },
  { t: T.root + 0.65, ...ROOT_BIG, bg: W, op: 1 },
  { t: T.shrink, ...ROOT_BIG, bg: W, op: 1 },
  { t: T.shrink + 0.65, ...ROOT_SMALL, bg: W, op: 1 },
  { t: T.converge + 0.1, ...ROOT_SMALL, bg: W, op: 1 },
  { t: T.converge + 0.8, cx: DB_POS.x, cy: DB_POS.y - 60, w: 64, h: 12, r: 6, bg: C.indigo, op: 0, e: ease.in },
  { t: T.chat, cx: DB_POS.x, cy: DB_POS.y, w: 250, h: 250, r: 56, bg: W, op: 0 },
  { t: T.chat + 0.15, cx: DB_POS.x, cy: DB_POS.y, w: 250, h: 250, r: 56, bg: W, op: 1, e: ease.linear },
  { t: T.chat + 0.8, ...INPUT, r: INPUT.h / 2, bg: W, op: 1 },
  { t: T.send, ...INPUT, r: INPUT.h / 2, bg: W, op: 1 },
  { t: T.send + 0.65, cx: Q_CX, cy: QUESTION.cy, w: QUESTION.w, h: QUESTION.h, r: QUESTION.h / 2, bg: C.indigo, op: 1 },
  { t: T.cta, cx: Q_CX, cy: QUESTION.cy, w: QUESTION.w, h: QUESTION.h, r: QUESTION.h / 2, bg: C.indigo, op: 1 },
  { t: T.cta + 0.75, ...CTA, r: CTA.h / 2, bg: C.indigo, op: 1 },
  { t: T.outro, ...CTA, r: CTA.h / 2, bg: C.indigo, op: 1 },
  { t: T.outro + 0.7, cx: CX, cy: 470, w: 640, h: 176, r: 88, bg: W, op: 1 },
];

const Layer: React.FC<{ opacity: number; children: React.ReactNode }> = ({ opacity, children }) =>
  opacity <= 0 ? null : <div style={{ position: "absolute", inset: 0, opacity }}>{children}</div>;

const Centered: React.FC<{ w: number; h: number; children: React.ReactNode; style?: React.CSSProperties }> = ({
  w,
  h,
  children,
  style,
}) => (
  <div
    style={{
      position: "absolute",
      left: "50%",
      top: "50%",
      width: w,
      height: h,
      marginLeft: -w / 2,
      marginTop: -h / 2,
      display: "flex",
      alignItems: "center",
      fontFamily: ui,
      ...style,
    }}
  >
    {children}
  </div>
);

const Caret: React.FC<{ t: number; h: number }> = ({ t, h }) => (
  <span style={{ width: 3, height: h, marginLeft: 3, background: C.indigo, opacity: Math.floor(t * 2.2) % 2 ? 0 : 1 }} />
);

const pressOf = (t: number, at: number) => prog(t, at - 0.12, at, ease.out) - prog(t, at, at + 0.25, ease.out);

const UrlContent: React.FC<{ t: number }> = ({ t }) => {
  const url = `www.${SITE}`;
  const typed = url.slice(0, Math.round(prog(t, T.typeStart, T.typeEnd, ease.linear) * url.length));
  const btnIn = prog(t, T.input + 0.4, T.input + 0.9, ease.back);
  return (
    <Centered w={920} h={108} style={{ padding: "0 20px 0 44px", gap: 18 }}>
      <div style={{ flex: 1, fontSize: 36, fontWeight: 500, color: C.ink, display: "flex", alignItems: "center" }}>
        {typed ? typed : <span style={{ color: C.faint }}>Website eingeben …</span>}
        {t < T.press ? <Caret t={t} h={40} /> : null}
      </div>
      <div
        style={{
          height: 72,
          padding: "0 32px",
          borderRadius: 36,
          background: GRADIENT,
          color: "white",
          display: "flex",
          alignItems: "center",
          gap: 10,
          fontSize: 28,
          fontWeight: 600,
          transform: `scale(${(0.6 + 0.4 * btnIn) * (1 - pressOf(t, T.press) * 0.07)})`,
          opacity: Math.min(1, btnIn * 1.5),
          boxShadow: `0 10px 24px -8px ${C.indigo}99`,
        }}
      >
        Crawlen <ArrowRight size={26} strokeWidth={2.5} />
      </div>
    </Centered>
  );
};

// Down, up, down: the scan reads like a scanner going over the whole page.
const PASSES = 3;
const RootContent: React.FC<{ t: number; w: number; h: number }> = ({ t, w, h }) => {
  const s = w / ROOT_BIG.w;
  const p = (t - T.scan) / (T.shrink - 0.1 - T.scan);
  const scanning = p > 0 && p < 1;
  const k = Math.min(PASSES - 1, Math.floor(p * PASSES));
  const local = ease.inOut(p * PASSES - k);
  const dir: 1 | -1 = k % 2 === 0 ? 1 : -1;
  const pos = dir === 1 ? local : 1 - local;
  const strength = Math.min(1, p * 8, (1 - p) * 8);
  return (
    <>
      <PageContent w={w} h={h} url={SITE} s={s} />
      {scanning ? <ScanBand pos={pos} dir={dir} top={34 * s} height={h - 34 * s} strength={strength} /> : null}
    </>
  );
};

const InputContent: React.FC<{ t: number }> = ({ t }) => {
  const typed = QUESTION.text.slice(0, Math.round(prog(t, T.askStart, T.askEnd, ease.linear) * QUESTION.text.length));
  return (
    <Centered w={INPUT.w} h={INPUT.h} style={{ padding: "0 14px 0 40px" }}>
      <div style={{ flex: 1, fontSize: 30, fontWeight: 500, color: typed ? C.ink : C.faint, display: "flex", alignItems: "center" }}>
        {typed || "Frag deine Wissensbasis …"}
        {typed ? <Caret t={t} h={34} /> : null}
      </div>
      <div
        style={{
          width: 68,
          height: 68,
          borderRadius: 34,
          background: typed ? GRADIENT : "#dfe1ee",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          transform: `scale(${1 - pressOf(t, T.send) * 0.12})`,
        }}
      >
        <ArrowUp size={34} color="white" strokeWidth={2.6} />
      </div>
    </Centered>
  );
};

const QuestionContent: React.FC = () => (
  <Centered w={QUESTION.w} h={QUESTION.h} style={{ justifyContent: "center", color: "white", fontSize: 28, fontWeight: 500, whiteSpace: "nowrap" }}>
    {QUESTION.text}
  </Centered>
);

const CtaContent: React.FC = () => (
  <Centered
    w={CTA.w}
    h={CTA.h}
    style={{ justifyContent: "center", gap: 14, color: "white", fontFamily: heading, fontWeight: 700, fontSize: 40, whiteSpace: "nowrap" }}
  >
    Jetzt kostenlos starten <ArrowRight size={38} strokeWidth={2.6} />
  </Centered>
);

export const MorphBox: React.FC = () => {
  const t = useCurrentFrame() / FPS;
  const b = track(t, KEYS);
  if (b.op <= 0.001 || b.w < 0.5) return null;

  const gradient = windowIn(t, T.send + 0.1, T.outro + 0.45, 0.45);

  return (
    <div
      style={{
        position: "absolute",
        left: b.cx - b.w / 2,
        top: b.cy - b.h / 2,
        width: b.w,
        height: b.h,
        borderRadius: b.r,
        background: b.bg,
        opacity: b.op,
        overflow: "hidden",
        boxShadow: SHADOW,
        outline: `1px solid ${C.line}`,
        transform: `scale(${1 - pressOf(t, T.click) * 0.05})`,
      }}
    >
      <Layer opacity={gradient}>
        <div style={{ position: "absolute", inset: 0, background: GRADIENT }} />
      </Layer>
      <Layer opacity={t < T.input + 0.3 ? 1 : 0}>
        <Centered w={b.w} h={b.h} style={{ justifyContent: "center" }}>
          <Logo width={440} start={T.logoIn} end={T.logoOut} />
        </Centered>
      </Layer>
      <Layer opacity={windowIn(t, T.input + 0.3, T.root + 0.15, 0.3)}>
        <UrlContent t={t} />
      </Layer>
      <Layer opacity={windowIn(t, T.root + 0.35, T.converge + 0.45, 0.3)}>
        <RootContent t={t} w={b.w} h={b.h} />
      </Layer>
      <Layer opacity={windowIn(t, T.chat + 0.45, T.send + 0.15, 0.3)}>
        <InputContent t={t} />
      </Layer>
      <Layer opacity={windowIn(t, T.send + 0.35, T.cta + 0.25, 0.3)}>
        <QuestionContent />
      </Layer>
      <Layer opacity={windowIn(t, T.cta + 0.45, T.outro + 0.2, 0.3)}>
        <CtaContent />
      </Layer>
      <Layer opacity={t >= T.outro ? 1 : 0}>
        <Centered w={b.w} h={b.h} style={{ justifyContent: "center" }}>
          <Logo width={440} start={T.outro + 0.45} end={99} />
        </Centered>
      </Layer>
    </div>
  );
};
