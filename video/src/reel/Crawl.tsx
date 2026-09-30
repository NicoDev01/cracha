import { evolvePath } from "@remotion/paths";
import { Globe } from "lucide-react";
import React from "react";
import { Box, Check, Line, Rect, Ring, mixRect } from "./kit";
import { PILL } from "./Solution";
import { C, T, TEXT, clamp01, ease, lerp, prog, shadow, springAt } from "./theme";
import cues from "./cues.json";

export const PAGE: Rect = { x: 0, y: 0, w: 720, h: 450, r: 30 };
export const DB: Rect = { x: 0, y: 0, w: 300, h: 340, r: 56 };
const CARD = { w: 400, h: 250 };
const N = cues.pages;
const TITLES = ["Preise", "FAQ", "Kontakt", "Blog", "Konto", "Anleitungen", "Downloads", "Team", "Datenschutz", "Support", "Sicherheit", "Updates"];

// Subpages on an ellipse around the start page, first one top-left, clockwise.
const SUB = Array.from({ length: N }, (_, k) => {
  const a = -Math.PI * 0.75 + (k / N) * Math.PI * 2;
  return {
    x: Math.cos(a) * 1250,
    y: Math.sin(a) * 640,
    title: TITLES[k % TITLES.length],
    spawn: T.spawn[0] + ((T.spawn[1] - T.spawn[0]) * k) / (N - 1),
    arrive: T.gather[0] + ((T.gather[1] - T.gather[0]) * k) / (N - 1),
  };
});

/** Start page and subpage content: address, title, a few lines. */
const PageFace: React.FC<{ title: string; big?: boolean; opacity?: number }> = ({ title, big, opacity = 1 }) => (
  <div style={{ position: "absolute", inset: 0, padding: big ? 40 : 30, opacity }}>
    <div
      style={{
        height: big ? 50 : 40,
        borderRadius: 25,
        background: C.soft,
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "0 18px",
        fontSize: big ? 26 : 22,
        fontWeight: 600,
        color: C.sub,
        marginBottom: big ? 34 : 24,
        whiteSpace: "nowrap",
      }}
    >
      <Globe size={big ? 24 : 20} color={C.sub} />
      {big ? TEXT.domain : `/${title.toLowerCase()}`}
    </div>
    <div style={{ fontSize: big ? 56 : 44, fontWeight: 800, letterSpacing: "-0.03em", marginBottom: big ? 26 : 18 }}>{title}</div>
    <Line w="88%" h={big ? 16 : 14} style={{ marginBottom: 12 }} />
    <Line w="70%" h={big ? 16 : 14} style={{ marginBottom: 12 }} />
    {big && <Line w="80%" h={16} style={{ marginBottom: 12 }} />}
    {big && <Line w="45%" h={16} />}
  </div>
);

/** Three-disc database that fills orange from the bottom. */
const Database: React.FC<{ level: number; opacity: number }> = ({ level, opacity }) => {
  const top = 46;
  const bottom = 250;
  const fillY = lerp(bottom + 26, top - 26, level);
  const body = `M30,${top} V${bottom} A80,26 0 0 0 190,${bottom} V${top}`;
  return (
    <svg width={220} height={300} viewBox="0 0 220 300" style={{ position: "absolute", left: 40, top: 20, opacity }}>
      <defs>
        <clipPath id="db-fill">
          <rect x={0} y={fillY} width={220} height={300} />
        </clipPath>
      </defs>
      <g clipPath="url(#db-fill)">
        <path d={`${body} A80,26 0 0 0 30,${top} Z`} fill={C.accent} />
        <ellipse cx={110} cy={top} rx={80} ry={26} fill={C.accent} />
      </g>
      <path d={body} fill="none" stroke={C.ink} strokeWidth={9} strokeLinejoin="round" />
      <ellipse cx={110} cy={top} rx={80} ry={26} fill="none" stroke={C.ink} strokeWidth={9} />
      {[114, 182].map((y) => (
        <path key={y} d={`M30,${y} A80,26 0 0 0 190,${y}`} fill="none" stroke={C.ink} strokeWidth={9} />
      ))}
    </svg>
  );
};

/**
 * The pill grows into the start page, every subpage branches off it and gets its
 * check, then all pages fly into the database the start page has turned into.
 */
