import { Check } from "lucide-react";
import { interpolateColors, useCurrentFrame } from "remotion";
import { DB_POS, ROOT_BIG, ROOT_SMALL } from "../layout";
import { PageContent, ScanBand } from "../PageCard";
import { C, FPS, GRADIENT, SHADOW_SM, ease, heading, lerp, prog, ui } from "../theme";
import { PAGES, T } from "../timeline";

type Node = { x: number; y: number; w: number; h: number; url?: string; parent: { x: number; y: number; h: number }; at: number };

const ROOT = { x: ROOT_SMALL.cx, y: ROOT_SMALL.cy, h: ROOT_SMALL.h };
const L1_Y = 625;
const L2_Y = 805;
const L1 = [
  { dx: -375, url: "/produkte" },
  { dx: -125, url: "/preise" },
  { dx: 125, url: "/hilfe" },
  { dx: 375, url: "/blog" },
];

/** The counter's column on the right half. */
const COUNTER_X = 1470;

// Root → 4 sections → 3 pages each. Each card appears when its edge arrives.
const EDGE = 0.4;
const NODES: Node[] = (() => {
  const nodes: Node[] = [];
  L1.forEach((l, i) => {
    const at = T.tree + i * 0.14 + EDGE;
    const p = { x: ROOT.x + l.dx, y: L1_Y, w: 184, h: 116, url: l.url, parent: ROOT, at };
    nodes.push(p);
    [-80, 0, 80].forEach((dx, j) => {
      nodes.push({
        x: p.x + dx,
        y: L2_Y,
        w: 70,
        h: 48,
        parent: { x: p.x, y: p.y, h: p.h },
        at: at + 0.25 + j * 0.1 + i * 0.1 + EDGE,
      });
    });
  });
  return nodes;
})();

const ends = (n: Node) => {
  const y0 = n.parent.y + n.parent.h / 2;
  const y1 = n.y - n.h / 2;
  return { y0, y1, my: (y0 + y1) / 2 };
};

const edgePath = (n: Node) => {
  const { y0, y1, my } = ends(n);
  return `M ${n.parent.x} ${y0} C ${n.parent.x} ${my}, ${n.x} ${my}, ${n.x} ${y1}`;
};

// Where the crawler dot is on its way down an edge.
const bezierPoint = (n: Node, p: number) => {
  const { y0, y1, my } = ends(n);
  const u = 1 - p;
  return {
    x: (u * u * u + 3 * u * u * p) * n.parent.x + (3 * u * p * p + p * p * p) * n.x,
    y: u * u * u * y0 + 3 * u * u * p * my + 3 * u * p * p * my + p * p * p * y1,
  };
};

// Leaves go first, so the tree drains into the database from the bottom up.
const convergeStart = (i: number) => {
  const order = NODES.length - 1 - i;
  return T.converge + (order % 5) * 0.06 + Math.floor(order / 5) * 0.09;
};

const PATHS = [
  "/produkte/sneaker-classic",
  "/preise",
  "/hilfe/versand",
  "/blog/pflege-tipps",
  "/ueber-uns",
  "/hilfe/ruecksendung",
  "/produkte/laufschuhe",
  "/kontakt",
  "/blog/neuheiten",
  "/hilfe/zahlung",
  "/karriere",
  "/produkte/wanderschuhe",
  "/filialen/berlin",
  "/hilfe/groessen",
  "/blog/interview",
  "/produkte/kinder",
  "/filialen/hamburg",
  "/newsletter",
  "/produkte/sale",
  "/hilfe/garantie",
];

// Starts fast and slows into the final number.
const countEase = (x: number) => 1 - Math.pow(1 - x, 2.2);

const fmt = (n: number) => Math.round(n).toLocaleString("de-DE");

