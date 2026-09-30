import { AbsoluteFill } from "remotion";
import { CX, CY, heading, prog, track, ui, type Keyframe } from "../theme";
import { DARK, K, LIGHT_ACCENT, MotionBlur, Pointer, Ripple, SITE, clamp01, ez, pressAt, rnd, sp, useT } from "./kit";

// Clicking from page to page: every click whips to the next page and opens
// another tab, until windows pile up, everything implodes and only "nichts."
// is left. Its full stop becomes the dot the solution grows from.

const W = 1240;
const H = 720;
const WIN = { x: CX - W / 2, y: 600 - H / 2 };
const TABS_H = 50;
const ADDR_H = 46;
const TOP = TABS_H + ADDR_H;
const HITS = K.problem.hits;
export const DOT = 34;

const NAV = [
  { label: "Start", x: 40 },
  { label: "Produkte", x: 170 },
  { label: "Service", x: 330 },
  { label: "Kontakt", x: 490 },
  { label: "Über uns", x: 640 },
];
const NAV_Y = 24;

const PAGES = [
  { path: "", title: "Start", nav: 0 },
  { path: "/service", title: "Service", nav: 2 },
  { path: "/service/faq", title: "Häufige Fragen", nav: 2 },
  { path: "/kontakt", title: "Kontakt", nav: 3 },
];

/** Click targets inside the window. */
const TARGETS = [
  { x: NAV[2].x + 55, y: TOP + NAV_Y + 20 },
  { x: 40 + 30, y: TOP + 150 + 2 * 56 + 22 },
  { x: NAV[3].x + 55, y: TOP + NAV_Y + 20 },
];

const pageAt = (t: number) => HITS.filter((h) => t >= h + 0.12).length;

const Skel: React.FC<{ x: number; y: number; w: number; h?: number; o?: number }> = ({ x, y, w, h = 12, o = 0.09 }) => (
  <div style={{ position: "absolute", left: x, top: y, width: w, height: h, borderRadius: h, background: `rgba(255,240,230,${o})` }} />
);

const PageBody: React.FC<{ k: number; t: number }> = ({ k, t }) => {
  const title = (
    <div style={{ position: "absolute", left: 40, top: 80, fontFamily: heading, fontWeight: 800, fontSize: 50, letterSpacing: "-0.03em", color: DARK.text }}>
      {k === 0 ? "Willkommen bei uns" : PAGES[k].title}
    </div>
  );
  if (k === 0)
    return (
      <>
        {title}
        <Skel x={40} y={168} w={430} />
        <Skel x={40} y={194} w={380} />
        <Skel x={40} y={220} w={410} />
        <div style={{ position: "absolute", left: 40, top: 268, width: 190, height: 52, borderRadius: 26, background: "rgba(251,146,60,0.22)" }} />
        <div style={{ position: "absolute", right: 40, top: 80, width: 560, height: 420, borderRadius: 22, background: "linear-gradient(135deg, rgba(251,146,60,0.16), rgba(239,68,68,0.1))" }} />
        {[0, 1, 2].map((i) => (
          <div key={i} style={{ position: "absolute", left: 40 + i * 150, top: 370, width: 130, height: 130, borderRadius: 18, background: DARK.card2 }} />
        ))}
      </>
    );
  if (k === 1)
    return (
      <>
        {title}
        {["Hilfe-Center", "Versand & Lieferung", "FAQ", "Downloads"].map((label, i) => {
          const hot = i === 2 ? pressAt(t, HITS[1]) : 0;
          return (
            <div
              key={label}
              style={{
                position: "absolute",
                left: 30,
                top: 150 + i * 56,
                height: 44,
                padding: "0 10px",
                borderRadius: 10,
                display: "flex",
                alignItems: "center",
                fontFamily: ui,
                fontSize: 27,
                fontWeight: 600,
                color: "#fdba74",
                textDecoration: "underline",
                textUnderlineOffset: 6,
                background: `rgba(251,146,60,${hot * 0.25})`,
              }}
            >
              {label}
            </div>
          );
        })}
        <Skel x={520} y={166} w={600} />
        <Skel x={520} y={192} w={540} />
        <Skel x={520} y={218} w={580} />
        <Skel x={520} y={244} w={420} />
      </>
    );
  if (k === 2)
    return (
      <>
        {title}
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i} style={{ position: "absolute", left: 40, right: 40, top: 160 + i * 66, height: 54, borderRadius: 14, background: DARK.card2, display: "flex", alignItems: "center", gap: 18, padding: "0 22px" }}>
            <div style={{ fontFamily: ui, fontSize: 28, color: DARK.muted }}>+</div>
            <div style={{ width: 320 + rnd(i, 3) * 360, height: 12, borderRadius: 6, background: "rgba(255,240,230,0.12)" }} />
          </div>
        ))}
      </>
    );
  return (
    <>
      {title}
      {[0, 1, 2].map((i) => (
        <div key={i} style={{ position: "absolute", left: 40, top: 166 + i * 84, width: 520, height: 60, borderRadius: 14, background: DARK.card2 }} />
      ))}
      <div style={{ position: "absolute", left: 40, top: 430, width: 200, height: 56, borderRadius: 28, background: "rgba(251,146,60,0.22)" }} />
      <Skel x={640} y={170} w={480} />
      <Skel x={640} y={196} w={420} />
    </>
  );
};