export const Crawl: React.FC<{ t: number }> = ({ t }) => {
  if (t < T.inputToPage || t >= T.dbToAsk) return null;

  const grow = prog(t, T.inputToPage, T.inputToPage + 0.5, ease.inOut);
  const toDb = prog(t, T.dbIn, T.dbIn + 0.4, ease.inOut);
  const rect = mixRect(mixRect(PILL, PAGE, grow), DB, toDb);
  const face = Math.min(prog(t, T.inputToPage + 0.35, T.inputToPage + 0.55, ease.out), 1 - prog(t, T.dbIn, T.dbIn + 0.12));
  const scan = prog(t, T.inputToPage + 0.5, T.spawn[0] + 0.2, ease.inOut);
  const lines = 1 - prog(t, T.dbIn - 0.1, T.dbIn + 0.15);
  const arrived = SUB.reduce((n, s) => n + clamp01((t - s.arrive + 0.1) / 0.2), 0);

  return (
    <>
      <svg style={{ position: "absolute", left: -2000, top: -1200, width: 4000, height: 2400, overflow: "visible" }} viewBox="-2000 -1200 4000 2400">
        {SUB.map((s, k) => {
          const d = `M0,0 Q${s.x * 0.55},${s.y * 0.05} ${s.x},${s.y}`;
          const p = prog(t, s.spawn - 0.2, s.spawn + 0.05, ease.out);
          if (p <= 0 || lines <= 0) return null;
          const ev = evolvePath(p, d);
          return (
            <path
              key={k}
              d={d}
              fill="none"
              stroke={C.accent}
              strokeWidth={6}
              strokeLinecap="round"
              strokeDasharray={ev.strokeDasharray}
              strokeDashoffset={ev.strokeDashoffset}
              opacity={0.55 * lines}
            />
          );
        })}
      </svg>
      {SUB.map((s, k) => {
        const pop = springAt(t, s.spawn);
        if (pop <= 0) return null;
        // Flight into the database on a curve, shrinking, with a short blur of speed.
        const fly = prog(t, s.arrive - 0.42, s.arrive, ease.in);
        if (fly >= 1) return null;
        const bend = 0.35 * Math.sin(fly * Math.PI);
        const x = lerp(s.x, 0, fly) - s.y * bend;
        const y = lerp(s.y, 0, fly) + s.x * bend * 0.4;
        const sc = pop * lerp(1, 0.12, fly);
        return (
          <React.Fragment key={k}>
            <Box
              x={x}
              y={y}
              w={CARD.w}
              h={CARD.h}
              r={26}
              scaleX={sc}
              scaleY={sc}
              opacity={Math.min(1, pop * 1.5) * (1 - clamp01((fly - 0.8) / 0.2))}
              style={{ filter: fly > 0.05 ? `blur(${Math.sin(fly * Math.PI) * 6}px)` : undefined }}
            >
              <PageFace title={s.title} />
            </Box>
            {fly <= 0 && <Check t={t} at={s.spawn + 0.3} x={s.x + CARD.w / 2 - 20} y={s.y - CARD.h / 2 + 20} size={72} />}
          </React.Fragment>
        );
      })}
      <Box x={rect.x} y={rect.y} w={rect.w} h={rect.h} r={rect.r} shadow={shadow()}>
        {face > 0 && (
          <div style={{ position: "absolute", left: rect.w / 2 - PAGE.w / 2, top: rect.h / 2 - PAGE.h / 2, width: PAGE.w, height: PAGE.h }}>
            <PageFace title="Start" big opacity={face} />
            {scan > 0 && scan < 1 && (
              <div
                style={{
                  position: "absolute",
                  left: 0,
                  right: 0,
                  top: scan * PAGE.h - 60,
                  height: 60,
                  background: `linear-gradient(to bottom, rgba(234,88,12,0), rgba(234,88,12,0.18))`,
                  borderBottom: `5px solid ${C.accent}`,
                }}
              />
            )}
          </div>
        )}
        <Database level={Math.min(1, arrived / N) * 0.92 + 0.08 * prog(t, T.dbCheck - 0.2, T.dbCheck)} opacity={prog(t, T.dbIn + 0.2, T.dbIn + 0.4, ease.out)} />
      </Box>
      {toDb <= 0 && <Check t={t} at={T.spawn[0] + 0.15} x={PAGE.w / 2 - 24} y={-PAGE.h / 2 + 24} size={80} />}
      <Ring t={t} at={T.dbCheck} x={0} y={0} size={700} />
      <Check t={t} at={T.dbCheck} x={DB.w / 2 - 10} y={-DB.h / 2 + 10} size={84} />
    </>
  );
};
