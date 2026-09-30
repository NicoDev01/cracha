import { Easing, spring, useCurrentFrame } from "remotion";
import { C, FPS, TEXT_GRADIENT, heading, prog, ease } from "../theme";
import cues from "./cues.json";

export { cues };
export const K = cues;

/** Seconds since the start of the film. */
export const useT = () => useCurrentFrame() / FPS;

export const SITE = "kundenwebsite.de";

// The problem lives in a dark room, the solution in the warm light brand world.
export const DARK = {
  bg: "#110d0b",
  card: "#1d1714",
  card2: "#241d19",
  line: "rgba(255, 240, 230, 0.07)",
  skel: "rgba(255, 240, 230, 0.09)",
  text: "#f3ebe4",
  muted: "#8d8079",
};
export const LIGHT_ACCENT = "linear-gradient(90deg, #fb923c 0%, #fbbf24 100%)";

export const ez = {
  /** Expo in-out: long, silky accelerations for camera moves. */
  cam: Easing.bezier(0.83, 0, 0.17, 1),
  soft: Easing.bezier(0.65, 0, 0.35, 1),
  out: ease.out,
  in: ease.in,
  /** A small overshoot for shapes that land. */
  land: Easing.bezier(0.34, 1.32, 0.64, 1),
};

/** A spring from 0 to 1 that starts at `start` (seconds). */
export const sp = (t: number, start: number, damping = 13, stiffness = 170, mass = 0.9) =>
  t <= start ? 0 : spring({ frame: (t - start) * FPS, fps: FPS, config: { damping, stiffness, mass } });

/** Smoothly interpolates in log space, so zooms feel constant in speed. */
export const zoom = (from: number, to: number, p: number) => Math.exp(Math.log(from) + (Math.log(to) - Math.log(from)) * p);

export const clamp01 = (x: number) => Math.max(0, Math.min(1, x));

/** Deterministic pseudo-random numbers. */
export const rnd = (i: number, salt = 1) => {
  const x = Math.sin(i * 127.1 + salt * 311.7) * 43758.5453;
  return x - Math.floor(x);
};

/** Wraps children in a directional blur, for fast moves. */
export const MotionBlur: React.FC<{ id: string; x: number; y?: number; children: React.ReactNode; style?: React.CSSProperties }> = ({
  id,
  x,
  y = 0,
  children,
  style,
}) => {
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
      <div style={{ position: "absolute", inset: 0, filter: on ? `url(#${id})` : undefined, ...style }}>{children}</div>
    </>
  );
};

type Word = { text: string; accent?: boolean; at?: number };

/** "Frag *die ganze Website.*": starred words get the accent, "|" breaks the line. */
export const parse = (s: string): Word[] => {
  let accent = false;
  return s.split(" ").map((raw) => {
    let text = raw;
    const opens = text.startsWith("*");
    if (opens) text = text.slice(1);
    const closes = text.endsWith("*");
    if (closes) text = text.slice(0, -1);
    const w = { text, accent: accent || opens };
    if (opens) accent = true;
    if (closes) accent = false;
    return w;
  });
};

/**
 * Kinetic headline: each word springs up out of a blur at its own time and
 * the line leaves together. `times` gives a start per word; otherwise words
 * follow each other `stagger` apart.
 */
export const Kinetic: React.FC<{
  text: string;
  start: number;
  end: number;
  size: number;
  stagger?: number;
  times?: number[];
  color?: string;
  accent?: string;
  weight?: number;
  font?: string;
  exit?: "up" | "fade" | "zoom";
}> = ({ text, start, end, size, stagger = 0.08, times, color = C.ink, accent = TEXT_GRADIENT, weight = 800, font = heading, exit = "up" }) => {
  const t = useT();
  if (t < start - 0.05 || t > end + 0.05) return null;
  const words = parse(text);
  const out = prog(t, end - 0.3, end, ease.in);
  let visible = 0;
  return (
    <div
      style={{
        display: "flex",
        flexWrap: "wrap",
        justifyContent: "center",
        columnGap: size * 0.26,
        fontFamily: font,
        fontWeight: weight,
        fontSize: size,
        lineHeight: 1.1,
        letterSpacing: "-0.03em",
        color,
        transform: exit === "zoom" ? `scale(${1 + out * 0.6})` : undefined,
      }}
    >
      {words.map((w, i) => {
        if (w.text === "|") return <div key={i} style={{ flexBasis: "100%", height: 0 }} />;
        const at = times?.[visible] ?? start + visible * stagger;
        visible++;
        const p = sp(t, at, 14, 190, 0.8);
        const fade = clamp01((t - at) / 0.18);
        const y = (1 - p) * size * 0.55 - (exit === "up" ? out * size * 0.35 : 0);
        return (
          <span
            key={i}
            style={{
              display: "inline-block",
              opacity: fade * (1 - out),
              transform: `translateY(${y}px) scale(${0.85 + 0.15 * p})`,
              filter: `blur(${(1 - fade) * 12 + out * 10}px)`,
              ...(w.accent
                ? { backgroundImage: accent, WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent", paddingBottom: "0.08em" }
                : null),
            }}
          >
            {w.text}
          </span>
        );
      })}
    </div>
  );
};

/** A headline centred at the top of the frame. */
export const Headline: React.FC<{ text: string; start: number; end: number; y?: number; size?: number; dark?: boolean; stagger?: number }> = ({
  text,
  start,
  end,
  y = 72,
  size = 64,
  dark,
  stagger,
}) => (
  <div style={{ position: "absolute", top: y, left: 80, right: 80 }}>
    <Kinetic text={text} start={start} end={end} size={size} stagger={stagger} color={dark ? DARK.text : C.ink} accent={dark ? LIGHT_ACCENT : TEXT_GRADIENT} />
  </div>
);

/** The pointer. `press` is 0..1 while clicking. */
export const Pointer: React.FC<{ x: number; y: number; opacity: number; press: number; dark?: boolean }> = ({ x, y, opacity, press, dark }) =>
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
        filter: "drop-shadow(0 6px 10px rgba(0,0,0,0.35))",
      }}
    >
      <path d="M4 2.5 L19.5 12 L12.4 13.6 L9 20.5 Z" fill={dark ? "#fff" : C.ink} stroke={dark ? C.ink : "#fff"} strokeWidth={1.6} strokeLinejoin="round" />
    </svg>
  );

/** An expanding ring where something was clicked. */
export const Ripple: React.FC<{ x: number; y: number; at: number; color?: string; size?: number }> = ({ x, y, at, color = C.orange, size = 120 }) => {
  const t = useT();
  const p = prog(t, at, at + 0.55, ease.out);
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
        border: `${3 * (1 - p) + 1}px solid ${color}`,
        transform: `scale(${0.15 + p})`,
        opacity: 1 - p,
      }}
    />
  );
};

/** 0..1..0 around a click. */
export const pressAt = (t: number, at: number) => prog(t, at - 0.1, at, ease.out) - prog(t, at, at + 0.25, ease.out);