const Tabs: React.FC<{ t: number }> = ({ t }) => {
  const opened = pageAt(t);
  const burst = Math.floor(Math.pow(prog(t, K.problem.cascade, K.problem.cascade + 1.1, ez.soft), 1.3) * 17);
  const n = 1 + opened + burst;
  const barW = W - 150;
  const tabW = Math.min(230, barW / n);
  return (
    <div style={{ position: "absolute", left: 110, top: 8, height: TABS_H - 8, width: barW }}>
      {Array.from({ length: n }, (_, i) => {
        const born = i === 0 ? 0 : i <= opened ? HITS[i - 1] + 0.1 : K.problem.cascade + ((i - opened) / 17) ** (1 / 1.3) * 1.1;
        const p = sp(t, born, 15, 260);
        const active = i === n - 1;
        const title = i < PAGES.length ? PAGES[i].title : ["Neuer Tab", "Suche", "FAQ", "Hilfe", "Service"][i % 5];
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: i * tabW,
              top: 0,
              width: tabW - 4,
              height: TABS_H - 8,
              borderRadius: "12px 12px 0 0",
              background: active ? DARK.card : "rgba(255,240,230,0.05)",
              transformOrigin: "0% 100%",
              transform: `scaleX(${p}) translateY(${(1 - p) * 10}px)`,
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "0 12px",
              overflow: "hidden",
              whiteSpace: "nowrap",
              fontFamily: ui,
              fontSize: 17,
              fontWeight: 500,
              color: active ? DARK.text : DARK.muted,
            }}
          >
            <div style={{ flex: "none", width: 14, height: 14, borderRadius: 7, background: i % 3 === 0 ? "#fb923c" : "rgba(255,240,230,0.2)" }} />
            {tabW > 70 ? title : null}
          </div>
        );
      })}
    </div>
  );
};

/** The browser the viewer gets lost in. `live` pages switch on the clicks. */
const Browser: React.FC<{ t: number; live?: boolean; seed?: number }> = ({ t, live, seed = 0 }) => {
  const current = live ? pageAt(t) : (seed % 3) + 1;
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        borderRadius: 22,
        background: DARK.card,
        outline: "1.5px solid rgba(255,240,230,0.1)",
        boxShadow: "0 40px 100px -20px rgba(0,0,0,0.8)",
        overflow: "hidden",
      }}
    >
      <div style={{ position: "absolute", left: 0, right: 0, top: 0, height: TABS_H, background: "#15100e" }}>
        <div style={{ position: "absolute", left: 24, top: 19, display: "flex", gap: 9 }}>
          {["#ff5f57", "#febc2e", "#28c840"].map((c) => (
            <div key={c} style={{ width: 13, height: 13, borderRadius: 7, background: c, opacity: 0.85 }} />
          ))}
        </div>
        {live ? <Tabs t={t} /> : null}
      </div>
      <div style={{ position: "absolute", left: 0, right: 0, top: TABS_H, height: ADDR_H, display: "flex", alignItems: "center", padding: "0 24px", borderBottom: `1px solid ${DARK.line}` }}>
        <div style={{ flex: 1, height: 32, borderRadius: 16, background: "rgba(255,240,230,0.06)", display: "flex", alignItems: "center", padding: "0 18px", fontFamily: ui, fontSize: 18, color: DARK.muted }}>
          {SITE}
          <span style={{ color: DARK.text }}>{PAGES[current].path}</span>
        </div>
      </div>
      <div style={{ position: "absolute", left: 0, right: 0, top: TOP, bottom: 0, overflow: "hidden" }}>
        {NAV.map((n, i) => {
          const hot = live ? (i === 2 ? pressAt(t, HITS[0]) : i === 3 ? pressAt(t, HITS[2]) : 0) : 0;
          const on = PAGES[current].nav === i;
          return (
            <div
              key={n.label}
              style={{
                position: "absolute",
                left: n.x,
                top: NAV_Y,
                height: 40,
                padding: "0 18px",
                borderRadius: 20,
                display: "flex",
                alignItems: "center",
                fontFamily: ui,
                fontSize: 19,
                fontWeight: 600,
                color: on ? "#fdba74" : DARK.text,
                background: on || hot > 0.02 ? `rgba(251,146,60,${0.14 + hot * 0.25})` : "transparent",
              }}
            >
              {n.label}
            </div>
          );
        })}
        {PAGES.map((_, k) => {
          if (!live && k !== current) return null;
          // Each click whips the old page out to the left and the new one in from the right.
          const inP = !live || k === 0 ? 1 : prog(t, HITS[k - 1] + 0.08, HITS[k - 1] + 0.42, ez.out);
          const outP = !live || k === PAGES.length - 1 ? 0 : prog(t, HITS[k] + 0.04, HITS[k] + 0.24, ez.in);
          if (inP <= 0 || outP >= 1) return null;
          const x = (1 - inP) * 520 - outP * 520;
          const v = (1 - inP) * 34 + outP * 34;
          return (
            <MotionBlur key={k} id={`whip-${k}`} x={v} style={{ transform: `translateX(${x}px)`, opacity: Math.min(inP * 2, 1 - outP) }}>
              <PageBody k={k} t={t} />
            </MotionBlur>
          );
        })}
      </div>
    </div>
  );
};

