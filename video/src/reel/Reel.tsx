import { CameraMotionBlur } from "@remotion/motion-blur";
import React from "react";
import { AbsoluteFill, Audio, Img, staticFile, useCurrentFrame } from "remotion";
import { Captions } from "./Captions";
import { Chat } from "./Chat";
import { Crawl } from "./Crawl";
import { End } from "./End";
import { Problem } from "./Problem";
import { Solution } from "./Solution";
import cues from "./cues.json";
import { CX, CY, FPS, H, T, W, ease, logLerp, prog } from "./theme";

// Camera zooms, one after another; each starts from where the previous one ended.
// Log-scale, so a zoom looks evenly fast. Holds are never fully still (slow push-in).
const MOVES: { from: number; to: number; z: number; fn?: (x: number) => number }[] = [
  { from: T.browserIn + 0.6, to: T.zoomOut, z: 1.03, fn: (x) => x },
  { from: T.zoomOut, to: T.zoomOut + 0.55, z: 0.58 },
  { from: T.zoomOut + 0.95, to: T.zoomOut + 1.4, z: 1 },
  { from: T.search + 0.4, to: T.collapse, z: 1.04, fn: (x) => x },
  { from: T.collapse, to: T.stop, z: 1 },
  { from: T.inputToPage + 0.45, to: T.spawn[0] + 0.1, z: 0.5 },
  { from: T.gather[1] - 0.1, to: T.dbToAsk - 0.1, z: 0.8 },
  { from: T.dbToAsk - 0.1, to: T.dbToAsk + 0.5, z: 1 },
  { from: T.sourceOpen + 0.45, to: T.collapse2, z: 1.06, fn: ease.out },
  { from: T.collapse2, to: T.collapse2 + 0.4, z: 1 },
  { from: T.logo2, to: cues.duration, z: 1.04, fn: (x) => x },
];

const zoomAt = (t: number) => {
  let z = 1;
  for (const m of MOVES) {
    if (t < m.from) break;
    z = logLerp(z, m.z, prog(t, m.from, m.to, m.fn ?? ease.inOut));
  }
  return z;
};

// Fast moments get real motion blur (several sub-frames blended).
const BLUR: [number, number][] = [
  [T.zoomOut, T.zoomOut + 0.55],
  [T.zoomOut + 0.8, T.zoomOut + 1.4],
  [T.collapse, T.stop],
  [T.drop, T.drop + 0.45],
  [T.logoToInput, T.logoToInput + 0.45],
  [T.inputToPage, T.inputToPage + 0.5],
  [T.dbIn, T.dbIn + 0.4],
  [T.dbToAsk, T.dbToAsk + 0.45],
  [T.send, T.send + 0.5],
  [T.sourceOpen, T.sourceOpen + 0.5],
  [T.collapse2, T.collapse2 + 0.42],
  [T.logo2, T.logo2 + 0.45],
];

/** The world: every scene in world coordinates, the camera looking at the origin. */
const World: React.FC = () => {
  const t = useCurrentFrame() / FPS;
  const z = zoomAt(t);
  return (
    <AbsoluteFill>
      <div style={{ position: "absolute", left: CX, top: CY, transform: `scale(${z})` }}>
        <Problem t={t} />
        <Solution t={t} />
        <Crawl t={t} />
        <Chat t={t} />
        <End t={t} />
      </div>
    </AbsoluteFill>
  );
};

/** The landing page's pastel stage, drifting slowly so it never freezes. */
const Stage: React.FC<{ t: number }> = ({ t }) => (
  <AbsoluteFill style={{ overflow: "hidden", background: "#e3e1fb" }}>
    <Img
      src={staticFile("reel/stage.webp")}
      style={{
        width: W,
        height: H,
        objectFit: "cover",
        transform: `scale(${1.08 + 0.03 * Math.sin(t * 0.25)}) translate(${Math.sin(t * 0.18) * 18}px, ${Math.cos(t * 0.15) * 12}px)`,
      }}
    />
  </AbsoluteFill>
);

export const Reel: React.FC = () => {
  const t = useCurrentFrame() / FPS;
  const blur = BLUR.some(([a, b]) => t >= a - 0.05 && t <= b + 0.05);
  return (
    <AbsoluteFill>
      <Stage t={t} />
      {blur ? (
        <CameraMotionBlur shutterAngle={200} samples={8}>
          <World />
        </CameraMotionBlur>
      ) : (
        <World />
      )}
      <Captions t={t} />
      <Audio src={staticFile("reel/mix.wav")} />
    </AbsoluteFill>
  );
};
