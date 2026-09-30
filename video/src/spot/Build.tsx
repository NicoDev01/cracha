import { Check, Globe } from "lucide-react";
import React from "react";
import { AbsoluteFill, interpolateColors } from "remotion";
import { Pointer, Ring, SHADOW_SOFT, Tile } from "../ad/kit";
import { LogoMorph } from "../ad/LogoMorph";
import { CX, CY, P, SITE, clamp01, ez, lerp, pressAt, prog, rnd, sp, ui, useT, zoom } from "../ad/look";
import { DB, Database } from "../ad/Solution";
import K from "./cues.json";

const RV = K.reveal;
const U = K.url;
const C = K.crawl;

// --- Reveal: the black dot morphs into the wordmark and back into the dot.

export const Reveal: React.FC = () => {
  const t = useT();
  if (t < RV.logo - 0.05 || t >= U.pill + 0.05) return null;
  const grow = prog(t, RV.logo, RV.logo + 0.45, ez.inOut);
  const shrink = prog(t, RV.collapse, RV.collapse + 0.25, ez.inOut);
  const push = prog(t, RV.logo + 0.45, RV.collapse, (x) => x);
  const pop = sp(t, RV.logo + 0.3, 10, 200, 0.6);
  return (
    <AbsoluteFill>
      <Ring x={CX} y={CY} at={RV.logo + 0.1} size={760} dur={0.9} width={2} color={P.ink} />
      <div style={{ position: "absolute", inset: 0, transform: `scale(${1 + push * 0.04 + (pop - Math.min(pop, 1)) * 0.3})` }}>
        <LogoMorph cx={CX} cy={CY} width={800} p={grow * (1 - shrink)} />
      </div>
    </AbsoluteFill>
  );
};

// --- The dot becomes the URL input, the input becomes the start page. ---------

const PILL = { w: 1180, h: 128, cy: CY };
const BUTTON = { w: 330, h: 94, cx: CX + PILL.w / 2 - 17 - 165, cy: PILL.cy };
const ROOT_Z = 2.6;
const TW = 120;
const TH = 80;

export const UrlInput: React.FC = () => {
  const t = useT();
  if (t < U.pill || t >= C.root + 0.3) return null;
  const grow = prog(t, U.pill, U.pill + 0.35, ez.expo);
  const toTile = prog(t, C.root - 0.1, C.root + 0.2, ez.inOut);
  const w = lerp(lerp(26, PILL.w, grow), TW * ROOT_Z, toTile);
  const h = lerp(lerp(26, PILL.h, grow), TH * ROOT_Z, toTile);
  const content = clamp01((t - U.pill - 0.12) / 0.18) * (1 - prog(t, C.root - 0.15, C.root, ez.out));
  const typed = SITE.slice(0, Math.round(prog(t, U.typeStart, U.typeEnd, (x) => x) * SITE.length));
  const caret = Math.floor(t * 4) % 2 === 0 || (t > U.typeStart && t < U.typeEnd);
  const btn = sp(t, U.pill + 0.2, 12, 200);
  const press = pressAt(t, U.click);
  const move = prog(t, U.typeStart, U.click - 0.1, ez.inOut);
  return (
    <>
      <div
        style={{
          position: "absolute",
          left: CX - w / 2,
          top: PILL.cy - h / 2,
          width: w,
          height: h,
          borderRadius: lerp(Math.min(w, h) / 2, 10 * (TH / 100) * ROOT_Z, toTile),
          background: interpolateColors(grow, [0, 0.3], [P.ink, P.card]),
          boxShadow: grow > 0.3 ? SHADOW_SOFT : undefined,
          outline: grow > 0.3 ? `1.5px solid ${P.line}` : undefined,
          overflow: "hidden",
          fontFamily: ui,
          opacity: 1 - prog(t, C.root + 0.1, C.root + 0.3, ez.out),
        }}
      >
        <div style={{ position: "absolute", left: 40, top: 0, height: PILL.h, display: "flex", alignItems: "center", gap: 22, opacity: content }}>
          <Globe size={46} color={P.muted} strokeWidth={1.8} />
          <span style={{ fontSize: 50, fontWeight: 500, color: P.ink, letterSpacing: "-0.01em" }}>
            {typed || <span style={{ color: P.faint }}>deine-website.de</span>}
            <span style={{ display: "inline-block", width: 3, height: 50, marginLeft: 3, verticalAlign: "-8px", background: P.accent, opacity: caret && t < U.click ? 1 : 0 }} />
          </span>
        </div>
        <div
          style={{
            position: "absolute",
            left: PILL.w - 17 - BUTTON.w,
            top: (PILL.h - BUTTON.h) / 2,
            width: BUTTON.w,
            height: BUTTON.h,
            borderRadius: BUTTON.h / 2,
            background: t >= U.click ? "#c2410c" : P.accent,
            color: "white",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 34,
            fontWeight: 600,
            opacity: content,
            transform: `scale(${btn * (1 - press * 0.06)})`,
          }}
        >
          Crawl starten
        </div>
      </div>
      <Ring x={BUTTON.cx} y={BUTTON.cy} at={U.click} size={240} />
      <Pointer
        x={lerp(1560, BUTTON.cx + 40, move)}
        y={lerp(1000, BUTTON.cy + 12, move)}
        opacity={prog(t, U.typeStart, U.typeStart + 0.15, ez.out) * (1 - prog(t, U.click + 0.15, C.root, ez.out))}
        press={press}
      />
    </>
  );
};