type Group = { s: number; r: number; b: number };
const GROUP: Keyframe<Group>[] = [
  { t: 0, s: 0.22, r: 0, b: 24 },
  { t: K.hook.dive + 0.1, s: 0.22, r: 0, b: 24 },
  { t: K.hook.dive + 0.7, s: 1, r: 0, b: 0, e: ez.out },
  { t: K.problem.cascade, s: 1, r: 0, b: 0 },
  { t: K.problem.cascade + 1.0, s: 0.74, r: -1.5, b: 0, e: ez.soft },
  { t: K.problem.implode, s: 0.72, r: -2, b: 0 },
  { t: K.problem.implode + 0.12, s: 0.76, r: -2.5, b: 0, e: ez.out },
  { t: K.problem.implode + 0.6, s: 0.0, r: 14, b: 18, e: ez.in },
];

const CASCADE = Array.from({ length: 7 }, (_, i) => ({
  dx: (i + 1) * 40 - 170,
  dy: (i + 1) * 24 - 110,
  rot: (rnd(i, 2) - 0.5) * 7,
  at: K.problem.cascade + 0.08 + i * 0.11,
}));

const CURSOR: Keyframe<{ x: number; y: number; o: number }>[] = [
  { t: 0, x: 1420, y: 980, o: 0 },
  { t: 4.95, x: 1420, y: 980, o: 0 },
  { t: 5.1, x: 1300, y: 900, o: 1 },
  ...HITS.flatMap((h, k) => [
    { t: h - 0.05, x: WIN.x + TARGETS[k].x, y: WIN.y + TARGETS[k].y, o: 1, e: ez.soft },
    { t: h + 0.18, x: WIN.x + TARGETS[k].x, y: WIN.y + TARGETS[k].y, o: 1 },
  ]),
  { t: 7.9, x: 1150, y: 760, o: 1, e: ez.soft },
  { t: 8.3, x: 1250, y: 860, o: 0 },
];

