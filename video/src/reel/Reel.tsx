import { CameraMotionBlur } from "@remotion/motion-blur";
import React from "react";
import { AbsoluteFill, Audio, Img, staticFile, useCurrentFrame } from "remotion";
import { Intro } from "./Intro";
import { Outro } from "./Outro";
import { Product } from "./Product";
import { CX, CY, FPS, H, T, W } from "./theme";
import { Floaters } from "./ui";

// Fast moments get real motion blur (several sub-frames blended).
const BLUR: [number, number][] = [
  [T.nichts, T.nichts + 0.5],
  [T.hub, T.hub + 0.45],
  [T.gather[0] - 0.45, T.kb],
  [T.askField, T.askField + 0.45],
  [T.qUp, T.qUp + 0.4],
  [T.sourceOpen, T.sourceOpen + 0.6],
  [T.sourceOut, T.sourceOut + 0.45],
];

/** The world: every scene in world coordinates around (0, 0), the camera drifting slowly. */
const World: React.FC = () => {
  const t = useCurrentFrame() / FPS;
  // A slow breathing push-in; small enough that nothing ever reaches the frame edge.
  const z = 1.015 + 0.015 * Math.sin(t * 0.32 - 1.2);
  const dx = Math.sin(t * 0.21) * 8;
  const dy = Math.cos(t * 0.17) * 6;
  return (
    <AbsoluteFill>
      <div style={{ position: "absolute", left: CX + dx, top: CY + dy, transform: `scale(${z})` }}>
        <Intro t={t} />
        <Product t={t} />
        <Outro t={t} />
      </div>
    </AbsoluteFill>
  );
};

/** The landing page's pastel stage, drifting slowly, with soft bubbles out of focus. */
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
    <Floaters t={t} />
  </AbsoluteFill>
);

export const Reel: React.FC = () => {
  const t = useCurrentFrame() / FPS;
  const blur = BLUR.some(([a, b]) => t >= a - 0.05 && t <= b + 0.05);
  return (
    <AbsoluteFill>
      <Stage t={t} />
      {blur ? (
        <CameraMotionBlur shutterAngle={180} samples={6}>
          <World />
        </CameraMotionBlur>
      ) : (
        <World />
      )}
      <Audio src={staticFile("reel/mix.wav")} />
    </AbsoluteFill>
  );
};
