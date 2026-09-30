import { loadFont } from "@remotion/google-fonts/Urbanist";
import { Easing, spring } from "remotion";
import cues from "./cues.json";

// One rounded family, like the logo and the landing page: H1 800, H2 700, text 500–600.
export const { fontFamily: FONT } = loadFont("normal", { weights: ["500", "600", "700", "800"], subsets: ["latin"] });

export const FPS = cues.fps;
export const W = 1920;
export const H = 1080;
/** Screen point the camera looks at; the strip below 900 px belongs to the captions. */
export const CX = 960;
export const CY = 470;

export const C = {
  ink: "#141110",
  sub: "#6b6560",
  accent: "#ea580c",
  accentSoft: "#fff1e8",
  mark: "#ffd6b8",
  soft: "#f5f2ee",
  line: "#ece8e3",
  white: "#ffffff",
};

/** Soft, neutral drop shadow; `a` fades it in and out with the element it belongs to. */
export const shadow = (a = 1) =>
  `0 30px 80px -20px rgba(40, 30, 90, ${0.28 * a}), 0 8px 24px -8px rgba(40, 30, 90, ${0.16 * a})`;
export const SHADOW = shadow();
export const SHADOW_SM = "0 10px 30px -10px rgba(40, 30, 90, 0.3)";

export const ease = {
  inOut: Easing.bezier(0.76, 0, 0.24, 1),
  out: Easing.bezier(0.16, 1, 0.3, 1),
  in: Easing.bezier(0.7, 0, 0.84, 0),
  back: Easing.bezier(0.34, 1.56, 0.64, 1),
};

export const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
export const lerp = (a: number, b: number, p: number) => a + (b - a) * p;

/** 0 → 1 between two seconds, shaped by an easing. */
export const prog = (t: number, from: number, to: number, fn: (x: number) => number = ease.inOut) =>
  fn(clamp01((t - from) / (to - from)));

/** Scale interpolated on a log scale, so a zoom feels evenly fast from start to end. */
export const logLerp = (a: number, b: number, p: number) => Math.exp(lerp(Math.log(a), Math.log(b), p));

/** Remotion spring 0 → 1 started at `from` seconds; overshoots a little, so elements land with a bounce. */
export const springAt = (t: number, from: number, damping = 14, mass = 0.6) =>
  t <= from ? 0 : spring({ frame: (t - from) * FPS, fps: FPS, config: { damping, mass } });

export const T = cues.t;
export const TEXT = cues.text;
