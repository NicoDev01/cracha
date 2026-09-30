import { C, CX, CY, SHADOW_SM, lerp, prog, ui } from "../theme";
import { SOURCE, SourcePage } from "./Chat";
import { K, clamp01, ez, rnd, sp, useT, zoom } from "./kit";
import { DEEP, MAIN, MapView, SQUASH, buildMap, type MapNode } from "./Map";

// The camera pulls back from the source page: it was one tiny page on the
// outermost ring. A plain AI search lights the surface, CraCha lights every
// ring, and not just on one website.

const E = K.edge;
const OTHERS = [
  { nodes: buildMap([1, 5, 12, 22, 38], 5), cx: 960, label: "Onlineshop", at: E.sites + 0.2, wave: E.sites + 0.75 },
  { nodes: buildMap([1, 6, 14, 26, 44], 9), cx: 1460, label: "Dokumentation", at: E.sites + 0.35, wave: E.sites + 1.05 },
];
const MAP_Y = CY + 20;
const SMALL = 0.2;

const implode = (t: number, n: MapNode, salt: number) => {
  const c = E.implode + rnd(n.i, salt) * 0.2;
  return prog(t, c, c + 0.5, ez.in);
};

const lit = (radius: number, n: MapNode) => clamp01((radius - n.r) / 90);

export const Edge: React.FC = () => {
  const t = useT();
  if (t < E.back || t > E.implode + 0.8) return null;

  const pull = ez.cam(prog(t, E.back, E.back + 1.0, (x) => x));
  const aside = prog(t, E.sites, E.sites + 0.7, ez.cam);
  const gather = prog(t, E.implode, E.implode + 0.55, ez.in);
  const sPull = zoom(SOURCE.w / DEEP.w, 0.47, pull);
  const s0 = zoom(sPull, SMALL, aside);
  const cx0 = lerp(lerp(CX, 460, aside), CX, gather);
  // The deep page glides on screen from the centre to its place in the map,
  // while the camera zooms out around it.
  const k = 1 - (pull * 0.47) / sPull;
  const focus = { x: DEEP.x * k, y: DEEP.y * k };
  const cy0 = lerp(CY, MAP_Y, pull);

  // Search radius: the surface first, then everything.
  const radius = t < E.deep ? 380 * sp(t, E.surface, 14, 170) : lerp(380, 1250, prog(t, E.deep, E.deep + 0.9, ez.out));
  const dimOn = prog(t, E.surface, E.surface + 0.3, ez.out);
  const discO = prog(t, E.surface, E.surface + 0.2, ez.out) * (1 - prog(t, E.sites, E.sites + 0.4, ez.out));
  const deep = t >= E.deep;
  const tag = sp(t, deep ? E.deep : E.surface, 12, 220);

  return (
    <>
      <MapView
        nodes={MAIN}
        cx={cx0}
        cy={cy0}
        scale={s0}
        focus={focus}
        state={(n) => {
          const l = t >= E.surface ? lit(radius, n) : 0;
          return { show: 1, edge: 1, flash: 0, lit: l, dim: dimOn * (1 - l) * (1 - aside), gone: implode(t, n, 3) };
        }}
        special={{ node: DEEP.i, opacity: 1 - prog(t, E.back + 0.25, E.back + 0.55, ez.out), render: (n) => (
          <div style={{ position: "absolute", left: 0, top: 0, transformOrigin: "0 0", transform: `scale(${n.w / SOURCE.w}, ${n.h / SOURCE.h})` }}>
            <SourcePage t={t} />
          </div>
        ) }}
      >
        {discO > 0 ? (
          <>
            <div
              style={{
                position: "absolute",
                left: -radius,
                top: -radius * SQUASH,
                width: radius * 2,
                height: radius * 2 * SQUASH,
                borderRadius: "50%",
                background: "radial-gradient(ellipse, rgba(251,146,60,0.16) 0%, rgba(251,146,60,0.08) 70%, rgba(251,146,60,0) 100%)",
                border: `${3 / s0}px solid rgba(249,115,22,${0.7 * discO})`,
                opacity: discO,
              }}
            />
            <div
              style={{
                position: "absolute",
                left: Math.cos(-0.35) * radius,
                top: Math.sin(-0.35) * radius * SQUASH,
                transform: `translate(-10%, -120%) scale(${(1 / s0) * (0.6 + 0.4 * tag)})`,
                transformOrigin: "0 100%",
                opacity: discO * Math.min(1, tag * 2),
                padding: "10px 22px",
                borderRadius: 26,
                background: deep ? "linear-gradient(90deg, #ef4444, #f97316 55%, #f59e0b)" : "#ffffff",
                boxShadow: SHADOW_SM,
                fontFamily: ui,
                fontSize: 26,
                fontWeight: 800,
                color: C.ink,
                whiteSpace: "nowrap",
              }}
            >
              {deep ? "CraCha: jede Unterseite" : "KI-Suche: nur die Oberfläche"}
            </div>
          </>
        ) : null}
      </MapView>

      {OTHERS.map((m, k) => {
        const pop = sp(t, m.at, 13, 170);
        if (pop <= 0.001) return null;
        const wave = lerp(0, 1250, prog(t, m.wave, m.wave + 0.8, ez.out));
        return (
          <MapView
            key={k}
            nodes={m.nodes}
            cx={lerp(m.cx, CX, gather)}
            cy={MAP_Y}
            scale={SMALL * pop}
            state={(n) => ({ show: 1, edge: 1, flash: 0, lit: lit(wave, n), dim: 0, gone: implode(t, n, 7 + k) })}
          />
        );
      })}

      {[{ cx: 460, label: "Firmenwebsite", at: E.sites + 0.3 }, ...OTHERS.map((m) => ({ cx: m.cx, label: m.label, at: m.at + 0.1 }))].map((l) => {
        const p = sp(t, l.at, 14, 200) * (1 - gather);
        if (p <= 0.001) return null;
        return (
          <div key={l.label} style={{ position: "absolute", left: l.cx - 200, width: 400, top: MAP_Y + 1080 * SQUASH * SMALL + 44, display: "flex", justifyContent: "center" }}>
            <div
              style={{
                padding: "10px 24px",
                borderRadius: 26,
                background: "rgba(255,255,255,0.94)",
                boxShadow: SHADOW_SM,
                fontFamily: ui,
                fontSize: 24,
                fontWeight: 700,
                color: C.text,
                opacity: Math.min(1, p * 1.5),
                transform: `translateY(${(1 - p) * 24}px)`,
              }}
            >
              {l.label}
            </div>
          </div>
        );
      })}
    </>
  );
};
