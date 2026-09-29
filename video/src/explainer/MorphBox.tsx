import { ArrowRight, ArrowUp } from "lucide-react";
import { useCurrentFrame } from "remotion";
import { Logo } from "../Logo";
import { PageContent, ScanBand } from "../PageCard";
import { C, FPS, GRADIENT, SHADOW, ease, heading, prog, track, ui, windowIn, type Keyframe } from "../theme";
import { ChipContent, SourcePage } from "./Chat";
import { ROOT_FLY } from "./Crawl";
import { CHAT, CHIP1, CTA, DB_POS, INPUT, PAGE, PILL, QUESTION, ROOT_BIG, ROOT_SMALL, SOURCE, SOURCES, URL_FIELD } from "./layout";
import { PainContent } from "./Pain";
import { E, SITE } from "./timeline";

type Box = { cx: number; cy: number; w: number; h: number; r: number; bg: string; op: number };

const W = "#ffffff";
const Q = { cx: CHAT.right - QUESTION.w / 2, cy: QUESTION.cy, w: QUESTION.w, h: QUESTION.h, r: QUESTION.h / 2 };
const PAGE_IN = { ...PAGE, w: PAGE.w * 0.92, h: PAGE.h * 0.92 };

// The one shape the film follows: the website the viewer gets lost in becomes
// the logo, the URL field, the start page, the chat input, the question, the
// source, the button and the logo again.
const KEYS: Keyframe<Box>[] = [
  { t: 0, ...PAGE_IN, bg: W, op: 0 },
  { t: E.pageIn, ...PAGE_IN, bg: W, op: 0 },
  { t: E.pageIn + 0.6, ...PAGE, bg: W, op: 1, e: ease.out },
  { t: E.pageOut, ...PAGE, bg: W, op: 1 },
  { t: E.pageOut + 0.7, ...PILL, bg: W, op: 1 },
  { t: E.input, ...PILL, bg: W, op: 1 },
  { t: E.input + 0.65, ...URL_FIELD, bg: W, op: 1 },
  { t: E.root, ...URL_FIELD, bg: W, op: 1 },
  { t: E.root + 0.65, ...ROOT_BIG, bg: W, op: 1 },
  { t: E.shrink, ...ROOT_BIG, bg: W, op: 1 },
  { t: E.shrink + 0.65, ...ROOT_SMALL, bg: W, op: 1 },
  { t: ROOT_FLY, ...ROOT_SMALL, bg: W, op: 1 },
  { t: ROOT_FLY + 0.75, cx: DB_POS.x, cy: DB_POS.y - 60, w: 64, h: 12, r: 6, bg: C.orange, op: 0, e: ease.in },
  { t: E.chat, cx: DB_POS.x, cy: DB_POS.y, w: 250, h: 250, r: 56, bg: W, op: 0 },
  { t: E.chat + 0.15, cx: DB_POS.x, cy: DB_POS.y, w: 250, h: 250, r: 56, bg: W, op: 1, e: ease.linear },
  { t: E.chat + 0.8, ...INPUT, r: INPUT.h / 2, bg: W, op: 1 },
  { t: E.send, ...INPUT, r: INPUT.h / 2, bg: W, op: 1 },
  { t: E.send + 0.65, ...Q, bg: C.orange, op: 1 },
  { t: E.focus, ...Q, bg: C.orange, op: 1 },
  { t: E.focus + 0.3, ...Q, bg: C.orange, op: 0, e: ease.linear },
  // Unseen, the box jumps onto source 1 and takes its place.
  { t: E.focus + 0.33, ...CHIP1, bg: W, op: 0, e: ease.linear },
  { t: E.focus + 0.35, ...CHIP1, bg: W, op: 1, e: ease.linear },
  { t: E.source, ...CHIP1, bg: W, op: 1 },
  { t: E.source + 0.75, ...SOURCE, bg: W, op: 1 },
  { t: E.cta, ...SOURCE, bg: W, op: 1 },
  { t: E.cta + 0.75, ...CTA, r: CTA.h / 2, bg: C.orange, op: 1 },
  { t: E.outro, ...CTA, r: CTA.h / 2, bg: C.orange, op: 1 },
  { t: E.outro + 0.7, ...PILL, bg: W, op: 1 },
];

const Layer: React.FC<{ opacity: number; children: React.ReactNode }> = ({ opacity, children }) =>
  opacity <= 0 ? null : <div style={{ position: "absolute", inset: 0, opacity }}>{children}</div>;

const Centered: React.FC<{ w: number; h: number; children: React.ReactNode; style?: React.CSSProperties }> = ({ w, h, children, style }) => (
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
  <span style={{ width: 3, height: h, marginLeft: 3, background: C.orange, opacity: Math.floor(t * 2.2) % 2 ? 0 : 1 }} />
);

const pressOf = (t: number, at: number) => prog(t, at - 0.12, at, ease.out) - prog(t, at, at + 0.25, ease.out);

