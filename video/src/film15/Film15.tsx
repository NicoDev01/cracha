import { useState } from "react";
import { AbsoluteFill, Audio, staticFile, useCurrentFrame } from "remotion";
import { CX, CY, FPS, ease, prog, track, type Keyframe } from "../theme";
import { Box } from "./Box";
import { CHAT, Chat } from "./Chat";
import { Cta, Metric, Wordmark } from "./Finale";
import { Hook } from "./Hook";
import { K, cues, glide } from "./look";
import { Progress, Ready } from "./Progress";
import { Setup } from "./Setup";

type Pos = { x: number; y: number; o: number };
type Cam = { s: number; fx: number; fy: number };

// A slow push while the crawl runs and a closer one on the answer, so the
// small UI type reads at full screen; back out before the next morph.
const CAMERA: Keyframe<Cam>[] = [
  { t: 0, s: 1, fx: CX, fy: CY },
  { t: 5.4, s: 1, fx: CX, fy: CY },
  { t: 7.3, s: 1.07, fx: CX, fy: CY, e: glide },
  { t: 7.7, s: 1, fx: CX, fy: CY, e: glide },
  { t: 10.3, s: 1, fx: CX, fy: CY },
  { t: 11.1, s: 1.17, fx: 900, fy: 470, e: glide },
  { t: 12.3, s: 1.19, fx: 900, fy: 470 },
  { t: 12.8, s: 1, fx: CX, fy: CY, e: glide },
];

const Camera: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const c = track(useCurrentFrame() / FPS, CAMERA);
  return (
    <AbsoluteFill style={{ transformOrigin: `${c.fx}px ${c.fy}px`, transform: `scale(${c.s})` }}>{children}</AbsoluteFill>
  );
};

const chatLeft = CX - CHAT.w / 2;
const chatTop = CY - CHAT.h / 2;

/** Every stop of the cursor; it arrives on the beat it clicks on. */
const cursorPath = (chip: { x: number; y: number }): Keyframe<Pos>[] => [
  { t: 0, x: 1420, y: 900, o: 0 },
  { t: 1.7, x: 1380, y: 860, o: 0 },
  { t: 1.85, x: 1200, y: 700, o: 1 },
  { t: 2.0, x: 700, y: 552, o: 1, e: glide },
  { t: 2.6, x: 1060, y: 610, o: 1 },
  { t: 3.0, x: 1392, y: 548, o: 1, e: glide },
  { t: 3.5, x: 1400, y: 560, o: 1 },
  { t: 4.0, x: 1424, y: 489, o: 1, e: glide },
  { t: 4.5, x: 960, y: 690, o: 1, e: glide },
  { t: 5.1, x: 1180, y: 800, o: 1, e: glide },
  { t: 7.4, x: 1240, y: 700, o: 1 },
  { t: 8.0, x: 1320, y: 544, o: 1, e: glide },
  { t: 8.5, x: 820, y: 852, o: 1, e: glide },
  { t: 9.0, x: 1180, y: 880, o: 1 },
  { t: 9.5, x: 1532, y: 850, o: 1, e: glide },
  { t: 10.6, x: 1380, y: 700, o: 1 },
  { t: 11.5, x: chatLeft + chip.x + 4, y: chatTop + chip.y + 4, o: 1, e: glide },
  { t: 12.35, x: chatLeft + chip.x + 8, y: chatTop + chip.y + 8, o: 1 },
  { t: 12.9, x: 1500, y: 960, o: 0, e: glide },
];

const Cursor: React.FC<{ chip: { x: number; y: number } }> = ({ chip }) => {
  const t = useCurrentFrame() / FPS;
  const p = track(t, cursorPath(chip));
  if (p.o <= 0) return null;
  const last = cues.clicks.filter((c) => c <= t).at(-1) ?? -9;
  const dt = t - last;
  const press = dt < 0.06 ? dt / 0.06 : dt < 0.22 ? 1 - (dt - 0.06) / 0.16 : 0;
  const ring = prog(dt, 0, 0.4, ease.out);
  return (
    <>
      {dt < 0.4 && (
        <div
          style={{
            position: "absolute",
            left: p.x - 30,
            top: p.y - 30,
            width: 60,
            height: 60,
            borderRadius: 30,
            border: `2px solid ${K.accent}`,
            transform: `scale(${0.3 + ring * 0.9})`,
            opacity: 1 - ring,
          }}
        />
      )}
      <svg
        width={44}
        height={44}
        viewBox="0 0 24 24"
        style={{
          position: "absolute",
          left: p.x - 7,
          top: p.y - 4,
          opacity: p.o,
          transform: `scale(${1 - press * 0.14})`,
          transformOrigin: "7px 4px",
          filter: "drop-shadow(0 3px 6px rgba(23,18,15,0.25))",
        }}
      >
        <path d="M5.5 3.2v16.9l4.3-4.2 2.9 6.2 2.6-1.2-2.8-6.1h6z" fill={K.ink} stroke="#fff" strokeWidth={1.4} strokeLinejoin="round" />
      </svg>
    </>
  );
};

/** Warm paper with a faint dot grid drifting slowly, so no frame stands still. */
const Stage: React.FC = () => {
  const t = useCurrentFrame() / FPS;
  return (
    <AbsoluteFill
      style={{
        background: K.stage,
        backgroundImage: `radial-gradient(${K.dot} 1.6px, transparent 1.6px)`,
        backgroundSize: "36px 36px",
        backgroundPosition: `${t * 4}px ${t * -6}px`,
      }}
    />
  );
};

export const Film15: React.FC = () => {
  // Position of citation marker 2 inside the chat, measured once it is laid out.
  const [chip, setChip] = useState({ x: 620, y: 299 });
  return (
    <AbsoluteFill>
      <Stage />
      <Hook />
      <Camera>
        <Box>
          <Setup />
          <Progress />
          <Ready />
          <Chat chip={chip} onChip={setChip} />
          <Metric />
          <Cta />
        </Box>
        <Cursor chip={chip} />
      </Camera>
      <Wordmark />
      <Audio src={staticFile("film15.wav")} />
    </AbsoluteFill>
  );
};
