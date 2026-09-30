import React from "react";
import cues from "./cues.json";
import words from "./words.json";
import { C, FONT, GRADIENT, ease, lerp, prog } from "./theme";

type Word = { w: string; t: number };
const WORDS = words as Record<string, Word[]>;

/** Absolute time of each word of a voice line. */
export const wordTimes = (id: string) => {
  const line = cues.vo.find((v) => v.id === id)!;
  return WORDS[id].map((x) => ({ ...x, at: line.at + x.t, w: x.w.replace(/Kratscha/g, "CraCha") }));
};

/** Absolute time of the first word containing `match` in a voice line. */
export const wordAt = (id: string, match: string) => wordTimes(id).find((x) => x.w.includes(match))!.at;

export const SIZE = { h1: 92, h2: 66 };

/**
 * One spoken line as on-screen text: each word sharpens in at the moment the voice
 * says it; key words carry the gradient. The block leaves with a soft rise and blur.
 */
export const Sentence: React.FC<{
  t: number;
  id: string;
  size?: keyof typeof SIZE;
  keys?: string[];
  /** Seconds when the block leaves; default: never. */
  out?: number;
  /** Replaces a word by an element (e.g. the logo), same timing. */
  inline?: Record<string, React.ReactNode>;
  align?: "left" | "center";
  maxWidth?: number;
  style?: React.CSSProperties;
  /** Only show words up to this index (a line can be split over two blocks). */
  from?: number;
  to?: number;
}> = ({ t, id, size = "h1", keys = [], out, inline = {}, align = "left", maxWidth = 1400, style, from = 0, to }) => {
  const list = wordTimes(id).slice(from, to);
  if (t < list[0].at - 0.2) return null;
  const leave = out === undefined ? 0 : prog(t, out, out + 0.25, ease.inOut);
  if (leave >= 1) return null;
  return (
    <div
      style={{
        fontFamily: FONT,
        fontSize: SIZE[size],
        fontWeight: 600,
        letterSpacing: "-0.025em",
        lineHeight: 1.14,
        color: C.ink,
        textAlign: align,
        maxWidth,
        width: "fit-content",
        textWrap: "balance",
        opacity: 1 - leave,
        filter: leave > 0 ? `blur(${leave * 12}px)` : undefined,
        transform: `translateY(${-leave * 40}px)`,
        ...style,
      }}
    >
      {list.map((x, i) => {
        const p = prog(t, x.at - 0.06, x.at + 0.3, ease.out);
        const clean = x.w.replace(/[.,?!]/g, "");
        const isKey = keys.includes(clean);
        const node = inline[clean];
        return (
          <React.Fragment key={i}>
            <span
              style={{
                display: "inline-block",
                opacity: p,
                filter: p < 1 ? `blur(${(1 - p) * 10}px)` : undefined,
                transform: `translateY(${lerp(18, 0, p)}px)`,
                ...(isKey && !node
                  ? {
                      backgroundImage: GRADIENT,
                      WebkitBackgroundClip: "text",
                      backgroundClip: "text",
                      color: "transparent",
                      paddingBottom: "0.08em",
                    }
                  : {}),
              }}
            >
              {node ? (
                <>
                  {node}
                  {x.w.match(/[.,?!]+$/)?.[0]}
                </>
              ) : (
                x.w
              )}
            </span>
            {i < list.length - 1 ? " " : ""}
          </React.Fragment>
        );
      })}
    </div>
  );
};
