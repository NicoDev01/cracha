import { Check } from "lucide-react";
import { interpolateColors, useCurrentFrame } from "remotion";
import { PageContent, ScanBand } from "../PageCard";
import { C, FPS, SHADOW_SM, ease, lerp, prog, ui } from "../theme";
import { DB_POS, ROOT_BIG, ROOT_SMALL } from "./layout";
import { E } from "./timeline";

// The start page is the morphing box; from it the crawler walks down three
// more levels, each page smaller than its parent, until every leaf is read.

type Parent = { x: number; y: number; h: number };
type Node = { x: number; y: number; w: number; h: number; level: 1 | 2 | 3; url?: string; parent: Parent; at: number };

const ROOT: Parent = { x: ROOT_SMALL.cx, y: ROOT_SMALL.cy, h: ROOT_SMALL.h };
const LEVEL_Y = [0, 548, 710, 856];
const SIZE = [{ w: 0, h: 0 }, { w: 150, h: 94 }, { w: 84, h: 56 }, { w: 42, h: 30 }];
const L1 = [
  { dx: -540, url: "/produkte" },
  { dx: -180, url: "/preise" },
  { dx: 180, url: "/service" },
  { dx: 540, url: "/blog" },
];
/** Pages on the deepest level under each second-level page. */
const LEAVES = [
  [2, 1, 2],
  [1, 2, 2],
  [2, 2, 1],
  [2, 1, 2],
];
const EDGE = 0.4;

const NODES: Node[] = (() => {
  const nodes: Node[] = [];
  L1.forEach((l, i) => {
    const at1 = E.tree + i * 0.12 + EDGE;
    const p1 = { x: ROOT.x + l.dx, y: LEVEL_Y[1], ...SIZE[1] };
    nodes.push({ ...p1, level: 1, url: l.url, parent: ROOT, at: at1 });
    [-105, 0, 105].forEach((dx, j) => {
      const at2 = at1 + 0.2 + j * 0.09 + EDGE;
      const p2 = { x: p1.x + dx, y: LEVEL_Y[2], ...SIZE[2] };
      nodes.push({ ...p2, level: 2, parent: p1, at: at2 });
      const offsets = LEAVES[i][j] === 1 ? [0] : [-25, 25];
      offsets.forEach((dx3, m) => {
        nodes.push({ x: p2.x + dx3, y: LEVEL_Y[3], ...SIZE[3], level: 3, parent: p2, at: at2 + 0.15 + m * 0.07 + EDGE });
      });
    });
  });
  return nodes;
})();

// Deepest pages go first, so the tree drains into the knowledge base from the bottom up.
const RANK = (() => {
  const order = NODES.map((n, i) => ({ i, key: -n.level * 100 + n.x / 100 })).sort((a, b) => a.key - b.key);
  const rank: number[] = [];
  order.forEach((o, r) => (rank[o.i] = r));
  return rank;
})();
const STAGGER = 0.022;
const convergeStart = (i: number) => E.converge + RANK[i] * STAGGER;
/** When the start page, last of all, flies into the knowledge base. */
export const ROOT_FLY = E.converge + NODES.length * STAGGER + 0.1;

const ends = (n: Node) => {
  const y0 = n.parent.y + n.parent.h / 2;
  const y1 = n.y - n.h / 2;
  return { y0, y1, my: (y0 + y1) / 2 };
};

const edgePath = (n: Node) => {
  const { y0, y1, my } = ends(n);
  return `M ${n.parent.x} ${y0} C ${n.parent.x} ${my}, ${n.x} ${my}, ${n.x} ${y1}`;
};

const bezierPoint = (n: Node, p: number) => {
  const { y0, y1, my } = ends(n);
  const u = 1 - p;
  return {
    x: (u * u * u + 3 * u * u * p) * n.parent.x + (3 * u * p * p + p * p * p) * n.x,
    y: u * u * u * y0 + 3 * u * u * p * my + 3 * u * p * p * my + p * p * p * y1,
  };
};

