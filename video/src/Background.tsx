import { AbsoluteFill, useCurrentFrame } from "remotion";
import { FPS } from "./theme";

// Soft pastel blobs drifting on a near-white base. Radial gradients instead of
// blurred shapes: same look, far cheaper to render per frame.
const BLOBS = [
  { color: "rgba(165, 180, 252, 0.75)", x: 22, y: 28, r: 55, sx: 9, sy: 7, speed: 0.11, phase: 0 },
  { color: "rgba(216, 180, 254, 0.65)", x: 78, y: 24, r: 50, sx: 8, sy: 9, speed: 0.09, phase: 1.7 },
  { color: "rgba(186, 230, 253, 0.7)", x: 70, y: 82, r: 55, sx: 10, sy: 6, speed: 0.1, phase: 3.1 },
  { color: "rgba(251, 207, 232, 0.55)", x: 18, y: 84, r: 48, sx: 7, sy: 8, speed: 0.12, phase: 4.4 },
  { color: "rgba(199, 210, 254, 0.5)", x: 50, y: 50, r: 42, sx: 12, sy: 10, speed: 0.07, phase: 2.2 },
];

export const Background: React.FC = () => {
  const t = useCurrentFrame() / FPS;
  const layers = BLOBS.map((b) => {
    const a = t * b.speed * Math.PI * 2 + b.phase;
    const x = b.x + Math.sin(a) * b.sx;
    const y = b.y + Math.cos(a * 0.8) * b.sy;
    return `radial-gradient(circle at ${x}% ${y}%, ${b.color} 0%, rgba(255,255,255,0) ${b.r}%)`;
  });
  return (
    <AbsoluteFill style={{ background: [...layers, "#f6f6fb"].join(", ") }}>
      {/* A faint vignette keeps the eye in the middle. */}
      <AbsoluteFill
        style={{
          background: "radial-gradient(ellipse at 50% 50%, rgba(255,255,255,0.55) 0%, rgba(255,255,255,0) 60%)",
        }}
      />
    </AbsoluteFill>
  );
};
