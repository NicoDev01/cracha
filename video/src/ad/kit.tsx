import React from "react";
import { AbsoluteFill } from "remotion";
import { CX, CY, H, K, P, W, bgAt, clamp01, ez, isDark, mono, prog, sp, ui, useT, wide } from "./look";

/** One line of kinetic type: letters rise out of a mask one after another, the line settles from a stretch. */
export const SlamLine: React.FC<{
  text: string;
  at: number;
  size: number;
  color: string;
  dotColor?: string;
  wdth?: number;
  stagger?: number;
}> = ({ text, at, size, color, dotColor, wdth = 125, stagger = 0.018 }) => {
  const t = useT();
  if (t < at) return <div style={{ height: size * 0.86 }} />;
  const p = prog(t, at, at + 0.3, ez.expo);
  const chars = [...text];
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "center",
        height: size * 0.86,
        lineHeight: `${size * 0.86}px`,
        fontSize: size,
        letterSpacing: "-0.02em",
        color,
        transform: `scaleX(${1.18 - 0.18 * p}) scaleY(${0.82 + 0.18 * p})`,
        ...wide(wdth),
      }}
    >
      {chars.map((c, i) => {
        const q = prog(t, at + i * stagger, at + i * stagger + 0.28, ez.expo);
        const isDot = (c === "." || c === "?") && dotColor;
        return (
          <span key={i} style={{ display: "inline-block", overflow: "hidden", height: size * 0.86, paddingTop: size * 0.02 }}>
            <span
              style={{
                display: "inline-block",
                transform: `translateY(${(1 - q) * 105}%)`,
                color: isDot ? dotColor : undefined,
                whiteSpace: "pre",
              }}
            >
              {c}
            </span>
          </span>
        );
      })}
    </div>
  );
};

type Word = { text: string; accent?: boolean };
/** "Du klickst. *Jedes Mal wieder.*": starred words get the accent. */
const parse = (s: string): Word[] => {
  let on = false;
  return s.split(" ").map((raw) => {
    let text = raw;
    const opens = text.startsWith("*");
    if (opens) text = text.slice(1);
    const closes = text.endsWith("*");
    if (closes) text = text.slice(0, -1);
    const w = { text, accent: on || opens };
    if (opens) on = true;
    if (closes) on = false;
    return w;
  });
};

/** A caption: words sharpen out of a blur one by one and leave together. */
export const Caption: React.FC<{ text: string; from: number; to: number; y?: number; size?: number; dark?: boolean; stagger?: number }> = ({
  text,
  from,
  to,
  y = 96,
  size = 64,
  dark,
  stagger = 0.07,
}) => {
  const t = useT();
  if (t < from - 0.02 || t > to + 0.02) return null;
  const out = prog(t, to - 0.22, to, ez.in);
  return (
    <div
      style={{
        position: "absolute",
        top: y,
        left: 100,
        right: 100,
        display: "flex",
        justifyContent: "center",
        flexWrap: "wrap",
        columnGap: size * 0.26,
        fontSize: size,
        lineHeight: 1.1,
        letterSpacing: "-0.025em",
        color: dark ? P.paper : P.ink,
        ...wide(100, 800),
      }}
    >
      {parse(text).map((w, i) => {
        const at = from + i * stagger;
        const q = clamp01((t - at) / 0.32);
        const s = sp(t, at, 15, 200, 0.7);
        return (
          <span
            key={i}
            style={{
              display: "inline-block",
              opacity: q * (1 - out),
              transform: `translateY(${(1 - s) * size * 0.45 - out * size * 0.3}px)`,
              filter: `blur(${(1 - q) * 12 + out * 10}px)`,
              color: w.accent ? P.accent : undefined,
            }}
          >
            {w.text}
          </span>
        );
      })}
    </div>
  );
};

const CHAPTERS: [number, string][] = [
  [0, "01 · PROBLEM"],
  [8, "02 · CRACHA"],
  [11, "03 · CRAWL"],
  [16, "04 · CHAT"],
  [21, "05 · QUELLE"],
  [24, "06 · KURZ"],
  [32, "07 · START"],
];