/** Big number on the right: the part of the crawl worth remembering. */
const Counter: React.FC<{ t: number }> = ({ t }) => {
  const appear = prog(t, T.shrink + 0.2, T.shrink + 0.8, ease.out);
  const out = prog(t, T.converge - 0.2, T.converge + 0.25, ease.in);
  if (appear <= 0 || out >= 1) return null;
  const count = prog(t, T.tree, T.counted, countEase) * PAGES;
  const done = t >= T.counted;
  const pop = prog(t, T.counted, T.counted + 0.45, ease.back) - prog(t, T.counted + 0.2, T.counted + 0.6, ease.out);

  // A ticker of the URLs just found, newest on top.
  const flow = prog(t, T.tree, T.counted, countEase) * (PATHS.length - 1);
  const head = Math.floor(flow);
  const frac = flow - head;

  return (
    <div
      style={{
        position: "absolute",
        left: COUNTER_X - 300,
        width: 600,
        top: 350,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        opacity: appear * (1 - out),
        transform: `translateX(${(1 - appear) * 60}px) scale(${1 - out * 0.1})`,
        fontFamily: ui,
      }}
    >
      <div
        style={{
          fontFamily: heading,
          fontWeight: 800,
          fontSize: 170,
          lineHeight: 1,
          letterSpacing: "-0.03em",
          fontVariantNumeric: "tabular-nums",
          backgroundImage: GRADIENT,
          WebkitBackgroundClip: "text",
          backgroundClip: "text",
          color: "transparent",
          transform: `scale(${1 + pop * 0.08})`,
        }}
      >
        {fmt(count)}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 14, marginTop: 10, fontSize: 34, fontWeight: 600, color: C.text }}>
        {done ? (
          <div style={{ width: 34, height: 34, borderRadius: 20, background: C.green, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Check size={22} color="white" strokeWidth={3.5} />
          </div>
        ) : (
          <div
            style={{
              width: 28,
              height: 28,
              borderRadius: 20,
              border: `4px solid ${C.indigo}33`,
              borderTopColor: C.indigo,
              transform: `rotate(${t * 540}deg)`,
            }}
          />
        )}
        Unterseiten gefunden
      </div>
      <div style={{ position: "relative", marginTop: 34, height: 4 * 44, width: 440 }}>
        {[0, 1, 2, 3, 4].map((k) => {
          const idx = head - k;
          if (idx < 0 || t < T.tree) return null;
          const slot = k + frac;
          const o = Math.max(0, 1 - slot / 4.5);
          return (
            <div
              key={idx}
              style={{
                position: "absolute",
                left: 0,
                right: 0,
                top: slot * 44,
                display: "flex",
                justifyContent: "center",
                opacity: k === 0 ? Math.min(1, frac * 4) * o : o,
                fontSize: 23,
                fontWeight: 500,
                color: C.muted,
              }}
            >
              <span
                style={{
                  padding: "6px 16px",
                  borderRadius: 20,
                  background: "rgba(255,255,255,0.7)",
                  outline: `1px solid ${C.line}`,
                }}
              >
                {PATHS[idx % PATHS.length]}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};


/** "Scanne Seite …" under the start page while the scan runs. */
const ScanChip: React.FC<{ t: number }> = ({ t }) => {
  const p = prog(t, T.scan - 0.1, T.scan + 0.35, ease.back) * (1 - prog(t, T.shrink - 0.2, T.shrink + 0.1, ease.in));
  if (p <= 0) return null;
  return (
    <div
      style={{
        position: "absolute",
        left: ROOT_BIG.cx - 200,
        width: 400,
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
            border: `3px solid ${C.indigo}33`,
            borderTopColor: C.indigo,
            transform: `rotate(${t * 540}deg)`,
          }}
        />
        Scanne Seite …
      </div>
    </div>
  );
};

export const Crawl: React.FC = () => {
  const t = useCurrentFrame() / FPS;
  if (t < T.scan - 0.2 || t > T.converge + 1.6) return null;

  const edgesOut = prog(t, T.converge - 0.2, T.converge + 0.3, ease.in);

  return (
    <>
      <ScanChip t={t} />
      <Counter t={t} />

      <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, opacity: 1 - edgesOut }}>
        {NODES.map((n, i) => {
          const p = prog(t, n.at - EDGE, n.at, ease.inOut);
          if (p <= 0) return null;
          const head = bezierPoint(n, p);
          return (
            <g key={i}>
              <path
                d={edgePath(n)}
                pathLength={1}
                fill="none"
                stroke={`${C.indigo}55`}
                strokeWidth={2.5}
                strokeLinecap="round"
                strokeDasharray="1 1"
                strokeDashoffset={1 - p}
              />
              {p < 1 ? <circle cx={head.x} cy={head.y} r={6} fill={C.indigo} /> : null}
              {p < 1 ? <circle cx={head.x} cy={head.y} r={14} fill={`${C.indigo}30`} /> : null}
            </g>
          );
        })}
      </svg>

      {NODES.map((n, i) => {
        const pop = prog(t, n.at - 0.05, n.at + 0.5, ease.back);
        if (pop <= 0) return null;
        const small = n.w < 100;
        const scan = prog(t, n.at + 0.15, n.at + 0.75, ease.inOut);
        const check = prog(t, n.at + 0.75, n.at + 1.1, ease.back);

        // Flying into the database, each page turns into an indexed chunk.
        const c0 = convergeStart(i);
        const fly = prog(t, c0, c0 + 0.75, ease.inOut);
        const x = lerp(n.x, DB_POS.x, fly);
        const y = lerp(n.y, DB_POS.y - 60, fly) - Math.sin(fly * Math.PI) * 50;
        const w = lerp(n.w, 64, fly);
        const h = lerp(n.h, 12, fly);
        const body = prog(t, c0, c0 + 0.3, ease.out);

        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: x - w / 2,
              top: y - h / 2,
              width: w,
              height: h,
              borderRadius: lerp(small ? 10 : 14, 6, fly),
              background: interpolateColors(fly, [0, 0.6, 1], ["#ffffff", C.indigo, C.purple]),
              boxShadow: SHADOW_SM,
              outline: `1px solid ${C.line}`,
              transform: `scale(${0.5 + 0.5 * pop})`,
              opacity: Math.min(1, pop * 1.5) * (1 - prog(t, c0 + 0.6, c0 + 0.75, ease.linear)),
            }}
          >
            <div style={{ position: "absolute", inset: 0, overflow: "hidden", borderRadius: "inherit", opacity: 1 - body }}>
              <PageContent w={n.w} h={n.h} url={n.url} s={small ? 0.36 : 0.6} />
              {scan > 0 && scan < 1 ? (
                <ScanBand pos={scan} dir={1} top={0} height={n.h} strength={Math.min(1, scan * 6, (1 - scan) * 6)} />
              ) : null}
            </div>
            <div
              style={{
                position: "absolute",
                right: -8,
                top: -8,
                width: small ? 20 : 26,
                height: small ? 20 : 26,
                borderRadius: 20,
                background: C.green,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                transform: `scale(${check * (1 - body)})`,
                boxShadow: "0 4px 10px -2px rgba(34,197,94,0.5)",
              }}
            >
              <Check size={small ? 13 : 16} color="white" strokeWidth={3.5} />
            </div>
          </div>
        );
      })}
    </>
  );
};