// --- Crawl: pages grow ring by ring around the start page, then flow into the knowledge base.

const RINGS = [
  { n: 8, r: 190 },
  { n: 14, r: 340 },
  { n: 20, r: 490 },
  { n: 26, r: 640 },
];
/** Zoom at which a ring fits into the frame with a margin. */
const fit = (r: number) => Math.min(1680 / (2 * (1.5 * r + TW / 2)), 860 / (2 * (0.82 * r + TH / 2)));

type Node = { x: number; y: number; px: number; py: number; at: number; ring: number; seed: number };
const NODES: Node[] = [];
RINGS.forEach((ring, k) => {
  for (let j = 0; j < ring.n; j++) {
    const a = (j / ring.n) * Math.PI * 2 - Math.PI / 2 + k * 0.23 + (rnd(j, k + 4) - 0.5) * 0.1;
    const x = Math.cos(a) * ring.r * 1.5;
    const y = Math.sin(a) * ring.r * 0.82;
    let px = 0;
    let py = 0;
    let best = Infinity;
    for (const n of NODES) {
      if (n.ring !== k - 1) continue;
      const d = Math.hypot(n.x - x, n.y - y);
      if (d < best) {
        best = d;
        px = n.x;
        py = n.y;
      }
    }
    NODES.push({ x, y, px, py, at: C.rings[k] + (j / ring.n) * 0.3, ring: k, seed: j * 11 + k });
  }
});

const camZoom = (t: number) => {
  let z = ROOT_Z;
  RINGS.forEach((ring, k) => {
    z = zoom(z, fit(ring.r), prog(t, C.rings[k] - 0.15, C.rings[k] + 0.4, ez.inOut));
  });
  return z;
};

// Every page flows along a curve into the knowledge base, inner pages first; the last one lands on "full".
const FLOW_DUR = 0.36;
const FLOW = NODES.map((n, i) => ({ start: C.flow + (0.12 + 0.55 * (n.ring / 3) + rnd(i, 9) * 0.33) * (C.full - C.flow - FLOW_DUR) }));
/** The knowledge base sits in the middle of the frame. */
export const DB_TOP = CY - (DB.disk + DB.layer * 3) / 2;
export const DB_H = DB.disk + DB.layer * 3;

