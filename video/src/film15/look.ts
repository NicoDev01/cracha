import { loadFont as loadMono } from "@remotion/google-fonts/JetBrainsMono";
import { Easing } from "remotion";
import cues from "./cues.json";

export { cues };
export const mono = loadMono("normal", { weights: ["400", "500"], subsets: ["latin"] }).fontFamily;

// Warm neutral stage, one accent: the orange of the landing page.
export const K = {
  stage: "#f5f0e9",
  dot: "rgba(48, 39, 32, 0.07)",
  ink: "#17120f",
  text: "#302720",
  gray7: "#344054",
  gray5: "#667085",
  gray4: "#98a2b3",
  line: "#e9e4de",
  soft: "#f4f1ed",
  card: "#ffffff",
  accent: "#ea580c",
  accentSoft: "#fff1e8",
  accentMark: "#ffdcc4",
};

export const SHADOW =
  "0 1px 2px rgba(48,39,32,0.06), 0 16px 40px -12px rgba(90,45,20,0.18), 0 48px 96px -32px rgba(90,45,20,0.2)";

/** A spring with the smallest overshoot: settles without bouncing. */
export const settle = Easing.bezier(0.22, 1.06, 0.36, 1);
export const glide = Easing.bezier(0.65, 0, 0.35, 1);

/** Text typed out between two times. */
export const typed = (t: number, text: string, start: number, end: number) =>
  text.slice(0, Math.round(Math.max(0, Math.min(1, (t - start) / (end - start))) * text.length));
