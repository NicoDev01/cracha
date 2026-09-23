import { useCurrentFrame } from "remotion";
import { C, CX, FPS, ease, lerp, prog, ui } from "../theme";
import { T } from "../timeline";

const TARGET = { x: CX + 170, y: 612 };

/** A pointer glides onto the button and clicks it. */
export const Cursor: React.FC = () => {
  const t = useCurrentFrame() / FPS;
  const move = prog(t, T.click - 0.95, T.click - 0.1, ease.inOut);
  const vis = prog(t, T.click - 1.0, T.click - 0.8, ease.out) * (1 - prog(t, T.outro + 0.1, T.outro + 0.4, ease.in));
  if (vis <= 0) return null;
  const x = lerp(1560, TARGET.x, move);
  const y = lerp(960, TARGET.y, move) - Math.sin(move * Math.PI) * 60;
  const press = prog(t, T.click - 0.1, T.click, ease.out) - prog(t, T.click, T.click + 0.3, ease.out);
  const ripple = prog(t, T.click, T.click + 0.7, ease.out);

  return (
    <>
      {ripple > 0 && ripple < 1 ? (
        <div
          style={{
            position: "absolute",
            left: TARGET.x - 80,
            top: TARGET.y - 80,
            width: 160,
            height: 160,
            borderRadius: 100,
            border: "3px solid white",
            transform: `scale(${0.2 + ripple * 1.4})`,
            opacity: 1 - ripple,
          }}
        />
      ) : null}
      <svg
        width={44}
        height={44}
        viewBox="0 0 24 24"
        style={{
          position: "absolute",
          left: x - 6,
          top: y - 4,
          opacity: vis,
          transform: `scale(${1 - press * 0.15})`,
          filter: "drop-shadow(0 6px 10px rgba(20,20,60,0.3))",
        }}
      >
        <path d="M4 2.5 L19.5 12 L12.4 13.6 L9 20.5 Z" fill={C.ink} stroke="white" strokeWidth={1.6} strokeLinejoin="round" />
      </svg>
    </>
  );
};

/** The domain under the closing logo. */
export const Url: React.FC = () => {
  const t = useCurrentFrame() / FPS;
  const p = prog(t, T.outro + 1.6, T.outro + 2.2, ease.back);
  if (p <= 0) return null;
  return (
    <div
      style={{
        position: "absolute",
        left: CX - 300,
        width: 600,
        top: 745,
        display: "flex",
        justifyContent: "center",
        opacity: Math.min(1, p * 1.4),
        transform: `translateY(${(1 - p) * 20}px)`,
      }}
    >
      <div
        style={{
          padding: "12px 28px",
          borderRadius: 40,
          background: "rgba(255,255,255,0.8)",
          outline: `1px solid ${C.line}`,
          fontFamily: ui,
          fontSize: 28,
          fontWeight: 600,
          color: C.indigo,
        }}
      >
        cracha-app.com
      </div>
    </div>
  );
};