/** "Liest die Startseite …" under the start page while it is scanned. */
const ScanChip: React.FC<{ t: number }> = ({ t }) => {
  const p = prog(t, E.scan - 0.1, E.scan + 0.35, ease.back) * (1 - prog(t, E.shrink - 0.2, E.shrink + 0.1, ease.in));
  if (p <= 0) return null;
  return (
    <div
      style={{
        position: "absolute",
        left: ROOT_BIG.cx - 250,
        width: 500,
        top: ROOT_BIG.cy + ROOT_BIG.h / 2 + 30,
        display: "flex",
        justifyContent: "center",
        opacity: Math.min(1, p * 1.4),
        transform: `translateY(${(1 - p) * -16}px)`,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          padding: "12px 24px",
          borderRadius: 40,
          background: "rgba(255,255,255,0.9)",
          boxShadow: SHADOW_SM,
          fontFamily: ui,
          fontSize: 24,
          fontWeight: 600,
          color: C.text,
        }}
      >
        <div
          style={{
            width: 20,
            height: 20,
            borderRadius: 20,
            border: `3px solid ${C.orange}33`,
            borderTopColor: C.orange,
            transform: `rotate(${t * 540}deg)`,
          }}
        />
        Liest die Startseite …
      </div>
    </div>
  );
};

export const Crawl: React.FC = () => {
  const t = useCurrentFrame() / FPS;
  if (t < E.scan - 0.2 || t > ROOT_FLY + 0.2) return null;

  const edgesOut = prog(t, E.converge - 0.2, E.converge + 0.3, ease.in);

  return (
    <>
      <ScanChip t={t} />

      <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, opacity: 1 - edgesOut }}>
        {NODES.map((n, i) => {
          const p = prog(t, n.at - EDGE, n.at, ease.inOut);
          if (p <= 0) return null;
          const head = bezierPoint(n, p);
          const r = n.level === 3 ? 4 : 6;
          return (
            <g key={i}>
              <path
                d={edgePath(n)}
                pathLength={1}
                fill="none"
                stroke={`${C.orange}55`}
                strokeWidth={n.level === 3 ? 1.8 : 2.5}
                strokeLinecap="round"
                strokeDasharray="1 1"
                strokeDashoffset={1 - p}
              />
              {p < 1 ? <circle cx={head.x} cy={head.y} r={r} fill={C.orange} /> : null}
              {p < 1 ? <circle cx={head.x} cy={head.y} r={r * 2.3} fill={`${C.orange}30`} /> : null}
            </g>
          );
        })}
      </svg>

      {NODES.map((n, i) => {
        const pop = prog(t, n.at - 0.05, n.at + 0.5, ease.back);
        if (pop <= 0) return null;
        const scan = prog(t, n.at + 0.15, n.at + 0.7, ease.inOut);
        const check = prog(t, n.at + 0.7, n.at + 1.05, ease.back);

        // Flying into the knowledge base, each page turns into an indexed chunk.
        const c0 = convergeStart(i);
        const fly = prog(t, c0, c0 + 0.75, ease.inOut);
        const x = lerp(n.x, DB_POS.x, fly);
        const y = lerp(n.y, DB_POS.y - 60, fly) - Math.sin(fly * Math.PI) * 50;
        const w = lerp(n.w, 64, fly);
        const h = lerp(n.h, 12, fly);
        const body = prog(t, c0, c0 + 0.3, ease.out);
        const s = n.level === 1 ? 0.6 : n.level === 2 ? 0.34 : 0.2;
        const badge = n.level === 1 ? 26 : n.level === 2 ? 18 : 0;

        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: x - w / 2,
              top: y - h / 2,
              width: w,
              height: h,
              borderRadius: lerp(n.level === 1 ? 14 : n.level === 2 ? 9 : 6, 6, fly),
              background: interpolateColors(fly, [0, 0.6, 1], ["#ffffff", C.orange, C.red]),
              boxShadow: SHADOW_SM,
              outline: `1px solid ${C.line}`,
              transform: `scale(${0.5 + 0.5 * pop})`,
              opacity: Math.min(1, pop * 1.5) * (1 - prog(t, c0 + 0.6, c0 + 0.75, ease.linear)),
            }}
          >
            <div style={{ position: "absolute", inset: 0, overflow: "hidden", borderRadius: "inherit", opacity: 1 - body }}>
              <PageContent w={n.w} h={n.h} url={n.url} s={s} />
              {scan > 0 && scan < 1 ? (
                <ScanBand pos={scan} dir={1} top={0} height={n.h} strength={Math.min(1, scan * 6, (1 - scan) * 6)} />
              ) : null}
            </div>
            {badge ? (
              <div
                style={{
                  position: "absolute",
                  right: -badge / 3,
                  top: -badge / 3,
                  width: badge,
                  height: badge,
                  borderRadius: badge,
                  background: C.green,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  transform: `scale(${check * (1 - body)})`,
                  boxShadow: "0 4px 10px -2px rgba(34,197,94,0.5)",
                }}
              >
                <Check size={badge * 0.6} color="white" strokeWidth={3.5} />
              </div>
            ) : null}
          </div>
        );
      })}
    </>
  );
};
