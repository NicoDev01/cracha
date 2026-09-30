import React from "react";
import cues from "./cues.json";
import script from "./vo-script.json";
import { C, FONT, H, W, ease, prog } from "./theme";

// The script spells the brand the way the voice should say it; the screen spells it right.
const TEXT = Object.fromEntries(script.lines.map((l) => [l.id, l.text.replace(/Kratscha/g, "CraCha")]));

/** One caption line per voice line, below the picture; split lines build up sentence by sentence. */
export const Captions: React.FC<{ t: number }> = ({ t }) => {
  const line = cues.vo.find((v) => t >= v.at - 0.05 && t < v.at + v.dur + 0.25);
  if (!line) return null;
  let text = TEXT[line.id];
  if ("split" in line && line.split) {
    const parts = text.split(/(?<=\.)\s/);
    const shown = 1 + line.split.filter((s) => t >= line.at + s - 0.05).length;
    text = parts.slice(0, shown).join(" ");
  }
  const p = Math.min(prog(t, line.at - 0.05, line.at + 0.2, ease.out), 1 - prog(t, line.at + line.dur + 0.05, line.at + line.dur + 0.25));
  return (
    <div style={{ position: "absolute", left: 0, width: W, top: H - 140, display: "flex", justifyContent: "center" }}>
      <div
        style={{
          fontFamily: FONT,
          fontSize: 38,
          fontWeight: 600,
          color: C.ink,
          background: "rgba(255,255,255,0.82)",
          borderRadius: 30,
          padding: "12px 30px",
          opacity: p,
          transform: `translateY(${(1 - p) * 14}px)`,
          filter: `blur(${(1 - p) * 6}px)`,
        }}
      >
        {text}
      </div>
    </div>
  );
};