export const Crawl: React.FC = () => {
  const t = useT();
  if (t < C.root || t >= K.chat.input + 0.2) return null;
  const z = camZoom(t);
  const dbIn = sp(t, C.flow - 0.05, 12, 180);
  const dbOut = prog(t, K.chat.input, K.chat.input + 0.14, ez.out);
  const absorbed = FLOW.filter((f) => t >= f.start + FLOW_DUR).length / FLOW.length;
  const bump = Math.max(0, ...FLOW.map((f) => 1 - Math.abs(t - (f.start + FLOW_DUR)) / 0.08));
  const rootOut = prog(t, C.flow - 0.1, C.flow + 0.15, ez.in);
  const lineFade = prog(t, C.flow, C.flow + 0.4, ez.out);
  const check = sp(t, C.full, 11, 220);
  return (
    <AbsoluteFill>
      <div style={{ position: "absolute", left: 0, top: 0, transformOrigin: "0 0", transform: `translate(${CX}px, ${CY}px) scale(${z})` }}>
        <svg style={{ position: "absolute", left: -2000, top: -2000, overflow: "visible" }} width={4000} height={4000}>
          {NODES.map((n, i) => {
            const p = prog(t, n.at, n.at + 0.25, ez.out);
            if (p <= 0) return null;
            return (
              <line
                key={i}
                x1={n.px + 2000}
                y1={n.py + 2000}
                x2={lerp(n.px, n.x, p) + 2000}
                y2={lerp(n.py, n.y, p) + 2000}
                stroke="#d9d1c9"
                strokeWidth={1.8 / z}
                opacity={1 - lineFade}
              />
            );
          })}
        </svg>
        {NODES.map((n, i) => {
          const land = sp(t, n.at, 14, 190, 0.7);
          if (land <= 0 || t >= FLOW[i].start) return null;
          const read = prog(t, n.at + 0.2, n.at + 0.4, ez.out) - 0.6 * prog(t, n.at + 0.5, n.at + 0.9, ez.out);
          const ok = sp(t, n.at + 0.3, 12, 220);
          return (
            <div key={i} style={{ position: "absolute", left: lerp(n.px, n.x, land) - TW / 2, top: lerp(n.py, n.y, land) - TH / 2, width: TW, height: TH, transform: `scale(${0.3 + 0.7 * land})` }}>
              <Tile w={TW} h={TH} seed={n.seed} read={read} />
              <div
                style={{
                  position: "absolute",
                  right: -9,
                  top: -9,
                  width: 22,
                  height: 22,
                  borderRadius: 11,
                  background: P.accent,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  transform: `scale(${ok})`,
                }}
              >
                <Check size={14} color="white" strokeWidth={3.4} />
              </div>
            </div>
          );
        })}
        {rootOut < 1 ? (
          <div style={{ position: "absolute", left: -TW / 2, top: -TH / 2, width: TW, height: TH, opacity: prog(t, C.root + 0.05, C.root + 0.2, ez.out), transform: `scale(${1 - rootOut})` }}>
            <Tile w={TW} h={TH} seed={3} hot title="Start" />
          </div>
        ) : null}
      </div>
      {/* The knowledge base, and the pages streaming into it. */}
      {dbIn > 0 && dbOut < 1 ? (
        <div style={{ position: "absolute", left: CX - DB.w / 2, top: DB_TOP, transform: `scale(${dbIn})`, transformOrigin: "50% 60%", opacity: 1 - dbOut }}>
          <Database fill={absorbed} bump={bump} />
          <div
            style={{
              position: "absolute",
              right: -34,
              top: -30,
              width: 84,
              height: 84,
              borderRadius: 42,
              background: P.ink,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              transform: `scale(${check})`,
            }}
          >
            <Check size={48} color="white" strokeWidth={3.2} />
          </div>
        </div>
      ) : null}
      {NODES.map((n, i) => {
        const f = FLOW[i];
        const p = prog(t, f.start, f.start + FLOW_DUR, ez.in);
        if (t < f.start || p >= 1) return null;
        const sx = CX + n.x * z;
        const sy = CY + n.y * z;
        const ex = CX;
        const ey = DB_TOP + 30;
        // Control point off to the side, so the pages swirl in instead of flying straight.
        const mx = (sx + ex) / 2 - (ey - sy) * 0.45;
        const my = (sy + ey) / 2 + (ex - sx) * 0.45;
        const x = (1 - p) * (1 - p) * sx + 2 * (1 - p) * p * mx + p * p * ex;
        const y = (1 - p) * (1 - p) * sy + 2 * (1 - p) * p * my + p * p * ey;
        const s = z * (1 - 0.85 * p);
        return (
          <div key={i} style={{ position: "absolute", left: x - TW / 2, top: y - TH / 2, width: TW, height: TH, transform: `scale(${s}) rotate(${p * 90 * (i % 2 ? 1 : -1)}deg)`, opacity: 1 - p * p }}>
            <Tile w={TW} h={TH} seed={n.seed} read={1} />
          </div>
        );
      })}
      <Ring x={CX} y={CY} at={C.full} size={760} width={2} dur={0.8} />
    </AbsoluteFill>
  );
};
