import React from "react";
import { AbsoluteFill } from "remotion";
import { SlamLine } from "./kit";
import { CX, CY, K, P, clamp01, ez, prog, useT, wide } from "./look";

type Line = { text: string; at: number; color: string; dot?: string };
type Card = { at: number; bg: string; lines: Line[]; pulse?: number; tile?: number };

const H = K.hook.words;
const F = K.finale.words;

// One idea per beat; the background cuts with every card.
export const HOOK: Card[] = [
  { at: H[0], bg: P.accent, lines: [{ text: "WO", at: H[0], color: P.ink }] },
  { at: H[1], bg: P.ink, lines: [{ text: "STAND", at: H[1], color: P.paper }] },
  { at: H[2], bg: P.flash, lines: [{ text: "DAS", at: H[2], color: P.paper }] },
  { at: H[3], bg: P.paper, lines: [{ text: "NOCHMAL?", at: H[3], color: P.ink, dot: P.accent }], pulse: H[3] + 0.5 },
];

export const FINALE: Card[] = [
  {
    at: F[0],
    bg: P.accent,
    lines: [
      { text: "LINK", at: F[0], color: P.ink },
      { text: "REIN.", at: F[1], color: P.ink, dot: P.paper },
    ],
  },
  { at: F[2], bg: P.ink, lines: [{ text: "FRAGEN.", at: F[2], color: P.paper, dot: P.accent }], pulse: F[2] + 0.5 },
  {
    at: F[3],
    bg: P.flash,
    lines: [
      { text: "QUELLE", at: F[3], color: P.paper },
      { text: "SEHEN.", at: F[4], color: P.paper, dot: P.accent },
    ],
  },
  { at: F[5], bg: P.paper, lines: [{ text: "FERTIG.", at: F[5], color: P.ink, dot: P.accent }], tile: F[5] + 0.5 },
  {
    at: F[6],
    bg: P.ink,
    lines: [
      { text: "KOSTENLOS", at: F[6], color: P.paper },
      { text: "STARTEN.", at: F[7], color: P.accent, dot: P.paper },
    ],
    pulse: F[8],
  },
];

const fit = (lines: Line[]) => Math.min(300, 1640 / (Math.max(...lines.map((l) => l.text.length)) * 0.86));

/** Rows of outlined repeats scroll in opposite directions behind the word. */
const Tiling: React.FC<{ text: string; at: number; size: number; color: string }> = ({ text, at, size, color }) => {
  const t = useT();
  if (t < at) return null;
  const rows = [-3, -2, -1, 1, 2, 3];
  const line = Array(8).fill(text).join(" ");
  return (
    <AbsoluteFill>
      {rows.map((r) => {
        const show = prog(t, at + Math.abs(r) * 0.03, at + Math.abs(r) * 0.03 + 0.12, ez.out);
        const x = (r % 2 ? 1 : -1) * (t - at) * 900;
        return (
          <div
            key={r}
            style={{
              position: "absolute",
              left: -2000 + x,
              top: CY + r * size * 0.92 - size * 0.43,
              whiteSpace: "nowrap",
              fontSize: size,
              lineHeight: `${size * 0.86}px`,
              letterSpacing: "-0.02em",
              color: "transparent",
              WebkitTextStroke: `2.5px ${color}`,
              opacity: show * 0.8,
              ...wide(125, 900),
            }}
          >
            {line}
          </div>
        );
      })}
    </AbsoluteFill>
  );
};

/** Plays a list of cards; each holds until the next one starts or `until`. */
export const Cards: React.FC<{ cards: Card[]; until: number; zoomAt?: number }> = ({ cards, until, zoomAt }) => {
  const t = useT();
  const i = cards.reduce((found, c, k) => (t >= c.at ? k : found), -1);
  if (i < 0 || t >= until) return null;
  const card = cards[i];
  const size = fit(card.lines);
  const bump = card.pulse ? prog(t, card.pulse, card.pulse + 0.1, ez.out) - prog(t, card.pulse + 0.1, card.pulse + 0.45, ez.inOut) : 0;
  // Zoom-through: the frame dives into the last word with a speed blur.
  const z = zoomAt ? prog(t, zoomAt, until, ez.in) : 0;
  return (
    <AbsoluteFill style={{ background: card.bg }}>
      {card.tile ? <Tiling text={card.lines[0].text} at={card.tile} size={size} color={card.lines[0].color} /> : null}
      <AbsoluteFill
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: size * 0.1,
          transformOrigin: `${CX + 60}px ${CY + size * 0.5}px`,
          transform: `scale(${1 + z * z * 16})`,
          filter: z > 0.02 ? `blur(${z * 18}px)` : undefined,
          opacity: 1 - clamp01((z - 0.8) * 5),
        }}
      >
        {card.lines.map((l) => (
          <SlamLine key={l.text} text={l.text} at={l.at} size={size} color={l.color} dotColor={l.dot} wdth={125 - bump * 55} />
        ))}
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