export const Problem: React.FC = () => {
  const t = useT();
  if (t < K.hook.dive || t > K.drop + 0.1) return null;
  const g = track(t, GROUP);
  const dim = prog(t, 8.1, 9.2, ez.soft);
  const c = track(t, CURSOR);
  const lastHit = HITS.filter((h) => h <= t + 0.1).at(-1) ?? -9;

  return (
    <AbsoluteFill>
      <MotionBlur id="problem-group" x={g.b} y={g.b}>
        <div
          style={{
            position: "absolute",
            inset: 0,
            transformOrigin: `${CX}px 600px`,
            transform: `scale(${g.s}) rotate(${g.r}deg)`,
            filter: `saturate(${1 - dim * 0.8}) brightness(${1 - dim * 0.45})`,
            opacity: clamp01(g.s * 4),
          }}
        >
          <div style={{ position: "absolute", left: WIN.x, top: WIN.y, width: W, height: H }}>
            <Browser t={t} live />
          </div>
          {CASCADE.map((w, i) => {
            const p = sp(t, w.at, 14, 200);
            if (p <= 0) return null;
            return (
              <div
                key={i}
                style={{
                  position: "absolute",
                  left: WIN.x + w.dx,
                  top: WIN.y + w.dy,
                  width: W,
                  height: H,
                  transform: `rotate(${w.rot * p}deg) scale(${0.6 + 0.4 * p})`,
                  opacity: Math.min(1, p * 2),
                }}
              >
                <Browser t={t} seed={i} />
              </div>
            );
          })}
          <Ripple x={WIN.x + TARGETS[0].x} y={WIN.y + TARGETS[0].y} at={HITS[0]} color="#fb923c" />
          <Ripple x={WIN.x + TARGETS[1].x} y={WIN.y + TARGETS[1].y} at={HITS[1]} color="#fb923c" />
          <Ripple x={WIN.x + TARGETS[2].x} y={WIN.y + TARGETS[2].y} at={HITS[2]} color="#fb923c" />
          <Pointer x={c.x} y={c.y} opacity={c.o} press={pressAt(t, lastHit)} dark />
        </div>
      </MotionBlur>

      {/* "Klick." stamps on each click. */}
      {HITS.map((h, k) => {
        const p = sp(t, h, 12, 260, 0.7);
        if (p <= 0) return null;
        const out = prog(t, K.problem.implode - 0.1 + k * 0.05, K.problem.implode + 0.25 + k * 0.05, ez.in);
        return (
          <div
            key={k}
            style={{
              position: "absolute",
              left: CX - 150 + (k - 1) * 330,
              width: 300,
              top: 78,
              textAlign: "center",
              fontFamily: heading,
              fontWeight: 800,
              fontSize: 96,
              letterSpacing: "-0.04em",
              color: k === 2 ? undefined : DARK.text,
              ...(k === 2 ? { backgroundImage: LIGHT_ACCENT, WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent" } : null),
              opacity: Math.min(1, p * 2) * (1 - out),
              transform: `scale(${2.1 - 1.1 * p}) rotate(${(rnd(k, 5) - 0.5) * 10 * (1 - out)}deg) translateY(${out * -40}px)`,
              filter: `blur(${Math.max(0, 1 - p) * 10 + out * 8}px)`,
              textShadow: "0 16px 40px rgba(0,0,0,0.6)",
            }}
          >
            Klick.
          </div>
        );
      })}

      <Nothing t={t} />
    </AbsoluteFill>
  );
};

const WORD = "nichts";
const DOT_HOME = { x: CX + 172, y: CY + 48 };

/** "nichts." — the letters fall away, the full stop turns orange and moves to the centre. */
const Nothing: React.FC<{ t: number }> = ({ t }) => {
  const n = K.problem.nothing;
  const d = K.problem.dissolve;
  const appear = prog(t, n, n + 0.22, ez.out);
  if (appear <= 0 || t >= K.drop) return null;
  const move = prog(t, d + 0.12, K.drop - 0.06, ez.soft);
  const orange = prog(t, d, d + 0.3, ez.out);
  const squash = prog(t, K.drop - 0.2, K.drop, ez.in);
  const x = DOT_HOME.x + (CX - DOT_HOME.x) * move;
  const y = DOT_HOME.y + (CY - DOT_HOME.y) * move;
  return (
    <>
      <div
        style={{
          position: "absolute",
          right: 1920 - (CX + 150),
          top: CY - 110,
          fontFamily: heading,
          fontWeight: 800,
          fontSize: 190,
          letterSpacing: "-0.04em",
          color: DARK.muted,
          display: "flex",
          transform: `scale(${1.04 - 0.04 * appear})`,
          opacity: appear,
        }}
      >
        {WORD.split("").map((ch, i) => {
          const q = prog(t, d + (WORD.length - 1 - i) * 0.03, d + 0.3 + (WORD.length - 1 - i) * 0.03, ez.in);
          return (
            <span key={i} style={{ display: "inline-block", opacity: 1 - q, transform: `translateY(${q * 60}px) rotate(${q * (rnd(i, 8) - 0.5) * 30}deg)`, filter: `blur(${q * 12}px)` }}>
              {ch}
            </span>
          );
        })}
      </div>
      <div
        style={{
          position: "absolute",
          left: x - DOT / 2,
          top: y - DOT / 2,
          width: DOT,
          height: DOT,
          borderRadius: DOT,
          background: orange > 0 ? `rgb(${141 + (249 - 141) * orange}, ${128 + (115 - 128) * orange}, ${121 + (22 - 121) * orange})` : DARK.muted,
          boxShadow: `0 0 ${50 * orange}px ${14 * orange}px rgba(249,115,22,${0.45 * orange})`,
          opacity: appear,
          transform: `scale(${(1 + 0.25 * orange * (1 - move)) * (1 - squash * 0.3)}, ${(1 + 0.25 * orange * (1 - move)) * (1 - squash * 0.3)})`,
        }}
      />
    </>
  );
};