const UrlContent: React.FC<{ t: number }> = ({ t }) => {
  const url = `www.${SITE}`;
  const typed = url.slice(0, Math.round(prog(t, E.typeStart, E.typeEnd, ease.linear) * url.length));
  const btnIn = prog(t, E.input + 0.4, E.input + 0.9, ease.back);
  return (
    <Centered w={URL_FIELD.w} h={URL_FIELD.h} style={{ padding: "0 20px 0 44px", gap: 18 }}>
      <div style={{ flex: 1, fontSize: 36, fontWeight: 500, color: C.ink, display: "flex", alignItems: "center" }}>
        {typed ? typed : <span style={{ color: C.faint }}>Website eingeben …</span>}
        {t < E.press ? <Caret t={t} h={40} /> : null}
      </div>
      <div
        style={{
          height: 72,
          padding: "0 32px",
          borderRadius: 36,
          background: GRADIENT,
          color: C.ink,
          display: "flex",
          alignItems: "center",
          gap: 10,
          fontSize: 28,
          fontWeight: 600,
          transform: `scale(${(0.6 + 0.4 * btnIn) * (1 - pressOf(t, E.press) * 0.07)})`,
          opacity: Math.min(1, btnIn * 1.5),
          boxShadow: `0 10px 24px -8px ${C.orange}99`,
        }}
      >
        Crawlen <ArrowRight size={26} strokeWidth={2.5} />
      </div>
    </Centered>
  );
};

// Down and up again: a scanner going over the whole start page.
const PASSES = 2;
const RootContent: React.FC<{ t: number; w: number; h: number }> = ({ t, w, h }) => {
  const s = w / ROOT_BIG.w;
  const p = (t - E.scan) / (E.shrink - 0.1 - E.scan);
  const k = Math.min(PASSES - 1, Math.floor(p * PASSES));
  const local = ease.inOut(p * PASSES - k);
  const dir: 1 | -1 = k % 2 === 0 ? 1 : -1;
  const strength = Math.min(1, p * 8, (1 - p) * 8);
  return (
    <>
      <PageContent w={w} h={h} url={SITE} s={s} />
      {p > 0 && p < 1 ? <ScanBand pos={dir === 1 ? local : 1 - local} dir={dir} top={34 * s} height={h - 34 * s} strength={strength} /> : null}
    </>
  );
};

const InputContent: React.FC<{ t: number }> = ({ t }) => {
  const typed = QUESTION.text.slice(0, Math.round(prog(t, E.askStart, E.askEnd, ease.linear) * QUESTION.text.length));
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
          background: typed ? GRADIENT : "#e8e0d6",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          transform: `scale(${1 - pressOf(t, E.send) * 0.12})`,
        }}
      >
        <ArrowUp size={34} color={typed ? C.ink : "white"} strokeWidth={2.6} />
      </div>
    </Centered>
  );
};

export const MorphBox: React.FC = () => {
  const t = useCurrentFrame() / FPS;
  const b = track(t, KEYS);
  if (b.op <= 0.001 || b.w < 0.5) return null;

  const gradient = Math.max(windowIn(t, E.send + 0.1, E.focus + 0.3, 0.45), windowIn(t, E.cta + 0.1, E.outro + 0.45, 0.45));
  const chipLit = Math.min(prog(t, E.focus + 0.32, E.focus + 0.34, ease.linear), 1 - prog(t, E.source, E.source + 0.4, ease.out));

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
        transform: `scale(${1 - pressOf(t, E.click) * 0.05})`,
      }}
    >
      <Layer opacity={gradient}>
        <div style={{ position: "absolute", inset: 0, background: GRADIENT }} />
      </Layer>
      <Layer opacity={1 - prog(t, E.pageOut, E.pageOut + 0.3, ease.out)}>
        <PainContent t={t} />
      </Layer>
      <Layer opacity={t > E.pageOut + 0.2 && t < E.input + 0.3 ? 1 : 0}>
        <Centered w={b.w} h={b.h} style={{ justifyContent: "center" }}>
          <Logo width={440} start={E.logoIn} end={E.logoOut} />
        </Centered>
      </Layer>
      <Layer opacity={windowIn(t, E.input + 0.3, E.root + 0.15, 0.3)}>
        <UrlContent t={t} />
      </Layer>
      <Layer opacity={windowIn(t, E.root + 0.35, ROOT_FLY + 0.35, 0.3)}>
        <RootContent t={t} w={b.w} h={b.h} />
      </Layer>
      <Layer opacity={windowIn(t, E.chat + 0.45, E.send + 0.15, 0.3)}>
        <InputContent t={t} />
      </Layer>
      <Layer opacity={windowIn(t, E.send + 0.35, E.focus + 0.3, 0.3)}>
        <Centered w={QUESTION.w} h={QUESTION.h} style={{ justifyContent: "center", color: C.ink, fontSize: 28, fontWeight: 500, whiteSpace: "nowrap" }}>
          {QUESTION.text}
        </Centered>
      </Layer>
      <Layer opacity={t >= E.focus + 0.32 ? 1 - prog(t, E.source, E.source + 0.25, ease.out) : 0}>
        <ChipContent n={SOURCES[0].n} url={SOURCES[0].url} />
      </Layer>
      <Layer opacity={windowIn(t, E.source + 0.6, E.cta + 0.25, 0.3)}>
        <SourcePage t={t} />
      </Layer>
      <Layer opacity={windowIn(t, E.cta + 0.45, E.outro + 0.2, 0.3)}>
        <Centered
          w={CTA.w}
          h={CTA.h}
          style={{ justifyContent: "center", gap: 14, color: C.ink, fontFamily: heading, fontWeight: 700, fontSize: 40, whiteSpace: "nowrap" }}
        >
          Jetzt kostenlos starten <ArrowRight size={38} strokeWidth={2.6} />
        </Centered>
      </Layer>
      <Layer opacity={t >= E.outro ? 1 : 0}>
        <Centered w={b.w} h={b.h} style={{ justifyContent: "center" }}>
          <Logo width={440} start={E.outro + 0.45} end={99} />
        </Centered>
      </Layer>
      {chipLit > 0 ? (
        <div style={{ position: "absolute", inset: 0, borderRadius: "inherit", border: `2.5px solid ${C.orange}`, opacity: chipLit }} />
      ) : null}
    </div>
  );
};
