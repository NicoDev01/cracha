import { useCurrentFrame } from "remotion";
import { CX, CY, FPS, ease, heading, lerp, prog } from "../theme";
import { K } from "./look";

const LINES = [
  { y: CY - 90, start: 0.0, words: [{ w: "Jede" }, { w: "Website." }] },
  { y: CY + 90, start: 0.5, words: [{ w: "Deine" }, { w: "Wissensbasis.", accent: true }] },
];

/** Two lines of big type on the first beats; on beat 3 they collapse into the dot the container grows from. */
export const Hook: React.FC = () => {
  const t = useCurrentFrame() / FPS;
  const out = prog(t, 1.38, 1.7, ease.in);
  if (out >= 1) return null;
  // Beat 2: the first line steps back so the second one carries the promise.
  const dim = prog(t, 1.0, 1.25, ease.out);
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        transformOrigin: `${CX}px ${CY}px`,
        transform: `scale(${lerp(1, 0.18, out)})`,
        filter: out > 0 ? `blur(${out * 16}px)` : undefined,
        opacity: 1 - out * out,
      }}
    >
      {LINES.map((line, li) => (
        <div
          key={li}
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            top: line.y - 95,
            height: 190,
            display: "flex",
            justifyContent: "center",
            gap: 38,
            fontFamily: heading,
            fontWeight: 800,
            fontSize: 150,
            letterSpacing: "-0.035em",
            lineHeight: "190px",
            color: li === 0 ? `rgba(23,18,15,${lerp(1, 0.28, dim)})` : K.ink,
          }}
        >
          {line.words.map((word, wi) => {
            const p = prog(t, line.start + wi * 0.08, line.start + wi * 0.08 + 0.5, ease.out);
            return (
              <span key={wi} style={{ display: "inline-block", overflow: "hidden", height: 190 }}>
                <span
                  style={{
                    display: "inline-block",
                    transform: `translateY(${(1 - p) * 110}%)`,
                    color: word.accent ? K.accent : undefined,
                  }}
                >
                  {word.w}
                </span>
              </span>
            );
          })}
        </div>
      ))}
    </div>
  );
};
