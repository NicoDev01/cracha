import { Database } from "../scenes/Knowledge";
import { C, CX, CY, SHADOW_SM, heading, prog, ui } from "../theme";
import { K, clamp01, ez, rnd, sp, useT, zoom } from "./kit";
import { MAIN, MapView, RADII, RingLabel, SQUASH, type MapNode } from "./Map";

// The start page sends the crawler out ring by ring, down to the fourth level
// of subpages. Then everything spirals into one knowledge base.

export const MAP_CY = CY + 10;
export const PAGES_READ = 486;
const R = K.crawl.rings;
const B = K.base;

const nodeAt = (n: MapNode) => (n.ring === 0 ? K.crawl.root + 0.42 : R[n.ring - 1] + n.sweep * 0.55 + 0.25);
const collapseAt = (n: MapNode) => (n.ring === 0 ? B.collapse + 0.55 : B.collapse + rnd(n.i, 11) * 0.3 + (4 - n.ring) * 0.04);

const crawlState = (t: number) => (n: MapNode) => {
  const at = nodeAt(n);
  const c = collapseAt(n);
  return {
    show: n.ring === 0 ? (t >= at ? 1 : 0) : sp(t, at, 14, 230),
    edge: prog(t, at - 0.25, at, ez.soft),
    flash: t >= at ? clamp01(1 - (t - at) / 0.6) : 0,
    lit: 0,
    dim: 0,
    gone: prog(t, c, c + 0.7 + n.ring * 0.06, ez.in),
  };
};

const camera = (t: number) => {
  const out = ez.cam(prog(t, R[0], 19.5, (x) => x));
  const back = prog(t, B.collapse, B.collapse + 1.1, ez.soft);
  return {
    s: zoom(zoom(1, 0.47, out), 1, back),
    rot: 5 * out * (1 - back),
  };
};

/** Radius of the crawl wave in world units. */
const wave = (t: number) => {
  const ts = [R[0] - 0.2, ...R.slice(1), R[3] + 0.8];
  for (let k = 0; k < ts.length - 1; k++) {
    if (t < ts[k + 1]) return RADII[k] + (RADII[k + 1] - RADII[k]) * ez.soft(clamp01((t - ts[k]) / (ts[k + 1] - ts[k])));
  }
  return RADII[4];
};

export const Crawl: React.FC = () => {
  const t = useT();
  if (t < K.crawl.root + 0.4 || t > B.collapse + 1.6) return null;
  const cam = camera(t);
  const ringOn = [0, 1, 2, 3].map((k) => prog(t, R[k] - 0.1, R[k] + 0.4, ez.out) * (1 - prog(t, B.collapse - 0.2, B.collapse + 0.3, ez.in)));
  const w = wave(t);
  const waveO = prog(t, R[0] - 0.2, R[0], ez.out) * (1 - prog(t, R[3] + 0.5, R[3] + 1.0, ez.out));
  return (
    <>
      <MapView
        nodes={MAIN}
        state={crawlState(t)}
        cx={CX}
        cy={MAP_CY}
        scale={cam.s}
        rotate={cam.rot}
        rings={ringOn}
        edgeOpacity={1 - prog(t, B.collapse - 0.1, B.collapse + 0.3, ez.in)}
      >
        {waveO > 0 ? (
          <div
            style={{
              position: "absolute",
              left: -w,
              top: -w * SQUASH,
              width: w * 2,
              height: w * 2 * SQUASH,
              borderRadius: "50%",
              border: `${3 / cam.s}px solid rgba(249,115,22,${0.5 * waveO})`,
              boxShadow: `0 0 ${40 / cam.s}px rgba(249,115,22,${0.35 * waveO}), inset 0 0 ${60 / cam.s}px rgba(249,115,22,${0.18 * waveO})`,
            }}
          />
        ) : null}
        {[1, 2, 3, 4].map((k) => {
          const first = MAIN.find((n) => n.ring === k)!;
          const count = MAIN.filter((n) => n.ring === k).length;
          const a = first.theta - Math.PI / count;
          return (
            <RingLabel key={k} text={`Ebene ${k}`} x={Math.cos(a) * RADII[k]} y={Math.sin(a) * RADII[k] * SQUASH} scale={cam.s} opacity={ringOn[k - 1]} />
          );
        })}
      </MapView>
      <Counter t={t} />
    </>
  );
};

