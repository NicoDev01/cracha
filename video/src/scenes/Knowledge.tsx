import { useCurrentFrame } from "remotion";
import { C, CX, FPS, SHADOW_SM, ease, lerp, prog, ui } from "../theme";
import { PAGES, SITE, T } from "../timeline";
import { DB_POS } from "../layout";

/** A stack of three discs; `fill` lights them up from the bottom, 0..3. */
export const Database: React.FC<{ a: string; b: string; fill: number; id: string }> = ({ a, b, fill, id }) => {
  const rx = 118;
  const ry = 32;
  const disc = 58;
  const gap = 14;
  const discs = [2, 1, 0]; // bottom first, so upper discs overlap lower ones
  return (
    <svg viewBox="0 0 260 290" width={260} height={290} style={{ overflow: "visible" }}>
      <defs>
        <linearGradient id={`${id}-side`} x1="0" x2="1">
          <stop offset="0" stopColor={a} />
          <stop offset="1" stopColor={b} />
        </linearGradient>
        <linearGradient id={`${id}-top`} x1="0" x2="1" y1="0" y2="1">
          <stop offset="0" stopColor="#ffffff" stopOpacity={0.75} />
          <stop offset="1" stopColor="#ffffff" stopOpacity={0.35} />
        </linearGradient>
      </defs>
      {discs.map((k) => {
        const y0 = 36 + k * (disc + gap);
        const y1 = y0 + disc;
        const side = `M ${130 - rx} ${y0} L ${130 - rx} ${y1} A ${rx} ${ry} 0 0 0 ${130 + rx} ${y1} L ${130 + rx} ${y0} Z`;
        const lit = Math.max(0, Math.min(1, fill - (2 - k)));
        return (
          <g key={k}>
            <path d={side} fill="#e4e6f4" />
            <ellipse cx={130} cy={y0} rx={rx} ry={ry} fill="#f1f2fa" stroke="#dcdff0" />
            <g opacity={lit}>
              <path d={side} fill={`url(#${id}-side)`} />
              <ellipse cx={130} cy={y0} rx={rx} ry={ry} fill={`url(#${id}-side)`} />
              <ellipse cx={130} cy={y0} rx={rx} ry={ry} fill={`url(#${id}-top)`} />
            </g>
          </g>
        );
      })}
    </svg>
  );
};

const Label: React.FC<{ name: string; meta: string }> = ({ name, meta }) => (
  <div
    style={{
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      gap: 4,
      padding: "14px 26px",
      borderRadius: 20,
      background: "rgba(255,255,255,0.9)",
      boxShadow: SHADOW_SM,
      fontFamily: ui,
      whiteSpace: "nowrap",
    }}
  >
    <div style={{ fontSize: 26, fontWeight: 700, color: C.ink }}>{name}</div>
    <div style={{ fontSize: 19, fontWeight: 500, color: C.muted, fontVariantNumeric: "tabular-nums" }}>{meta}</div>
  </div>
);

const fmt = (n: number) => Math.round(n).toLocaleString("de-DE");

const SLOTS = [CX - 440, CX, CX + 440];
const OTHERS = [
  { name: "Firmen-Wiki", meta: "612 Seiten", a: C.purple, b: C.pink },
  { name: "Dokumentation", meta: "2.310 Seiten", a: C.sky, b: C.indigo },
];

export const Knowledge: React.FC = () => {
  const t = useCurrentFrame() / FPS;
  if (t < T.db - 0.1 || t > T.chat + 0.7) return null;

  // Main knowledge base: appears, fills as the pages arrive, steps aside for
  // the others, comes back to the middle and hands over to the chat input.
  const appear = prog(t, T.db, T.db + 0.6, ease.back);
  const fill = prog(t, T.converge + 0.5, T.converge + 2.2, ease.inOut) * 3;
  const gulp = Math.sin(prog(t, T.converge + 0.4, T.converge + 1.8, ease.linear) * Math.PI * 6) * 0.025 * (fill < 3 ? 1 : 0);
  const aside = prog(t, T.multi, T.multi + 0.8, ease.inOut);
  const back = prog(t, T.multiBack, T.multiBack + 0.6, ease.inOut);
  const x = lerp(lerp(DB_POS.x, SLOTS[0], aside), DB_POS.x, back);
  const scale = lerp(lerp(1, 0.8, aside), 1, back) * (0.5 + 0.5 * appear) * (1 + gulp);
  const handOff = prog(t, T.chat, T.chat + 0.3, ease.out);
  const labelIn = prog(t, T.db + 0.4, T.db + 0.9, ease.out) * (1 - prog(t, T.multiBack, T.multiBack + 0.3, ease.in));

  const pages = prog(t, T.converge + 0.5, T.converge + 2.2, ease.out);

  return (
    <>
      {OTHERS.map((o, i) => {
        const pop = prog(t, T.multi + 0.45 + i * 0.16, T.multi + 1.05 + i * 0.16, ease.back);
        const out = prog(t, T.multiBack - 0.1 + (1 - i) * 0.08, T.multiBack + 0.3 + (1 - i) * 0.08, ease.in);
        if (pop <= 0 || out >= 1) return null;
        return (
          <div
            key={o.name}
            style={{
              position: "absolute",
              left: SLOTS[i + 1] - 130,
              top: DB_POS.y - 145,
              width: 260,
              transform: `scale(${0.8 * pop * (1 - out * 0.4)})`,
              opacity: Math.min(1, pop * 1.4) * (1 - out),
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
            }}
          >
            <Database a={o.a} b={o.b} fill={3} id={`db${i}`} />
            <div style={{ marginTop: 22 }}>
              <Label name={o.name} meta={o.meta} />
            </div>
          </div>
        );
      })}

      <div
        style={{
          position: "absolute",
          left: x - 130,
          top: DB_POS.y - 145,
          width: 260,
          transform: `scale(${scale * (1 - handOff * 0.1)})`,
          opacity: Math.min(1, appear * 1.5) * (1 - handOff),
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
        }}
      >
        <Database a={C.indigo} b={C.purple} fill={fill} id="main" />
        <div style={{ marginTop: 22, opacity: labelIn, transform: `translateY(${(1 - labelIn) * 16}px)` }}>
          <Label name={SITE} meta={`${fmt(pages * PAGES)} Seiten`} />
        </div>
      </div>
    </>
  );
};
