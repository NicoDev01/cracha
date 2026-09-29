import { useCurrentFrame } from "remotion";
import { Database } from "../scenes/Knowledge";
import { C, FPS, SHADOW_SM, ease, prog, ui } from "../theme";
import { ROOT_FLY } from "./Crawl";
import { DB_POS } from "./layout";
import { E, SITE } from "./timeline";

/** The knowledge base fills up as the pages arrive, then hands over to the chat input. */
export const Knowledge: React.FC = () => {
  const t = useCurrentFrame() / FPS;
  if (t < E.converge || t > E.chat + 0.4) return null;

  // Appears once the lower levels are on their way, so it never sits on top of the tree.
  const appear = prog(t, E.converge + 0.5, E.converge + 1.0, ease.back);
  const fill = prog(t, E.converge + 0.5, ROOT_FLY + 0.7, ease.inOut) * 3;
  const gulp = Math.sin(prog(t, E.converge + 0.4, ROOT_FLY + 0.6, ease.linear) * Math.PI * 8) * 0.02 * (fill < 3 ? 1 : 0);
  const handOff = prog(t, E.chat, E.chat + 0.3, ease.out);
  const labelIn = prog(t, ROOT_FLY + 0.6, ROOT_FLY + 1.1, ease.out) * (1 - prog(t, E.chat - 0.3, E.chat, ease.in));

  return (
    <div
      style={{
        position: "absolute",
        left: DB_POS.x - 130,
        top: DB_POS.y - 145,
        width: 260,
        transform: `scale(${(0.5 + 0.5 * appear) * (1 + gulp) * (1 - handOff * 0.1)})`,
        opacity: Math.min(1, appear * 1.5) * (1 - handOff),
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
      }}
    >
      <Database a={C.orange} b={C.red} fill={fill} id="explainer" />
      <div
        style={{
          marginTop: 22,
          opacity: labelIn,
          transform: `translateY(${(1 - labelIn) * 16}px)`,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 4,
          padding: "14px 26px",
          borderRadius: 20,
          background: "rgba(255,255,255,0.9)",
          boxShadow: SHADOW_SM,
          fontFamily: ui,
          whiteSpace: "nowrap",
        }}
      >
        <div style={{ fontSize: 26, fontWeight: 700, color: C.ink }}>{SITE}</div>
        <div style={{ fontSize: 19, fontWeight: 500, color: C.muted }}>Alle Unterseiten gelesen</div>
      </div>
    </div>
  );
};
