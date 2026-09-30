import React from "react";
import { AbsoluteFill } from "remotion";
import { CX, CY, P, clamp01, ez, font, prog, sp, ui, useT } from "./look";

export const SHADOW_SOFT = "0 1px 2px rgba(20,17,16,0.04), 0 14px 36px -14px rgba(20,17,16,0.14), 0 40px 90px -40px rgba(20,17,16,0.14)";
export const SHADOW_TINY = "0 1px 2px rgba(20,17,16,0.04), 0 8px 18px -10px rgba(20,17,16,0.16)";

type StackWord = { text: string; at: number };

/**
 * Words stack up in the middle of the frame: each new word pops in below and the
 * block slides up and shrinks until everything fits, like a type stack on the beat.
 */
export const Stack: React.FC<{ words: StackWord[]; out?: number; collapse?: number; maxSize?: number }> = ({
  words,
  out,
  collapse,
  maxSize = 340,
}) => {
  const t = useT();
  const w = words.map((word) => sp(t, word.at, 16, 170, 0.8));
  const n = w.reduce((a, b) => a + b, 0);
  if (n <= 0.001) return null;
  const longest = Math.max(...words.map((word, i) => (w[i] > 0.02 ? word.text.length : 0)));
  const size = Math.min(maxSize, 1640 / (longest * 0.56), 800 / (0.98 * Math.max(1, n)));
  const lh = size * 0.98;
  const blockH = w.reduce((a, b) => a + b * lh, 0);
  // Exit: the block whips up out of frame. Collapse: it shrinks into a dot.
  const whip = out ? prog(t, out, out + 0.28, ez.in) : 0;
  const shrink = collapse ? prog(t, collapse, collapse + 0.28, ez.in) : 0;
  if (shrink >= 1 || whip >= 1) return null;
  let y = CY - blockH / 2;
  return (
    <AbsoluteFill
      style={{
        transform: `translateY(${-whip * 1300}px) scale(${1 - shrink})`,
        transformOrigin: `${CX}px ${CY}px`,
        filter: whip > 0.02 ? `blur(${whip * 16}px)` : undefined,
      }}
    >
      {words.map((word, i) => {
        if (w[i] <= 0.001) return null;
        const top = y;
        y += w[i] * lh;
        const q = clamp01((t - word.at) / 0.2);
        const last = word.text.slice(-1);
        const punct = last === "?" || last === "." ? last : "";
        const body = punct ? word.text.slice(0, -1) : word.text;
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              top: top + (w[i] * lh - lh) / 2,
              height: lh,
              lineHeight: `${lh}px`,
              textAlign: "center",
              fontSize: size,
              letterSpacing: "-0.04em",
              color: P.ink,
              whiteSpace: "nowrap",
              opacity: q,
              transform: `translateY(${(1 - w[i]) * lh * 0.7}px) scale(${0.7 + 0.3 * Math.min(1, w[i])})`,
              filter: q < 1 ? `blur(${(1 - q) * 14}px)` : undefined,
              fontFamily: font,
              fontWeight: 800,
            }}
          >
            {body}
            <span style={{ color: P.accent }}>{punct}</span>
          </div>
        );
      })}
    </AbsoluteFill>
  );
};

/** The pointer. `press` is 0..1 while clicking. */
export const Pointer: React.FC<{ x: number; y: number; opacity: number; press: number }> = ({ x, y, opacity, press }) =>
  opacity <= 0 ? null : (
    <svg
      width={46}
      height={46}
      viewBox="0 0 24 24"
      style={{
        position: "absolute",
        left: x - 7,
        top: y - 4,
        opacity,
        transform: `scale(${1 - press * 0.16})`,
        transformOrigin: "7px 4px",
        filter: "drop-shadow(0 6px 10px rgba(0,0,0,0.25))",
      }}
    >
      <path d="M4 2.5 L19.5 12 L12.4 13.6 L9 20.5 Z" fill={P.ink} stroke="#fff" strokeWidth={1.6} strokeLinejoin="round" />
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
  width = 3,
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

/** A dot that holds the frame between scenes. */
export const Dot: React.FC<{ x?: number; y?: number; size?: number; color?: string; scale?: number; pulseFrom?: number }> = ({
  x = CX,
  y = CY,
  size = 26,
  color = P.ink,
  scale = 1,
  pulseFrom,
}) => {
  const t = useT();
  const pulse = pulseFrom !== undefined && t > pulseFrom ? 1 + 0.18 * Math.max(0, Math.sin((t - pulseFrom) * Math.PI * 4)) : 1;
  return scale <= 0 ? null : (
    <div style={{ position: "absolute", left: x - size / 2, top: y - size / 2, width: size, height: size, borderRadius: size, background: color, transform: `scale(${scale * pulse})` }} />
  );
};

/** A minimal page: address bar, a title bar and a few lines. Drawn at w × h. */
export const Tile: React.FC<{ w: number; h: number; seed: number; read?: number; hot?: boolean; title?: string; path?: string }> = ({
  w,
  h,
  seed,
  read = 0,
  hot,
  title,
  path,
}) => {
  const u = h / 100;
  const widths = [0.86, 0.64, 0.78, 0.5].map((x, i) => x - ((seed * 7 + i * 3) % 5) * 0.05);
  return (
    <div
      style={{
        position: "absolute",
        left: 0,
        top: 0,
        width: w,
        height: h,
        borderRadius: 10 * u,
        background: P.card,
        overflow: "hidden",
        boxShadow: SHADOW_TINY,
        outline: `${hot || read > 0 ? 1.5 * u : 1 * u}px solid ${hot ? P.accent : read > 0 ? `rgba(234,88,12,${0.25 + 0.5 * read})` : P.line}`,
        fontFamily: ui,
      }}
    >
      <div style={{ height: 18 * u, display: "flex", alignItems: "center", gap: 3 * u, padding: `0 ${7 * u}px`, borderBottom: `${0.8 * u}px solid ${P.line}` }}>
        {[0, 1, 2].map((i) => (
          <div key={i} style={{ width: 4.5 * u, height: 4.5 * u, borderRadius: 3 * u, background: "#e6e0da" }} />
        ))}
        {path ? <div style={{ marginLeft: 4 * u, fontSize: 7.5 * u, color: P.muted, whiteSpace: "nowrap" }}>{path}</div> : null}
      </div>
      <div style={{ padding: `${8 * u}px ${10 * u}px` }}>
        {title ? (
          <div style={{ fontSize: 15 * u, fontWeight: 800, color: P.ink, letterSpacing: "-0.02em", whiteSpace: "nowrap" }}>{title}</div>
        ) : (
          <div style={{ width: "46%", height: 8 * u, borderRadius: 4 * u, background: "#d9d2cb" }} />
        )}
        {widths.map((x, i) => (
          <div
            key={i}
            style={{
              marginTop: i ? 5.5 * u : 8 * u,
              width: `${x * 100}%`,
              height: 5 * u,
              borderRadius: 3 * u,
              background: i === (seed % 3) + 1 ? P.accentMark : P.soft,
            }}
          />
        ))}
      </div>
    </div>
  );
};

/** Directional blur for whips, via an SVG filter. */
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
