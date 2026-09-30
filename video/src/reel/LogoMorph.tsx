import { getBoundingBox } from "@remotion/paths";
import { splitPathString } from "flubber";
import React from "react";
import { interpolateColors } from "remotion";
import { circlePath, morphs, roundRectPath } from "./kit";
import { LOGO_PATHS, LOGO_VIEWBOX } from "./logo";
import { C, FPS, clamp01 } from "./theme";

const [VX, VY, VW, VH] = LOGO_VIEWBOX;
export const LOGO_CX = VX + VW / 2;
export const LOGO_CY = VY + VH / 2;

// Letters left to right; flubber morphs outlines, so each letter uses its outer ring.
const LETTERS = LOGO_PATHS.map((d) => ({ d, x: getBoundingBox(d).x1 }))
  .sort((a, b) => a.x - b.x)
  .map(({ d }) => d);
const OUTLINES = LETTERS.map((d) => splitPathString(d)[0]);

export type Shape = { kind: "dot"; r: number } | { kind: "logo" } | { kind: "pill"; w: number; h: number };

/** Outline list of a shape in logo units, centred on the logo's centre. */
const shapeOf = (s: Shape, scale: number): string[] => {
  if (s.kind === "dot") return [circlePath(LOGO_CX, LOGO_CY, s.r / scale)];
  if (s.kind === "logo") return OUTLINES;
  return [roundRectPath(LOGO_CX, LOGO_CY, s.w / scale, s.h / scale, s.h / 2 / scale)];
};

const keyOf = (s: Shape) => (s.kind === "dot" ? `dot${s.r}` : s.kind === "logo" ? "logo" : `pill${s.w}x${s.h}`);

/**
 * The wordmark, and flubber morphs into and out of it: a dot splits into the six
 * letters, the letters melt into a pill. `p` runs 0 → 1; three accent ghosts
 * trail the shape while it moves. At rest the real paths (with counters) show.
 */
export const LogoMorph: React.FC<{
  x: number;
  y: number;
  width: number;
  from: Shape;
  to: Shape;
  p: number;
  /** p a few frames earlier, for the ghosts. */
  pAt: (framesAgo: number) => number;
  fromColor?: string;
  toColor?: string;
  ghosts?: boolean;
}> = ({ x, y, width, from, to, p, pAt, fromColor = C.ink, toColor = C.ink, ghosts = true }) => {
  const scale = width / VW;
  const f = morphs(`${keyOf(from)}>${keyOf(to)}@${width}`, shapeOf(from, scale), shapeOf(to, scale), 0.35);
  const path = (q: number) => f.map((fn) => fn(clamp01(q))).join(" ");
  const restingLogo = (from.kind === "logo" && p <= 0) || (to.kind === "logo" && p >= 1);
  const moving = p > 0 && p < 1;
  const color = interpolateColors(p, [0, 1], [fromColor, toColor]);
  return (
    <svg
      width={width}
      height={VH * scale}
      viewBox={`${VX} ${VY} ${VW} ${VH}`}
      style={{ position: "absolute", left: x - width / 2, top: y - (VH * scale) / 2, overflow: "visible" }}
    >
      {ghosts &&
        moving &&
        [6, 4, 2].map((k, i) => (
          <path key={k} d={path(pAt(k))} fill={C.accent} opacity={[0.1, 0.25, 0.4][i]} />
        ))}
      {restingLogo ? LETTERS.map((d) => <path key={d} d={d} fill={color} />) : <path d={path(p)} fill={color} />}
    </svg>
  );
};

/** Seconds per frame, for ghost lookups. */
export const FRAME = 1 / FPS;
