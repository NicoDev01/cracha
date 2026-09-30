import { interpolateColors } from "remotion";
import { PageContent } from "../PageCard";
import { C, SHADOW_SM, lerp, ui } from "../theme";
import { rnd } from "./kit";

// A website as rings: the start page in the middle, every level of subpages
// one ring further out. The crawl draws it, the knowledge base swallows it and
// the comparison lights it up.

export type MapNode = { i: number; ring: number; x: number; y: number; r: number; theta: number; w: number; h: number; parent: number; sweep: number };

export const RADII = [0, 300, 560, 820, 1080];
export const SQUASH = 0.8;
export const SIZES = [
  { w: 220, h: 144 },
  { w: 132, h: 84 },
  { w: 90, h: 58 },
  { w: 64, h: 40 },
  { w: 46, h: 27 },
];

const angleDiff = (a: number, b: number) => Math.abs(Math.atan2(Math.sin(a - b), Math.cos(a - b)));

export const buildMap = (counts: number[], seed: number): MapNode[] => {
  const nodes: MapNode[] = [{ i: 0, ring: 0, x: 0, y: 0, r: 0, theta: 0, ...SIZES[0], parent: -1, sweep: 0 }];
  let prev = [0];
  for (let k = 1; k < counts.length; k++) {
    const n = counts[k];
    const ring: number[] = [];
    for (let j = 0; j < n; j++) {
      const theta = -Math.PI / 2 + ((j + (k % 2) * 0.5 + (rnd(j + k * 100, seed) - 0.5) * 0.35) / n) * Math.PI * 2;
      const r = RADII[k] * (1 + (rnd(j + k * 50, seed + 3) - 0.5) * 0.06);
      const parent = prev.reduce((best, p) => (angleDiff(nodes[p].theta, theta) < angleDiff(nodes[best].theta, theta) ? p : best), prev[0]);
      const sweep = (((theta + Math.PI / 2) % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2) / (Math.PI * 2);
      const i = nodes.length;
      nodes.push({ i, ring: k, x: Math.cos(theta) * r, y: Math.sin(theta) * r * SQUASH, r, theta, ...SIZES[k], parent: k === 1 ? 0 : parent, sweep });
      ring.push(i);
    }
    prev = ring;
  }
  return nodes;
};

export const MAIN = buildMap([1, 6, 16, 34, 64], 1);
/** The deep page the answer comes from: on the outermost ring, upper right. */
export const DEEP = MAIN.filter((n) => n.ring === 4).reduce((a, b) => (angleDiff(b.theta, -0.7) < angleDiff(a.theta, -0.7) ? b : a));

export type NodeState = {
  /** 0..1 pop-in (a spring may overshoot). */
  show: number;
  /** 0..1 how far the edge from the parent is drawn. */
  edge: number;
  /** 0..1 orange flash while the page is read. */
  flash: number;
  /** 0..1 lit by the comparison. */
  lit: number;
  /** 0..1 dimmed. */
  dim: number;
  /** 0..1 sucked into the centre. */
  gone: number;
};

/** Where a node is while it spirals into the centre. */
export const vortex = (n: MapNode, p: number) => {
  const r = n.r * (1 - p);
  const theta = n.theta + p * 2.6;
  return { x: Math.cos(theta) * r, y: Math.sin(theta) * r * SQUASH };
};

export const MapView: React.FC<{
  nodes: MapNode[];
  state: (n: MapNode) => NodeState;
  /** Screen position of the map centre. */
  cx: number;
  cy: number;
  scale: number;
  rotate?: number;
  /** World point that sits at (cx, cy). */
  focus?: { x: number; y: number };
  edgeOpacity?: number;
  rings?: number[];
  special?: { node: number; render: (n: MapNode) => React.ReactNode; opacity: number };
  /** Drawn in world space on top of the nodes. */
  children?: React.ReactNode;
}> = ({ nodes, state, cx, cy, scale, rotate = 0, focus = { x: 0, y: 0 }, edgeOpacity = 1, rings, special, children }) => {
  const states = nodes.map(state);
  const pos = nodes.map((n, i) => (states[i].gone > 0 ? vortex(n, states[i].gone) : { x: n.x, y: n.y }));
  return (
    <div
      style={{
        position: "absolute",
        left: cx,
        top: cy,
        transformOrigin: "0 0",
        transform: `scale(${scale}) rotate(${rotate}deg) translate(${-focus.x}px, ${-focus.y}px)`,
      }}
    >
      {rings
        ? rings.map((o, k) =>
            o > 0.001 ? (
              <div
                key={k}
                style={{
                  position: "absolute",
                  left: -RADII[k + 1],
                  top: -RADII[k + 1] * SQUASH,
                  width: RADII[k + 1] * 2,
                  height: RADII[k + 1] * 2 * SQUASH,
                  borderRadius: "50%",
                  border: `${2 / Math.max(scale, 0.3)}px dashed rgba(194, 65, 12, ${0.22 * o})`,
                  transform: `scale(${0.92 + 0.08 * o})`,
                }}
              />
            ) : null,
          )
        : null}
      <svg style={{ position: "absolute", left: 0, top: 0, overflow: "visible", opacity: edgeOpacity }} width={1} height={1}>
        {nodes.map((n, i) => {
          if (n.parent < 0) return null;
          const s = states[i];
          if (s.edge <= 0 || s.gone > 0.3) return null;
          const a = pos[n.parent];
          const b = pos[i];
          const lit = Math.max(s.lit, 0);
          const hx = a.x + (b.x - a.x) * s.edge;
          const hy = a.y + (b.y - a.y) * s.edge;
          return (
            <g key={i} opacity={(1 - s.dim * 0.6) * (1 - s.gone / 0.3)}>
              <line x1={a.x} y1={a.y} x2={hx} y2={hy} stroke={lit > 0.05 ? `rgba(234,88,12,${0.35 + lit * 0.5})` : "rgba(194,65,12,0.28)"} strokeWidth={(2.2 + lit * 1.5) / Math.max(scale, 0.35)} strokeLinecap="round" />
              {s.edge < 1 ? <circle cx={hx} cy={hy} r={5 / Math.max(scale, 0.35)} fill={C.orange} /> : null}
            </g>
          );
        })}
      </svg>
      {nodes.map((n, i) => {
        const s = states[i];
        if (s.show <= 0.001 || s.gone >= 0.97) return null;
        const p = pos[i];
        const w = lerp(n.w, 16, s.gone);
        const h = lerp(n.h, 16, s.gone);
        const heat = Math.max(s.flash, s.lit);
        const isSpecial = special && special.node === n.i;
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: p.x - w / 2,
              top: p.y - h / 2,
              width: w,
              height: h,
              borderRadius: Math.min(lerp(n.ring === 0 ? 20 : n.ring < 3 ? 12 : 7, 8, s.gone), 28 / scale),
              background: s.gone > 0 ? interpolateColors(s.gone, [0, 0.5, 1], ["#ffffff", C.orange, C.red]) : "#ffffff",
              boxShadow: scale > 1.5 ? undefined : n.ring < 3 ? SHADOW_SM : "0 4px 10px -4px rgba(90,45,20,0.25)",
              // Sub-pixel outlines round up to a device pixel before the zoom, so skip them when close up.
              outline: scale > 1.5 ? undefined : `${(1 + heat * 2) / Math.max(scale, 0.35)}px solid ${heat > 0.05 ? `rgba(234,88,12,${0.3 + heat * 0.7})` : C.line}`,
              transform: `scale(${s.show * (1 + s.flash * 0.12)}) rotate(${-rotate}deg)`,
              opacity: Math.min(1, s.show * 1.5) * (1 - s.dim * 0.6) * (s.gone > 0.85 ? (1 - s.gone) / 0.15 : 1),
              overflow: "hidden",
            }}
          >
            {s.gone < 0.4 ? (
              <div style={{ position: "absolute", inset: 0, opacity: 1 - s.gone / 0.4 }}>
                <PageContent w={n.w} h={n.h} s={n.w / 360} tint={C.orange} url={n.ring === 0 ? "kundenwebsite.de" : undefined} />
                {s.lit > 0 ? <div style={{ position: "absolute", inset: 0, background: `rgba(251,146,60,${s.lit * 0.28})` }} /> : null}
              </div>
            ) : null}
            {isSpecial && special.opacity > 0 ? <div style={{ position: "absolute", inset: 0, opacity: special.opacity }}>{special.render(n)}</div> : null}
          </div>
        );
      })}
      {children}
    </div>
  );
};

/** A pill label drawn in world space that keeps its screen size. */
export const RingLabel: React.FC<{ text: string; x: number; y: number; scale: number; opacity: number }> = ({ text, x, y, scale, opacity }) =>
  opacity <= 0 ? null : (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        transform: `translate(-50%, -50%) scale(${1 / scale})`,
        opacity,
        padding: "6px 16px",
        borderRadius: 20,
        background: "rgba(255,255,255,0.92)",
        boxShadow: SHADOW_SM,
        fontFamily: ui,
        fontSize: 20,
        fontWeight: 700,
        color: C.accent,
        whiteSpace: "nowrap",
      }}
    >
      {text}
    </div>
  );
