import { Check, Globe } from "lucide-react";
import React from "react";
import { AbsoluteFill, interpolateColors } from "remotion";
import { Caption, MiniPage, Pointer, Ring } from "./kit";
import { CX, CY, K, P, SHADOW, SHADOW_SM, SITE, clamp01, ez, lerp, pressAt, prog, rnd, sp, ui, useT, zoom } from "./look";
import { DOT } from "./Reveal";

const U = K.url;
const C = K.crawl;

// --- URL input -------------------------------------------------------------

export const PILL = { w: 1180, h: 128, cy: CY + 20 };
const BUTTON = { w: 330, h: 94, cx: CX + PILL.w / 2 - 17 - 165, cy: PILL.cy };

export const UrlInput: React.FC = () => {
  const t = useT();
  if (t < U.pill - 0.05 || t >= C.root + 0.25) return null;
  const grow = prog(t, U.pill - 0.05, U.pill + 0.3, ez.expo);
  const toCard = prog(t, C.root - 0.05, C.root + 0.22, ez.inOut);
  const w = lerp(lerp(DOT, PILL.w, grow), 300 * 1.9, toCard);
  const h = lerp(lerp(DOT, PILL.h, grow), 200 * 1.9, toCard);
  const cy = lerp(lerp(CY, PILL.cy, grow), CY + 40, toCard);
  const content = clamp01((t - U.pill - 0.12) / 0.2) * (1 - prog(t, C.root - 0.08, C.root + 0.05, ez.out));
  const typed = SITE.slice(0, Math.round(prog(t, U.typeStart, U.typeEnd, (x) => x) * SITE.length));
  const caret = Math.floor(t * 4) % 2 === 0 || (t > U.typeStart && t < U.typeEnd);
  const btn = sp(t, U.pill + 0.2, 12, 200);
  const press = pressAt(t, U.click);
  const cursor = {
    x: lerp(1560, BUTTON.cx + 40, prog(t, U.typeStart + 0.1, U.click - 0.12, ez.inOut)),
    y: lerp(1000, BUTTON.cy + 10, prog(t, U.typeStart + 0.1, U.click - 0.12, ez.inOut)),
    o: prog(t, U.typeStart, U.typeStart + 0.15, ez.out) * (1 - prog(t, U.click + 0.2, C.root, ez.out)),
  };
  return (
    <>
      <div
        style={{
          position: "absolute",
          left: CX - w / 2,
          top: cy - h / 2,
          width: w,
          height: h,
          borderRadius: lerp(Math.min(w, h) / 2, 26, toCard),
          background: interpolateColors(grow, [0, 0.35], [P.ink, P.card]),
          boxShadow: grow > 0.3 ? SHADOW : undefined,
          overflow: "hidden",
          fontFamily: ui,
        }}
      >
        <div style={{ position: "absolute", left: 38, top: 0, height: PILL.h, display: "flex", alignItems: "center", gap: 20, opacity: content }}>
          <Globe size={46} color={P.muted} strokeWidth={1.8} />
          <span style={{ fontSize: 50, fontWeight: 500, color: P.ink, letterSpacing: "-0.01em" }}>
            {typed || <span style={{ color: P.faint }}>deine-website.de</span>}
            <span style={{ display: "inline-block", width: 3, height: 46, marginLeft: 3, verticalAlign: "-8px", background: P.accent, opacity: caret && t < U.click ? 1 : 0 }} />
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
      <Ring x={BUTTON.cx} y={BUTTON.cy} at={U.click} size={220} />
      <Pointer x={cursor.x} y={cursor.y} opacity={cursor.o} press={press} />
      <Caption text="Gib deine *Website* ein." from={U.pill + 0.05} to={C.root - 0.05} />
    </>
  );
};

// --- Crawl -----------------------------------------------------------------