/** Corner marks, chapter, timecode and bar counter: the frame that binds every scene. */
export const Hud: React.FC = () => {
  const t = useT();
  const dark = isDark(bgAt(t));
  const color = dark ? P.paper : P.ink;
  const chapter = CHAPTERS.reduce((c, [at, l]) => (t >= at ? l : c), CHAPTERS[0][1]);
  const beat = Math.floor(t * 2);
  const bar = Math.floor(beat / 4) + 1;
  const frames = Math.floor((t % 1) * 60);
  const tc = `00:00:${String(Math.floor(t)).padStart(2, "0")}:${String(frames).padStart(2, "0")}`;
  const intro = prog(t, 0, 0.4, ez.out);
  const m = 44;
  const corner = (x: number, y: number, rx: number, ry: number) => (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        width: 22,
        height: 22,
        borderLeft: rx < 0 ? `2px solid ${color}` : undefined,
        borderRight: rx > 0 ? `2px solid ${color}` : undefined,
        borderTop: ry < 0 ? `2px solid ${color}` : undefined,
        borderBottom: ry > 0 ? `2px solid ${color}` : undefined,
      }}
    />
  );
  return (
    <AbsoluteFill style={{ opacity: 0.42 * intro, fontFamily: mono, fontSize: 15, letterSpacing: "0.12em", color, pointerEvents: "none" }}>
      {corner(m, m, -1, -1)}
      {corner(W - m - 22, m, 1, -1)}
      {corner(m, H - m - 22, -1, 1)}
      {corner(W - m - 22, H - m - 22, 1, 1)}
      <div style={{ position: "absolute", right: m + 40, top: m + 2 }}>{chapter}</div>
      <div style={{ position: "absolute", left: m + 40, top: m + 2 }}>CRACHA · {Math.round(K.duration)} SEC</div>
      <div style={{ position: "absolute", left: m + 40, bottom: m + 2 }}>{tc}</div>
      <div style={{ position: "absolute", left: m + 40, bottom: m - 10, width: 240, height: 1, background: color, opacity: 0.35 }} />
      <div style={{ position: "absolute", left: m + 40, bottom: m - 10, width: (240 * t) / K.duration, height: 1, background: color }} />
      <div style={{ position: "absolute", right: m + 40, bottom: m + 2, display: "flex", alignItems: "center", gap: 10 }}>
        <span>{K.bpm} BPM</span>
        <span style={{ display: "flex", gap: 4 }}>
          {[0, 1, 2, 3].map((i) => (
            <span key={i} style={{ width: 9, height: 9, border: `1.5px solid ${color}`, background: beat % 4 === i ? color : "transparent" }} />
          ))}
        </span>
        <span>BAR {String(bar).padStart(2, "0")}</span>
      </div>
    </AbsoluteFill>
  );
};

/** The pointer. `press` is 0..1 while clicking. */
export const Pointer: React.FC<{ x: number; y: number; opacity: number; press: number; light?: boolean }> = ({ x, y, opacity, press, light }) =>
  opacity <= 0 ? null : (
    <svg
      width={48}
      height={48}
      viewBox="0 0 24 24"
      style={{
        position: "absolute",
        left: x - 7,
        top: y - 4,
        opacity,
        transform: `scale(${1 - press * 0.16})`,
        transformOrigin: "7px 4px",
        filter: "drop-shadow(0 6px 10px rgba(0,0,0,0.35))",
      }}
    >
      <path d="M4 2.5 L19.5 12 L12.4 13.6 L9 20.5 Z" fill={light ? "#fff" : P.ink} stroke={light ? P.ink : "#fff"} strokeWidth={1.6} strokeLinejoin="round" />
    </svg>
  );

/** An expanding ring where something was clicked or landed. */
export const Ring: React.FC<{ x: number; y: number; at: number; color?: string; size?: number; dur?: number; width?: number }> = ({
  x,
  y,
  at,
  color = P.accent,
  size = 140,
  dur = 0.55,
  width = 4,
}) => {
  const t = useT();
  const p = prog(t, at, at + dur, ez.out);
  if (t < at || p >= 1) return null;
  return (
    <div
      style={{
        position: "absolute",
        left: x - size / 2,
        top: y - size / 2,
        width: size,
        height: size,
        borderRadius: size,
        border: `${width * (1 - p) + 1}px solid ${color}`,
        transform: `scale(${0.1 + p})`,
        opacity: 1 - p,
      }}
    />
  );
};

