import { Check, Globe } from "lucide-react";
import React from "react";
import { AbsoluteFill, interpolateColors } from "remotion";
import { LOGO_LETTERS, LOGO_VIEWBOX } from "../logo-paths";
import { Dot, Pointer, Ring, SHADOW_SOFT, SHADOW_TINY, Tile } from "./kit";
import { CX, CY, K, P, SITE, clamp01, ez, lerp, pressAt, prog, rnd, sp, ui, useT, zoom } from "./look";

const RV = K.reveal;
const U = K.url;
const C = K.crawl;

// --- Reveal: the dot becomes the wordmark, the wordmark squashes back into a dot.

const LOGO_W = 820;
const LOGO_H = (LOGO_W * 19.6) / 80.7;

export const Reveal: React.FC = () => {
  const t = useT();
  if (t < RV.logo - 0.05 || t >= U.pill + 0.05) return null;
  const burst = prog(t, RV.logo, RV.logo + 0.3, ez.out);
  const squash = prog(t, RV.collapse, RV.collapse + 0.22, ez.in);
  const push = prog(t, RV.logo + 0.4, RV.collapse, (x) => x);
  const dot = prog(t, RV.collapse + 0.15, RV.collapse + 0.25, ez.out);
  return (
    <AbsoluteFill>
      <Dot scale={1 - burst} size={22} color={P.accent} />
      <Ring x={CX} y={CY} at={RV.logo} size={700} dur={0.8} width={2} />
      <svg
        viewBox={LOGO_VIEWBOX}
        width={LOGO_W}
        height={LOGO_H}
        style={{
          position: "absolute",
          left: CX - LOGO_W / 2,
          top: CY - LOGO_H / 2,
          overflow: "visible",
          transform: `scale(${(1 + push * 0.05) * (1 - squash)}, ${(1 + push * 0.05) * (1 - squash * 0.6)})`,
        }}
      >
        {LOGO_LETTERS.map((d, i) => {
          const p = sp(t, RV.logo + 0.05 + i * 0.045, 13, 200, 0.7);
          return <path key={i} d={d} fill={P.ink} opacity={clamp01(p * 2)} transform={`translate(0 ${(1 - p) * 8})`} />;
        })}
      </svg>
      <Dot scale={dot} color={P.ink} size={26} />
    </AbsoluteFill>
  );
};

// --- URL input -------------------------------------------------------------

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
  const content = clamp01((t - U.pill - 0.15) / 0.2) * (1 - prog(t, C.root - 0.15, C.root, ez.out));
  const typed = SITE.slice(0, Math.round(prog(t, U.typeStart, U.typeEnd, (x) => x) * SITE.length));
  const caret = Math.floor(t * 4) % 2 === 0 || (t > U.typeStart && t < U.typeEnd);
  const btn = sp(t, U.pill + 0.25, 12, 200);
  const press = pressAt(t, U.click);
  const move = prog(t, U.typeStart, U.click - 0.12, ez.inOut);
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
        x={lerp(1580, BUTTON.cx + 40, move)}
        y={lerp(1020, BUTTON.cy + 12, move)}
        opacity={prog(t, U.typeStart, U.typeStart + 0.15, ez.out) * (1 - prog(t, U.click + 0.2, C.root, ez.out))}
        press={press}
      />
    </>
  );
};

// --- Crawl -----------------------------------------------------------------

const RINGS = [
  { n: 8, r: 190 },
  { n: 14, r: 340 },
  { n: 20, r: 490 },
  { n: 26, r: 640 },
];
const fit = (r: number) => Math.min(1700 / (2 * (1.5 * r + TW / 2)), 880 / (2 * (0.82 * r + TH / 2)));

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
    NODES.push({ x, y, px, py, at: C.rings[k] + (j / ring.n) * 0.4, ring: k, seed: j * 11 + k });
  }
});

const camZoom = (t: number) => {
  let z = ROOT_Z;
  RINGS.forEach((ring, k) => {
    z = zoom(z, fit(ring.r), prog(t, C.rings[k] - 0.2, C.rings[k] + 0.45, ez.inOut));
  });
  return zoom(z, 1.7, prog(t, C.stack + 0.3, C.stack + 0.75, ez.inOut));
};

