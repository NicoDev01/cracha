import { useCurrentFrame } from "remotion";
import { LOGO_LETTERS, LOGO_VIEWBOX } from "./logo-paths";
import { C, FPS, ease, prog } from "./theme";

/** The wordmark; letters rise in one by one and leave upwards. */
export const Logo: React.FC<{ width: number; start: number; end: number }> = ({ width, start, end }) => {
  const t = useCurrentFrame() / FPS;
  const height = (width * 19.6) / 80.7;
  return (
    <svg viewBox={LOGO_VIEWBOX} width={width} height={height} style={{ overflow: "visible" }}>
      {LOGO_LETTERS.map((d, i) => {
        const inP = prog(t, start + i * 0.06, start + i * 0.06 + 0.7, ease.back);
        const outP = prog(t, end - 0.4 + i * 0.035, end + i * 0.035, ease.in);
        const y = (1 - inP) * 14 - outP * 14;
        const opacity = Math.min(1, inP * 1.4) * (1 - outP);
        return <path key={i} d={d} fill={C.ink} opacity={opacity} transform={`translate(0 ${y})`} />;
      })}
    </svg>
  );
};