/** Full-frame iris: a circle of `color` grows out of the centre. */
export const Iris: React.FC<{ at: number; color: string; dur?: number; x?: number; y?: number; fringe?: boolean; children?: React.ReactNode }> = ({
  at,
  color,
  dur = 0.22,
  x = CX,
  y = CY,
  fringe = true,
  children,
}) => {
  const t = useT();
  if (t < at) return null;
  const p = prog(t, at, at + dur, ez.expo);
  const r = 8 + p * 1250;
  const done = p >= 0.999;
  return (
    <AbsoluteFill>
      {fringe && !done ? (
        <>
          <div style={{ position: "absolute", left: x - r - 4, top: y - r - 4, width: 2 * r + 8, height: 2 * r + 8, borderRadius: "50%", background: "#7b61ff", opacity: 0.8, filter: "blur(4px)" }} />
          <div style={{ position: "absolute", left: x - r - 1, top: y - r - 1, width: 2 * r + 2, height: 2 * r + 2, borderRadius: "50%", background: "#9cff7a", opacity: 0.35, filter: "blur(2px)" }} />
        </>
      ) : null}
      <AbsoluteFill style={{ background: color, clipPath: done ? undefined : `circle(${r}px at ${x}px ${y}px)` }}>{children}</AbsoluteFill>
    </AbsoluteFill>
  );
};

/** A tiny browser page, drawn at 300 × 200 and scaled by the caller. */
export const MiniPage: React.FC<{ title: string; path: string; dark?: boolean; seed: number; hot?: number }> = ({ title, path, dark, seed, hot = 0 }) => {
  const bg = dark ? P.night : P.card;
  const skel = dark ? "rgba(255,240,230,0.11)" : "#efe8e0";
  const txt = dark ? "rgba(255,240,230,0.85)" : P.ink;
  const widths = [0.9, 0.7, 0.82, 0.55, 0.75].map((w, i) => w - ((seed * 7 + i * 3) % 5) * 0.05);
  return (
    <div
      style={{
        position: "absolute",
        left: 0,
        top: 0,
        width: 300,
        height: 200,
        borderRadius: 14,
        background: bg,
        overflow: "hidden",
        boxShadow: dark ? "0 20px 40px -20px rgba(0,0,0,0.8)" : SHADOW_TINY,
        outline: `${hot > 0 ? 2 + hot * 2 : 1}px solid ${hot > 0 ? P.accent : dark ? "rgba(255,240,230,0.07)" : P.line}`,
        fontFamily: ui,
      }}
    >
      <div style={{ height: 30, display: "flex", alignItems: "center", gap: 5, padding: "0 10px", borderBottom: `1px solid ${dark ? "rgba(255,240,230,0.06)" : P.line}` }}>
        {[0, 1, 2].map((i) => (
          <div key={i} style={{ width: 7, height: 7, borderRadius: 4, background: dark ? "rgba(255,240,230,0.2)" : "#e2d9cf" }} />
        ))}
        <div style={{ marginLeft: 6, fontSize: 11, color: dark ? "rgba(255,240,230,0.5)" : P.muted, whiteSpace: "nowrap", overflow: "hidden" }}>{path}</div>
      </div>
      <div style={{ padding: "14px 16px" }}>
        <div style={{ fontSize: 22, fontWeight: 800, color: txt, letterSpacing: "-0.02em", whiteSpace: "nowrap" }}>{title}</div>
        {widths.map((w, i) => (
          <div
            key={i}
            style={{
              marginTop: i ? 8 : 12,
              width: `${w * 100}%`,
              height: 8,
              borderRadius: 4,
              background: i === (seed % 4) + 1 ? (dark ? "rgba(234,88,12,0.55)" : P.accentMark) : skel,
            }}
          />
        ))}
      </div>
    </div>
  );
};
const SHADOW_TINY = "0 1px 2px rgba(48,39,32,0.06), 0 10px 24px -10px rgba(90,45,20,0.22)";

/** Horizontal directional blur for whips, via an SVG filter. */
export const Smear: React.FC<{ id: string; x: number; y?: number; children: React.ReactNode }> = ({ id, x, y = 0, children }) => {
  const on = x > 0.3 || y > 0.3;
  return (
    <>
      {on ? (
        <svg width={0} height={0} style={{ position: "absolute" }}>
          <filter id={id} x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation={`${x.toFixed(2)} ${y.toFixed(2)}`} />
          </filter>
        </svg>
      ) : null}
      <AbsoluteFill style={{ filter: on ? `url(#${id})` : undefined }}>{children}</AbsoluteFill>
    </>
  );
};

/** Fixed-width letter boxes, so each letter's centre is known (for collapse-to-dot match cuts). */
export const letterBoxes = (text: string, size: number, advance = 0.9) => {
  const w = size * advance;
  const total = w * text.length;
  return [...text].map((c, i) => ({ c, x: CX - total / 2 + w * (i + 0.5), w }));
};