const Counter: React.FC<{ t: number }> = ({ t }) => {
  const p = sp(t, R[0], 15, 200) * (1 - prog(t, B.collapse, B.collapse + 0.3, ez.in));
  if (p <= 0.001) return null;
  const n = Math.max(1, Math.round((1 - Math.pow(1 - prog(t, R[0], K.crawl.done, (x) => x), 2.4)) * PAGES_READ));
  return (
    <div style={{ position: "absolute", left: 0, right: 0, top: 978, display: "flex", justifyContent: "center" }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 14,
          padding: "10px 26px 10px 14px",
          borderRadius: 40,
          background: "rgba(255,255,255,0.94)",
          boxShadow: SHADOW_SM,
          fontFamily: ui,
          fontSize: 24,
          fontWeight: 600,
          color: C.text,
          transform: `translateY(${(1 - p) * 40}px) scale(${0.8 + 0.2 * p})`,
          opacity: Math.min(1, p * 1.5),
        }}
      >
        <div style={{ width: 22, height: 22, borderRadius: 11, border: `3px solid ${C.orange}33`, borderTopColor: C.orange, transform: `rotate(${t * 600}deg)` }} />
        <span style={{ fontFamily: heading, fontWeight: 800, fontSize: 32, color: C.accent, fontVariantNumeric: "tabular-nums", minWidth: 66, textAlign: "right" }}>{n}</span>
        Seiten gelesen
      </div>
    </div>
  );
};

/** The knowledge base: swallows the pages, then hands over to the chat input. */
export const Knowledge: React.FC = () => {
  const t = useT();
  if (t < B.db - 0.1 || t > B.toInput + 0.6) return null;
  const pop = sp(t, B.db, 11, 160);
  const fill = prog(t, B.db + 0.15, B.collapse + 1.45, ez.soft) * 3;
  const gulp = Math.sin(prog(t, B.db, B.collapse + 1.5, (x) => x) * Math.PI * 9) * 0.025 * (fill < 3 ? 1 : 0);
  const out = prog(t, B.toInput, B.toInput + 0.35, ez.in);
  const label = sp(t, B.label, 14, 200) * (1 - prog(t, B.toInput - 0.2, B.toInput, ez.in));
  const glow = prog(t, B.collapse + 1.3, B.collapse + 1.9, ez.out);
  const spin = t * 40;
  return (
    <>
      {/* Orbit, soft glow and the database itself. */}
      <div
        style={{
          position: "absolute",
          left: CX - 330,
          top: CY - 330,
          width: 660,
          height: 660,
          borderRadius: 330,
          background: `radial-gradient(circle, rgba(251,146,60,${0.28 * glow}) 0%, rgba(251,146,60,0) 62%)`,
          opacity: 1 - out,
        }}
      />
      <div
        style={{
          position: "absolute",
          left: CX - 270,
          top: CY - 100,
          width: 540,
          height: 200,
          borderRadius: "50%",
          border: `2px dashed rgba(194,65,12,${0.3 * glow})`,
          transform: `rotate(${spin * 0.1}deg) scale(${0.8 + 0.2 * glow})`,
          opacity: 1 - out,
        }}
      >
        {[0, 1, 2].map((k) => {
          const a = (spin / 40) * 1.4 + (k * Math.PI * 2) / 3;
          return (
            <div
              key={k}
              style={{ position: "absolute", left: 270 + Math.cos(a) * 270 - 7, top: 100 + Math.sin(a) * 100 - 7, width: 14, height: 14, borderRadius: 7, background: C.orange, opacity: glow }}
            />
          );
        })}
      </div>
      <div
        style={{
          position: "absolute",
          left: CX - 130,
          top: CY - 160,
          width: 260,
          transform: `scale(${1.25 * pop * (1 + gulp) * (1 - out * 0.7)})`,
          opacity: Math.min(1, pop * 2) * (1 - out),
        }}
      >
        <Database a={C.orange} b={C.red} fill={fill} id="kb" />
      </div>
      <div style={{ position: "absolute", left: 0, right: 0, top: CY + 240, display: "flex", justifyContent: "center" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            padding: "12px 26px",
            borderRadius: 30,
            background: "rgba(255,255,255,0.94)",
            boxShadow: SHADOW_SM,
            fontFamily: ui,
            fontSize: 24,
            fontWeight: 600,
            color: C.text,
            opacity: Math.min(1, label * 1.5),
            transform: `translateY(${(1 - label) * 30}px)`,
          }}
        >
          kundenwebsite.de
          <span style={{ color: C.faint }}>·</span>
          <span style={{ color: C.accent, fontWeight: 700 }}>{PAGES_READ} Seiten</span>
        </div>
      </div>
    </>
  );
};
