import type { CSSProperties, ReactNode } from "react";
import { useCurrentFrame } from "remotion";
import { CX, CY, FPS, ease, prog, track, type Keyframe } from "../theme";
import { K, SHADOW, settle } from "./look";

type Rect = { x: number; y: number; w: number; h: number; r: number; fill: string };

// The one container. Every state is a centred rect; the morph between two
// states changes size, radius and fill together, so the eye never loses it.
export const BOX: Keyframe<Rect>[] = [
  { t: 0, x: CX, y: CY, w: 0, h: 0, r: 0, fill: K.card },
  { t: 1.6, x: CX, y: CY, w: 18, h: 18, r: 9, fill: K.card },
  { t: 2.0, x: CX, y: CY, w: 1100, h: 104, r: 52, fill: K.card, e: settle },
  { t: 3.5, x: CX, y: CY, w: 1100, h: 104, r: 52, fill: K.card },
  { t: 3.95, x: CX, y: CY, w: 1100, h: 430, r: 28, fill: K.card, e: settle },
  { t: 5.0, x: CX, y: CY, w: 1100, h: 430, r: 28, fill: K.card },
  { t: 5.45, x: CX, y: CY, w: 1100, h: 520, r: 28, fill: K.card, e: settle },
  { t: 7.5, x: CX, y: CY, w: 1100, h: 520, r: 28, fill: K.card },
  { t: 7.9, x: CX, y: CY, w: 1100, h: 200, r: 28, fill: K.card, e: settle },
  { t: 8.0, x: CX, y: CY, w: 1100, h: 200, r: 28, fill: K.card },
  { t: 8.5, x: CX, y: CY, w: 1300, h: 720, r: 24, fill: K.card, e: settle },
  { t: 12.5, x: CX, y: CY, w: 1300, h: 720, r: 24, fill: K.card },
  { t: 12.95, x: CX, y: CY, w: 760, h: 320, r: 32, fill: K.card, e: settle },
  { t: 13.5, x: CX, y: CY, w: 760, h: 320, r: 32, fill: K.card },
  { t: 13.95, x: CX, y: 700, w: 540, h: 96, r: 48, fill: K.accent, e: settle },
];

/** Opacity and blur of one state's content: in behind a short blur, out just before the next morph. */
export function phase(t: number, inAt: number, outAt: number): CSSProperties | null {
  const v = Math.min(prog(t, inAt, inAt + 0.28, ease.out), 1 - prog(t, outAt - 0.16, outAt, ease.in));
  if (v <= 0.001) return null;
  return { opacity: v, filter: v < 0.999 ? `blur(${(1 - v) * 8}px)` : undefined };
}

/** Content laid out for a w×h state, centred in whatever size the box has right now. */
export const Layer: React.FC<{ w: number; h: number; style: CSSProperties | null; children: ReactNode }> = ({
  w,
  h,
  style,
  children,
}) => {
  const t = useCurrentFrame() / FPS;
  const b = track(t, BOX);
  if (!style) return null;
  return (
    <div style={{ position: "absolute", left: (b.w - w) / 2, top: (b.h - h) / 2, width: w, height: h, ...style }}>
      {children}
    </div>
  );
};

export const Box: React.FC<{ children: ReactNode }> = ({ children }) => {
  const t = useCurrentFrame() / FPS;
  if (t < 1.6) return null;
  const b = track(t, BOX);
  return (
    <div
      style={{
        position: "absolute",
        left: b.x - b.w / 2,
        top: b.y - b.h / 2,
        width: b.w,
        height: b.h,
        borderRadius: b.r,
        background: b.fill,
        boxShadow: SHADOW,
        overflow: "hidden",
      }}
    >
      {children}
    </div>
  );
};
