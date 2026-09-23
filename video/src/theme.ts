import { loadFont as loadInter } from "@remotion/google-fonts/Inter";
import { loadFont as loadUrbanist } from "@remotion/google-fonts/Urbanist";
import { Easing, interpolate, interpolateColors } from "remotion";

export const FPS = 60;
export const WIDTH = 1920;
export const HEIGHT = 1080;
export const DURATION_S = 33;

export const CX = WIDTH / 2;
export const CY = HEIGHT / 2;

// The landing page's hero: Urbanist for headlines, Inter for UI text, the
// indigo-to-purple gradient from `.text-gradient_indigo-purple`.
export const heading = loadUrbanist("normal", { weights: ["600", "700", "800"], subsets: ["latin", "latin-ext"] }).fontFamily;
export const ui = loadInter("normal", { weights: ["400", "500", "600", "700"], subsets: ["latin", "latin-ext"] }).fontFamily;

export const C = {
  ink: "#0b0b12",
  text: "#1f2233",
  muted: "#6b7085",
  faint: "#a3a7b8",
  line: "rgba(24, 28, 60, 0.09)",
  card: "#ffffff",
  indigo: "#6366f1",
  purple: "#a855f7",
  sky: "#38bdf8",
  pink: "#ec4899",
  green: "#22c55e",
};

export const GRADIENT = `linear-gradient(90deg, ${C.indigo} 0%, ${C.purple} 100%)`;

export const SHADOW =
  "0 1px 2px rgba(20, 22, 60, 0.06), 0 12px 32px -8px rgba(40, 40, 110, 0.18), 0 40px 80px -24px rgba(60, 50, 140, 0.22)";
export const SHADOW_SM = "0 1px 2px rgba(20, 22, 60, 0.06), 0 8px 20px -8px rgba(40, 40, 110, 0.2)";

export const ease = {
  inOut: Easing.bezier(0.76, 0, 0.24, 1),
  out: Easing.bezier(0.16, 1, 0.3, 1),
  in: Easing.bezier(0.7, 0, 0.84, 0),
  back: Easing.bezier(0.34, 1.56, 0.64, 1),
  linear: (x: number) => x,
};

/** 0→1 between two points in time (seconds), clamped. */
export const prog = (t: number, from: number, to: number, easing: (x: number) => number = ease.out) =>
  interpolate(t, [from, to], [0, 1], {
    easing,
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

/** Fades in over [a, a+d] and out over [b-d, b]. */
export const windowIn = (t: number, a: number, b: number, d = 0.3) =>
  Math.min(prog(t, a, a + d), 1 - prog(t, b - d, b, ease.in));

export const lerp = (a: number, b: number, p: number) => a + (b - a) * p;

export type Keyframe<T extends Record<string, number | string>> = T & {
  t: number;
  /** Easing for the segment that ends at this keyframe. */
  e?: (x: number) => number;
};

/** Interpolates numbers and colors between keyframes sorted by `t`. */
export function track<T extends Record<string, number | string>>(t: number, kfs: Keyframe<T>[]): T {
  let i = 0;
  while (i < kfs.length - 1 && t >= kfs[i + 1].t) i++;
  const a = kfs[i];
  const b = kfs[Math.min(i + 1, kfs.length - 1)];
  if (a === b || t <= a.t) return a;
  const p = (b.e ?? ease.inOut)((t - a.t) / (b.t - a.t));
  const out: Record<string, number | string> = {};
  for (const key of Object.keys(a)) {
    if (key === "t" || key === "e") continue;
    const va = a[key];
    const vb = b[key];
    out[key] =
      typeof va === "number" && typeof vb === "number"
        ? lerp(va, vb, p)
        : interpolateColors(p, [0, 1], [String(va), String(vb)]);
  }
  return out as T;
}
