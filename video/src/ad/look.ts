import { loadVariableFont as loadArchivo } from "@remotion/google-fonts/Archivo";
import { loadFont as loadInter } from "@remotion/google-fonts/Inter";
import { loadFont as loadSerif } from "@remotion/google-fonts/InstrumentSerif";
import { loadFont as loadMono } from "@remotion/google-fonts/JetBrainsMono";
import { Easing, interpolate, spring, useCurrentFrame } from "remotion";
import cues from "./cues.json";

export { cues };
export const K = cues;

export const FPS = 60;
export const W = 1920;
export const H = 1080;
export const CX = W / 2;
export const CY = H / 2;

// Archivo's width axis runs from 62 to 125: 125 at weight 900 is the extra-wide
// display cut of the showreel reference, and animating it gives squash & stretch.
export const display = loadArchivo("normal", { subsets: ["latin", "latin-ext"] }).fontFamily;
export const serif = loadSerif("italic", { weights: ["400"], subsets: ["latin"] }).fontFamily;
export const ui = loadInter("normal", { weights: ["400", "500", "600", "700"], subsets: ["latin", "latin-ext"] }).fontFamily;
export const mono = loadMono("normal", { weights: ["400", "500"], subsets: ["latin"] }).fontFamily;

export const wide = (wdth = 125, wght = 900) => ({
  fontFamily: display,
  fontWeight: wght,
  fontVariationSettings: `'wdth' ${wdth}, 'wght' ${wght}`,
});

// Two worlds, one palette: the calm product stage and the loud punchline frames.
export const P = {
  paper: "#f5f0e9",
  ink: "#17120f",
  text: "#302720",
  muted: "#786f69",
  faint: "#b3aaa3",
  line: "#e9e4de",
  card: "#ffffff",
  accent: "#ea580c",
  accentSoft: "#fff1e8",
  accentMark: "#ffd2b0",
  flash: "#465fff",
  night: "#1d1714",
  night2: "#2a221e",
};

export const SHADOW =
  "0 1px 2px rgba(48,39,32,0.06), 0 16px 40px -12px rgba(90,45,20,0.18), 0 48px 96px -32px rgba(90,45,20,0.2)";
export const SHADOW_SM = "0 1px 2px rgba(48,39,32,0.06), 0 8px 20px -8px rgba(90,45,20,0.2)";

export const ez = {
  inOut: Easing.bezier(0.76, 0, 0.24, 1),
  out: Easing.bezier(0.16, 1, 0.3, 1),
  expo: Easing.bezier(0.19, 1, 0.22, 1),
  in: Easing.bezier(0.7, 0, 0.84, 0),
  whip: Easing.bezier(0.83, 0, 0.17, 1),
  back: Easing.bezier(0.34, 1.56, 0.64, 1),
};

export const useT = () => useCurrentFrame() / FPS;

export const prog = (t: number, a: number, b: number, e: (x: number) => number = ez.out) =>
  interpolate(t, [a, b], [0, 1], { easing: e, extrapolateLeft: "clamp", extrapolateRight: "clamp" });

export const lerp = (a: number, b: number, p: number) => a + (b - a) * p;
export const clamp01 = (x: number) => Math.max(0, Math.min(1, x));

/** A spring from 0 to 1 that starts at `start` (seconds). */
export const sp = (t: number, start: number, damping = 13, stiffness = 180, mass = 0.8) =>
  t <= start ? 0 : spring({ frame: (t - start) * FPS, fps: FPS, config: { damping, stiffness, mass } });

/** Interpolates in log space so zooms feel constant in speed. */
export const zoom = (from: number, to: number, p: number) => Math.exp(Math.log(from) + (Math.log(to) - Math.log(from)) * p);

/** Deterministic pseudo-random numbers. */
export const rnd = (i: number, salt = 1) => {
  const x = Math.sin(i * 127.1 + salt * 311.7) * 43758.5453;
  return x - Math.floor(x);
};

/** 0..1..0 around a click. */
export const pressAt = (t: number, at: number) => prog(t, at - 0.1, at, ez.out) - prog(t, at, at + 0.25, ez.out);

// The flat background colour over time; transitions draw on top of it.
const BG: [number, string][] = [
  [0, P.accent],
  [1, P.ink],
  [2, P.flash],
  [3, P.paper],
  [4, P.ink],
  [8, P.accent],
  [9.25, P.paper],
  [24, P.accent],
  [25, P.ink],
  [26, P.flash],
  [27, P.paper],
  [28, P.ink],
  [30, P.accent],
];
export const bgAt = (t: number) => BG.reduce((c, [at, col]) => (t >= at ? col : c), BG[0][1]);
export const isDark = (c: string) => c === P.ink || c === P.flash || c === P.night;

export const SITE = "example.com";
export const URL_CTA = "cracha-app.com";
