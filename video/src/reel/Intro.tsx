import React from "react";
import { Sentence } from "./Sentence";
import { C, FONT, T, W, ease, lerp, prog, shadow, springAt } from "./theme";

/** Centres its child horizontally on the world's x = 0, vertically on `y`. */
export const Row: React.FC<{ y: number; children: React.ReactNode }> = ({ y, children }) => (
  <div
    style={{
      position: "absolute",
      left: -W / 2,
      width: W,
      top: y,
      display: "flex",
      justifyContent: "center",
      transform: "translateY(-50%)",
    }}
  >
    {children}
  </div>
);

// Tabs that pile up around the sentence, three per "klickst".
const LABELS = ["Start", "Hilfe", "FAQ", "Konto", "Preise", "Kontakt", "Downloads", "Support", "Einstellungen"];
const DOTS = ["#f59e0b", "#60a5fa", "#a78bfa", "#34d399", "#f472b6", "#fb923c", "#38bdf8", "#c084fc", "#94a3b8"];
const TABS = LABELS.map((label, i) => {
  // Each burst of three spreads round the whole ellipse.
  const slot = (i % 3) * 3 + Math.floor(i / 3);
  const a = -Math.PI / 2 + (slot / LABELS.length) * Math.PI * 2 + 0.35;
  return {
    label,
    dot: DOTS[i],
    x: Math.cos(a) * 730,
    y: Math.sin(a) * 330,
    rot: ((i * 37) % 13) - 6,
    at: T.tabs[Math.floor(i / 3)] + (i % 3) * 0.09,
  };
});

/** Problem: the hunt through a website, told by the voice and a growing pile of tabs. */
export const Intro: React.FC<{ t: number }> = ({ t }) => {
  if (t > T.nichtsOut + 0.5) return null;
  // On "nichts" the tabs drift apart and dissolve.
  const gone = prog(t, T.nichts, T.nichts + 0.5, ease.in);
  return (
    <>
      <Row y={0}>
        <Sentence t={t} id="hook" keys={["Info"]} out={T.hookOut} maxWidth={1300} align="center" />
      </Row>
      <Row y={0}>
        <Sentence t={t} id="klick" keys={["klickst"]} out={T.klickOut} maxWidth={1100} align="center" />
      </Row>
      <Row y={0}>
        <Sentence t={t} id="nichts" keys={["nichts"]} out={T.nichtsOut} maxWidth={1300} align="center" />
      </Row>
      {gone < 1 &&
        TABS.map((tab, i) => {
          const pop = springAt(t, tab.at, 11, 0.5);
          if (pop <= 0) return null;
          const drift = Math.sin(t * 1.3 + i) * 6;
          const push = lerp(1, 1.18, gone);
          return (
            <div
              key={i}
              style={{
                position: "absolute",
                left: tab.x * push,
                top: tab.y * push + drift,
                transform: `translate(-50%, -50%) rotate(${tab.rot}deg) scale(${pop})`,
                opacity: 1 - gone,
                filter: gone > 0 ? `blur(${gone * 10}px)` : undefined,
                height: 70,
                padding: "0 28px",
                borderRadius: 35,
                background: C.white,
                boxShadow: shadow(0.8),
                display: "flex",
                alignItems: "center",
                gap: 14,
                fontFamily: FONT,
                fontSize: 30,
                fontWeight: 600,
                color: C.ink,
                whiteSpace: "nowrap",
              }}
            >
              <div style={{ width: 18, height: 18, borderRadius: 9, background: tab.dot }} />
              {tab.label}
              <span style={{ color: "#c4bdb6", marginLeft: 6, fontWeight: 500 }}>×</span>
            </div>
          );
        })}
    </>
  );
};