const RINGS = [
  { n: 6, r: 330 },
  { n: 12, r: 600 },
  { n: 18, r: 880 },
  { n: 26, r: 1160 },
  { n: 34, r: 1440 },
];
const LABELS = ["Preise", "Hilfe", "Konto", "Produkte", "Blog", "Kontakt"];
const SUB = ["FAQ", "Anleitungen", "Tarife", "Versand", "Rechnungen", "Support", "Downloads", "Team", "News", "Status", "Formulare", "Karriere", "Updates", "Partner", "Presse", "Termine"];
const slug = (s: string) => s.toLowerCase();

type Node = { x: number; y: number; px: number; py: number; at: number; ring: number; title: string; path: string; seed: number };
export const NODES: Node[] = [];
RINGS.forEach((ring, k) => {
  for (let j = 0; j < ring.n; j++) {
    const a = (j / ring.n) * Math.PI * 2 - Math.PI / 2 + k * 0.21 + (rnd(j, k + 4) - 0.5) * 0.12;
    const r = ring.r * (1 + (rnd(j, k + 7) - 0.5) * 0.08);
    const x = Math.cos(a) * r * 1.3;
    const y = Math.sin(a) * r * 0.78;
    // Parent: the nearest node of the previous ring.
    let px = 0;
    let py = 0;
    if (k > 0) {
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
    }
    const title = k === 0 ? LABELS[j] : SUB[(j * 5 + k * 3) % SUB.length];
    const parent = k === 0 ? "" : `/${slug(LABELS[(j + k) % LABELS.length])}`;
    NODES.push({ x, y, px, py, at: C.rings[k] + (j / ring.n) * 0.42, ring: k, title, path: `${SITE}${parent}/${slug(title)}`, seed: j * 11 + k });
  }
});

const camZoom = (t: number) => {
  const pull = zoom(1.9, 0.33, prog(t, C.root, C.done, ez.inOut));
  return zoom(pull, 1, prog(t, C.stack, C.stack + 0.45, ez.inOut));
};