/** Where the knowledge base sits, in screen space. */
export const BASE = { cx: CX, cy: CY - 60 };

export const Crawl: React.FC = () => {
  const t = useT();
  if (t < C.root || t >= K.chat.input + 0.5) return null;
  const z = camZoom(t);
  const gather = (n: Node) => prog(t, C.stack + (3 - n.ring) * 0.05, C.stack + 0.4 + (3 - n.ring) * 0.03, ez.in);
  const lift = prog(t, C.stack, C.stack + 0.5, ez.inOut);
  const stack = sp(t, C.stack + 0.35, 13, 180);
  const ready = sp(t, C.ready, 12, 200);
  const leave = prog(t, K.chat.input, K.chat.input + 0.35, ez.inOut);
  return (
    <AbsoluteFill>
      <div
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          transformOrigin: "0 0",
          transform: `translate(${CX}px, ${lerp(CY, BASE.cy, lift)}px) scale(${z})`,
          opacity: 1 - leave,
        }}
      >
        <svg style={{ position: "absolute", left: -2000, top: -2000, overflow: "visible" }} width={4000} height={4000}>
          {NODES.map((n, i) => {
            const p = prog(t, n.at, n.at + 0.3, ez.out);
            if (p <= 0) return null;
            return (
              <line
                key={i}
                x1={n.px + 2000}
                y1={n.py + 2000}
                x2={lerp(n.px, n.x, p) + 2000}
                y2={lerp(n.py, n.y, p) + 2000}
                stroke="#e4ddd6"
                strokeWidth={1.6 / z}
                opacity={1 - gather(n)}
              />
            );
          })}
        </svg>
        {NODES.map((n, i) => {
          const land = sp(t, n.at, 14, 190, 0.7);
          if (land <= 0) return null;
          const g = gather(n);
          if (g >= 1) return null;
          const x = lerp(lerp(n.px, n.x, land), 0, g);
          const y = lerp(lerp(n.py, n.y, land), 0, g);
          const read = prog(t, n.at + 0.25, n.at + 0.45, ez.out) - 0.6 * prog(t, n.at + 0.6, n.at + 1.0, ez.out);
          const check = sp(t, n.at + 0.4, 12, 220);
          return (
            <div key={i} style={{ position: "absolute", left: x - TW / 2, top: y - TH / 2, width: TW, height: TH, transform: `scale(${(0.3 + 0.7 * land) * (1 - g * 0.7)})`, opacity: 1 - g }}>
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
                  transform: `scale(${check})`,
                }}
              >
                <Check size={14} color="white" strokeWidth={3.4} />
              </div>
            </div>
          );
        })}
        {/* Root page, and the stack it all becomes. */}
        {[3, 2, 1, 0].map((k) => {
          const s = k === 0 ? 1 : stack;
          if (s <= 0.01) return null;
          return (
            <div
              key={k}
              style={{
                position: "absolute",
                left: -TW / 2 + k * 6 * s,
                top: -TH / 2 - k * 14 * s,
                width: TW,
                height: TH,
                opacity: k === 0 ? prog(t, C.root + 0.05, C.root + 0.2, ez.out) : s,
                transform: `scale(${1 - k * 0.05})`,
              }}
            >
              <Tile w={TW} h={TH} seed={k * 3} hot={k === 0 && t < C.stack} title={k === 0 ? "Start" : undefined} />
            </div>
          );
        })}
      </div>
      {ready > 0 ? (
        <div
          style={{
            position: "absolute",
            left: CX - 290,
            top: CY + 130,
            width: 580,
            height: 96,
            borderRadius: 48,
            background: P.card,
            boxShadow: SHADOW_TINY,
            outline: `1.5px solid ${P.line}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 18,
            fontFamily: ui,
            fontSize: 34,
            fontWeight: 600,
            color: P.ink,
            opacity: 1 - leave,
            transform: `translateY(${leave * 260}px) scale(${ready})`,
          }}
        >
          <div style={{ width: 50, height: 50, borderRadius: 25, background: P.accent, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Check size={30} color="white" strokeWidth={3.2} />
          </div>
          Wissensbasis bereit
        </div>
      ) : null}
      <Ring x={CX} y={CY + 178} at={C.ready} size={640} width={2} dur={0.7} />
    </AbsoluteFill>
  );
};
