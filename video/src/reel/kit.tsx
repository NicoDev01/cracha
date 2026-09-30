import React from "react";
import { C, FONT, SHADOW, clamp01, ease, lerp, prog } from "./theme";

/**
 * A rounded box in world coordinates, given by its centre. Everything that
 * morphs between rectangles (dot, window, pill, card, bubble) is this box.
 */
export const Box: React.FC<{
  x: number;
  y: number;
  w: number;
  h: number;
  r?: number;
  bg?: string;
  shadow?: string;
  opacity?: number;
  scaleX?: number;
  scaleY?: number;
  border?: string;
  style?: React.CSSProperties;
  children?: React.ReactNode;
}> = ({ x, y, w, h, r = 24, bg = C.white, shadow = SHADOW, opacity = 1, scaleX = 1, scaleY = 1, border, style, children }) => (
  <div
    style={{
      position: "absolute",
      left: x - w / 2,
      top: y - h / 2,
      width: w,
      height: h,
      borderRadius: Math.min(r, w / 2, h / 2),
      background: bg,
      boxShadow: shadow,
      opacity,
      transform: `scale(${scaleX}, ${scaleY})`,
      overflow: "hidden",
      border,
      fontFamily: FONT,
      color: C.ink,
      ...style,
    }}
  >
    {children}
  </div>
);

export type Rect = { x: number; y: number; w: number; h: number; r: number };

/** Box geometry between two rects: centre, width and height together, radius last. */
export const mixRect = (a: Rect, b: Rect, p: number): Rect => ({
  x: lerp(a.x, b.x, p),
  y: lerp(a.y, b.y, p),
  w: lerp(a.w, b.w, p),
  h: lerp(a.h, b.h, p),
  r: lerp(a.r, b.r, p),
});

/** A thin ring that grows and fades: the shockwave on arrivals. */
export const Ring: React.FC<{ t: number; at: number; x: number; y: number; size?: number; color?: string }> = ({
  t,
  at,
  x,
  y,
  size = 260,
  color = C.accent,
}) => {
  const p = clamp01((t - at) / 0.55);
  if (p <= 0 || p >= 1) return null;
  const s = lerp(0.2, 1, ease.out(p)) * size;
  return (
    <div
      style={{
        position: "absolute",
        left: x - s / 2,
        top: y - s / 2,
        width: s,
        height: s,
        borderRadius: "50%",
        border: `${lerp(6, 1, p)}px solid ${color}`,
        opacity: 1 - p,
      }}
    />
  );
};

/** Orange check in a circle that pops in with a back ease. */
export const Check: React.FC<{ t: number; at: number; x: number; y: number; size?: number }> = ({ t, at, x, y, size = 56 }) => {
  const s = prog(t, at, at + 0.35, ease.back);
  if (s <= 0) return null;
  const draw = prog(t, at + 0.08, at + 0.35, ease.out);
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 56 56"
      style={{ position: "absolute", left: x - size / 2, top: y - size / 2, transform: `scale(${s})`, overflow: "visible" }}
    >
      <circle cx={28} cy={28} r={28} fill={C.accent} />
      <path
        d="M16 29 L24.5 37 L40 20"
        fill="none"
        stroke="white"
        strokeWidth={5.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        pathLength={1}
        strokeDasharray={1}
        strokeDashoffset={1 - draw}
      />
    </svg>
  );
};

/** Grey placeholder line: page text without words. */
export const Line: React.FC<{ w: number | string; h?: number; color?: string; style?: React.CSSProperties }> = ({
  w,
  h = 14,
  color = C.line,
  style,
}) => <div style={{ width: w, height: h, borderRadius: h, background: color, ...style }} />;

/** Mouse pointer that glides between waypoints and dips on each click. */
export const Cursor: React.FC<{
  t: number;
  path: { t: number; x: number; y: number }[];
  clicks: number[];
  show: [number, number];
  scale?: number;
}> = ({ t, path, clicks, show, scale = 1 }) => {
  if (t < show[0] || t > show[1]) return null;
  let x = path[0].x;
  let y = path[0].y;
  for (let i = 1; i < path.length; i++) {
    const a = path[i - 1];
    const b = path[i];
    if (t >= a.t) {
      const p = prog(t, a.t, b.t, ease.inOut);
      x = lerp(a.x, b.x, p);
      y = lerp(a.y, b.y, p);
    }
  }
  const press = clicks.reduce((m, c) => Math.max(m, 1 - Math.abs(t - c) / 0.09), 0);
  const fade = Math.min(prog(t, show[0], show[0] + 0.2, ease.out), 1 - prog(t, show[1] - 0.2, show[1], ease.out));
  return (
    <svg
      width={44}
      height={44}
      viewBox="0 0 44 44"
      style={{
        position: "absolute",
        left: x - 6,
        top: y - 4,
        opacity: fade,
        transform: `scale(${scale * (1 - 0.18 * Math.max(0, press))})`,
        transformOrigin: "6px 4px",
        filter: "drop-shadow(0 6px 10px rgba(20,17,16,0.3))",
        overflow: "visible",
      }}
    >
      <path d="M6 4 L6 36 L14.5 28 L20 40 L26 37.5 L20.5 25.5 L32 25.5 Z" fill={C.ink} stroke="white" strokeWidth={2.5} strokeLinejoin="round" />
    </svg>
  );
};

/** Headline word that sharpens out of a blur while it rises into place. */
export const BlurWord: React.FC<{ t: number; at: number; children: React.ReactNode; style?: React.CSSProperties }> = ({
  t,
  at,
  children,
  style,
}) => {
  const p = prog(t, at, at + 0.4, ease.out);
  return (
    <span
      style={{
        display: "inline-block",
        opacity: p,
        filter: `blur(${(1 - p) * 14}px)`,
        transform: `translateY(${(1 - p) * 28}px)`,
        ...style,
      }}
    >
      {children}
    </span>
  );
};