export const Crawl: React.FC = () => {
  const t = useT();
  if (t < C.root || t >= K.chat.open + 0.3) return null;
  const z = camZoom(t);
  const gather = (n: Node) => prog(t, C.stack + (4 - n.ring) * 0.04, C.stack + 0.4 + (4 - n.ring) * 0.02, ez.in);
  const rootIn = prog(t, C.root + 0.1, C.root + 0.25, ez.out);
  const stack = prog(t, C.stack + 0.2, C.stack + 0.5, ez.out);
  const chatMorph = prog(t, K.chat.open, K.chat.open + 0.3, ez.inOut);
  const ready = sp(t, C.ready, 11, 200);
  const shift = prog(t, C.stack, C.stack + 0.45, ez.inOut);
  return (
    <AbsoluteFill>
      <div
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          transformOrigin: "0 0",
          transform: `translate(${CX}px, ${CY + lerp(40, -30, shift)}px) scale(${z})`,
          opacity: 1 - chatMorph,
        }}
      >
        <svg style={{ position: "absolute", left: -3000, top: -2000, overflow: "visible" }} width={6000} height={4000}>
          {NODES.map((n, i) => {
            const p = prog(t, n.at, n.at + 0.3, ez.out);
            if (p <= 0) return null;
            const g = gather(n);
            return (
              <line
                key={i}
                x1={n.px + 3000}
                y1={n.py + 2000}
                x2={lerp(n.px, n.x, p) + 3000}
                y2={lerp(n.py, n.y, p) + 2000}
                stroke={P.accent}
                strokeOpacity={0.35 * (1 - g)}
                strokeWidth={2.5 / z}
              />
            );
          })}
        </svg>
        {NODES.map((n, i) => {
          const land = sp(t, n.at, 14, 190, 0.7);
          if (land <= 0) return null;
          const g = gather(n);
          const x = lerp(lerp(n.px, n.x, land), 0, g);
          const y = lerp(lerp(n.py, n.y, land), 0, g);
          const scan = prog(t, n.at + 0.2, n.at + 0.5, ez.inOut);
          const check = sp(t, n.at + 0.5, 12, 220);
          return (
            <div key={i} style={{ position: "absolute", left: x - 150, top: y - 100, width: 300, height: 200, transform: `scale(${(0.3 + 0.7 * land) * (1 - g * 0.8)})`, opacity: 1 - g }}>
              <MiniPage title={n.title} path={n.path} seed={n.seed} />
              {scan > 0 && scan < 1 ? (
                <div style={{ position: "absolute", left: 0, right: 0, top: 30 + scan * 165, height: 3, background: P.accent, boxShadow: `0 0 16px ${P.accent}` }} />
              ) : null}
              <div
                style={{
                  position: "absolute",
                  right: -14,
                  top: -14,
                  width: 40,
                  height: 40,
                  borderRadius: 20,
                  background: P.accent,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  transform: `scale(${check})`,
                  boxShadow: SHADOW_SM,
                }}
              >
                <Check size={24} color="white" strokeWidth={3.2} />
              </div>
              {n.ring === 0 ? (
                <div
                  style={{
                    position: "absolute",
                    top: 214,
                    left: -50,
                    right: -50,
                    textAlign: "center",
                    fontFamily: ui,
                    fontSize: 30,
                    fontWeight: 600,
                    color: P.muted,
                    opacity: land * (1 - prog(t, C.rings[2], C.rings[3], ez.out)),
                  }}
                >
                  /{slug(n.title)}
                </div>
              ) : null}
            </div>
          );
        })}
        <div style={{ position: "absolute", left: -150, top: -100, width: 300, height: 200, opacity: rootIn * (1 - stack) }}>
          <MiniPage title="Start" path={SITE} seed={3} hot={1} />
        </div>
      </div>
      {/* Keeps the caption readable over the page cloud. */}
      <div style={{ position: "absolute", left: 0, right: 0, top: 0, height: 300, background: `linear-gradient(${P.paper} 45%, rgba(245,240,233,0))`, opacity: 1 - chatMorph }} />
      {/* The knowledge base: pages stacked into one block. */}
      {stack > 0 ? (
        <div
          style={{
            position: "absolute",
            left: CX - 190,
            top: CY - 30 - 170,
            width: 380,
            height: 260,
            opacity: 1 - chatMorph,
            transform: `scale(${(0.6 + 0.4 * stack) * (1 - chatMorph * 0.4)})`,
          }}
        >
          {[3, 2, 1, 0].map((k) => (
            <div
              key={k}
              style={{
                position: "absolute",
                left: 40 + k * 10,
                top: 20 - k * 26 * stack,
                width: 300,
                height: 200,
                transform: `scale(${1 - k * 0.04})`,
                opacity: k === 0 ? 1 : 0.9,
              }}
            >
              <MiniPage title={["Start", "Hilfe", "Konto", "FAQ"][k]} path={SITE} seed={k * 5} />
            </div>
          ))}
        </div>
      ) : null}
      {ready > 0 ? (
        <div
          style={{
            position: "absolute",
            left: CX - 300,
            top: CY + 150,
            width: 600,
            height: 96,
            borderRadius: 48,
            background: P.card,
            boxShadow: SHADOW,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 18,
            fontFamily: ui,
            fontSize: 34,
            fontWeight: 600,
            color: P.ink,
            opacity: 1 - chatMorph,
            transform: `scale(${ready})`,
          }}
        >
          <div style={{ width: 52, height: 52, borderRadius: 26, background: P.accent, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Check size={32} color="white" strokeWidth={3.2} />
          </div>
          Wissensbasis bereit
        </div>
      ) : null}
      <Ring x={CX} y={CY + 198} at={C.ready} size={520} width={5} />
      <Caption text="CraCha liest *jede Unterseite.*" from={C.root + 0.15} to={C.stack - 0.05} />
      <Caption text="Daraus wird *deine Wissensbasis.*" from={C.stack + 0.05} to={K.chat.open} />
    </AbsoluteFill>
  );
};
