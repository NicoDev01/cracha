import { separate } from "flubber";
import React from "react";
import { LOGO_LETTERS, LOGO_VIEWBOX } from "../logo-paths";
import { P } from "./look";

const [VX, VY, VW, VH] = LOGO_VIEWBOX.split(" ").map(Number);
const cache = new Map<number, ((p: number) => string)[]>();

/** One interpolator per letter, all starting from the same circle (radius in viewBox units). */
const morphs = (r: number) => {
  const key = Math.round(r * 100);
  let m = cache.get(key);
  if (!m) {
    const cx = VX + VW / 2;
    const cy = VY + VH / 2;
    const ring: [number, number][] = Array.from({ length: 72 }, (_, i) => {
      const a = (i / 72) * Math.PI * 2;
      return [cx + Math.cos(a) * r, cy + Math.sin(a) * r];
    });
    m = separate(ring, LOGO_LETTERS, { maxSegmentLength: 0.4, single: false }) as unknown as ((p: number) => string)[];
    cache.set(key, m);
  }
  return m;
};

/** The black dot and the CraCha wordmark are one shape: p = 0 is the dot, p = 1 the wordmark. */
export const LogoMorph: React.FC<{ cx: number; cy: number; width: number; p: number; dot?: number; color?: string }> = ({
  cx,
  cy,
  width,
  p,
  dot = 26,
  color = P.ink,
}) => {
  const height = (width * VH) / VW;
  const r = (dot / 2) * (VW / width);
  const paths = p >= 0.999 ? LOGO_LETTERS : morphs(r).map((f) => f(Math.max(0, p)));
  return (
    <svg viewBox={LOGO_VIEWBOX} width={width} height={height} style={{ position: "absolute", left: cx - width / 2, top: cy - height / 2, overflow: "visible" }}>
      {paths.map((d, i) => (
        <path key={i} d={d} fill={color} />
      ))}
    </svg>
  );
};
