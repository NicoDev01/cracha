import { useCurrentFrame } from "remotion";
import { C, CX, FPS, GRADIENT, ease, heading, prog, ui } from "./theme";

type Word = { text: string; accent?: boolean };

/** Words rise out of a blur one after another, and leave together. */
export const Words: React.FC<{
  words: Word[];
  start: number;
  end: number;
  size: number;
  stagger?: number;
  weight?: number;
  color?: string;
  font?: string;
}> = ({ words, start, end, size, stagger = 0.07, weight = 800, color = C.ink, font = heading }) => {
  const t = useCurrentFrame() / FPS;
  const out = prog(t, end - 0.35, end, ease.in);
  return (
    <div
      style={{
        display: "flex",
        flexWrap: "wrap",
        justifyContent: "center",
        columnGap: size * 0.26,
        fontFamily: font,
        fontWeight: weight,
        fontSize: size,
        lineHeight: 1.12,
        letterSpacing: size > 40 ? "-0.025em" : "-0.005em",
        color,
      }}
    >
      {words.map((w, i) => {
        if (w.text === "|") return <div key={i} style={{ flexBasis: "100%", height: 0 }} />;
        const p = prog(t, start + i * stagger, start + i * stagger + 0.6, ease.out);
        const opacity = p * (1 - out);
        const y = (1 - p) * size * 0.45 - out * size * 0.3;
        const blur = (1 - p) * 14 + out * 10;
        return (
          <span
            key={i}
            style={{
              display: "inline-block",
              opacity,
              transform: `translateY(${y}px)`,
              filter: `blur(${blur}px)`,
              ...(w.accent
                ? { backgroundImage: GRADIENT, WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent" }
                : null),
            }}
          >
            {w.text}
          </span>
        );
      })}
    </div>
  );
};

/** Parses "Chatte mit *dem gesamten Wissen*" — starred words get the brand gradient, "|" breaks the line. */
export const words = (s: string): Word[] => {
  let accent = false;
  return s.split(" ").map((raw) => {
    let text = raw;
    const opens = text.startsWith("*");
    if (opens) text = text.slice(1);
    const closes = text.endsWith("*");
    if (closes) text = text.slice(0, -1);
    const w = { text, accent: accent || opens };
    if (opens) accent = true;
    if (closes) accent = false;
    return w;
  });
};

/** Headline and subline, centered at the top of the frame. */
export const Caption: React.FC<{ title: string; sub?: string; start: number; end: number; y?: number }> = ({
  title,
  sub,
  start,
  end,
  y = 118,
}) => {
  const t = useCurrentFrame() / FPS;
  if (t < start - 0.1 || t > end + 0.1) return null;
  return (
    <div style={{ position: "absolute", top: y, left: CX - 880, width: 1760, textAlign: "center" }}>
      <Words words={words(title)} start={start} end={end} size={66} />
      {sub ? (
        <div style={{ marginTop: 18 }}>
          <Words
            words={words(sub)}
            start={start + 0.25}
            end={end}
            size={29}
            stagger={0.025}
            weight={500}
            color={C.muted}
            font={ui}
          />
        </div>
      ) : null}
    </div>
  );
};
