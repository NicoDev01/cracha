import React from "react";
import { AbsoluteFill } from "remotion";
import { Dot, Pointer, SHADOW_SOFT, Smear, Stack } from "./kit";
import { CX, CY, K, P, SITE, clamp01, ez, lerp, pressAt, prog, rnd, ui, useT, zoom } from "./look";

const HK = K.hook;
const PR = K.problem;

/** "Wo / stand / das / nochmal?" stacks up on the voice, then whips up and away. */
export const Hook: React.FC = () => {
  const t = useT();
  if (t >= HK.out + 0.3) return null;
  const words = ["Wo", "stand", "das", "nochmal?"].map((text, i) => ({ text, at: HK.words[i] }));
  return <Stack words={words} out={HK.out} />;
};

// --- A browser full of tabs ---------------------------------------------------

const BW = 1600;
const BH = 900;
const TAB_H = 58;
const BAR_H = 62;
const NAV_H = 84;
const SUB_H = 62;
const TOP = TAB_H + BAR_H;
const NAV = ["Produkte", "Preise", "Hilfe", "Service", "Konto", "Blog", "Kontakt"];
const SUB = ["Übersicht", "Details", "Downloads", "FAQ", "Formulare"];
const PAGES = ["Start", "Hilfe", "Häufige Fragen", "Downloads", "Kundenkonto", "Service", "Kontakt", "Einstellungen", "Blog", "Tarife", "Support", "Profil"];
const tabW = (n: number) => Math.min(210, (BW - 110) / n);

type State = { tabs: string[]; active: number; nav: number; sub: number; title: string; path: string };

const Browser: React.FC<{ s: State; swap?: number; seed: number }> = ({ s, swap = 1, seed }) => {
  const tw = tabW(s.tabs.length);
  return (
    <div style={{ position: "absolute", left: 0, top: 0, width: BW, height: BH, borderRadius: 24, overflow: "hidden", background: P.card, boxShadow: SHADOW_SOFT, fontFamily: ui }}>
      {/* Tabs */}
      <div style={{ position: "absolute", left: 0, top: 0, right: 0, height: TAB_H, background: "#efebe6", display: "flex", alignItems: "flex-end", paddingLeft: 24 }}>
        {s.tabs.map((title, i) => (
          <div
            key={i}
            style={{
              flex: `0 0 ${tw - 4}px`,
              height: TAB_H - 12,
              marginRight: 4,
              borderRadius: "12px 12px 0 0",
              background: i === s.active ? P.card : "transparent",
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "0 12px",
              fontSize: 17,
              fontWeight: 600,
              color: i === s.active ? P.ink : P.muted,
              whiteSpace: "nowrap",
              overflow: "hidden",
            }}
          >
            <div style={{ flex: "0 0 14px", height: 14, borderRadius: 4, background: i === s.active ? P.accent : "#d6cec6" }} />
            {title}
          </div>
        ))}
        <div style={{ fontSize: 26, color: P.muted, padding: "0 12px 10px" }}>+</div>
      </div>
      {/* Address bar */}
      <div style={{ position: "absolute", left: 0, right: 0, top: TAB_H, height: BAR_H, display: "flex", alignItems: "center", gap: 14, padding: "0 24px", borderBottom: `1.5px solid ${P.line}` }}>
        {["‹", "›", "↻"].map((c) => (
          <div key={c} style={{ fontSize: 26, color: P.faint, width: 20 }}>
            {c}
          </div>
        ))}
        <div style={{ flex: 1, height: 40, borderRadius: 20, background: P.soft, display: "flex", alignItems: "center", padding: "0 20px", fontSize: 20, fontWeight: 600, color: P.muted }}>
          {SITE}
          <span style={{ color: P.ink }}>{s.path}</span>
        </div>
      </div>
      {/* Site header with its menu */}
      <div style={{ position: "absolute", left: 0, right: 0, top: TOP, height: NAV_H, display: "flex", alignItems: "center", gap: 36, padding: "0 48px", borderBottom: `1.5px solid ${P.line}` }}>
        <div style={{ fontSize: 30, fontWeight: 800, color: P.ink, letterSpacing: "-0.03em", marginRight: 30 }}>example</div>
        {NAV.map((n, i) => (
          <div key={n} style={{ position: "relative", fontSize: 22, fontWeight: 700, color: i === s.nav ? P.ink : P.muted }}>
            {n}
            {i === s.nav ? <div style={{ position: "absolute", left: 0, right: 0, bottom: -29, height: 4, borderRadius: 2, background: P.accent }} /> : null}
          </div>
        ))}
        <div style={{ marginLeft: "auto", padding: "10px 22px", borderRadius: 22, background: P.ink, color: "white", fontSize: 18, fontWeight: 700 }}>Login</div>
      </div>
      {/* Sub tabs */}
      <div style={{ position: "absolute", left: 48, top: TOP + NAV_H + 14, display: "flex", gap: 10 }}>
        {SUB.map((n, i) => (
          <div key={n} style={{ padding: "8px 18px", borderRadius: 18, fontSize: 18, fontWeight: 700, color: i === s.sub ? "white" : P.muted, background: i === s.sub ? P.ink : P.soft }}>
            {n}
          </div>
        ))}
      </div>
      {/* Page */}
      <div style={{ position: "absolute", left: 48, top: TOP + NAV_H + SUB_H + 30, width: 250 }}>
        {Array.from({ length: 9 }, (_, i) => (
          <div key={i} style={{ marginBottom: 20, width: `${60 + ((seed * 3 + i * 7) % 5) * 9}%`, height: 12, borderRadius: 6, background: i === (seed + 2) % 9 ? P.accentMark : P.soft }} />
        ))}
      </div>
      <div
        style={{
          position: "absolute",
          left: 360,
          top: TOP + NAV_H + SUB_H + 20,
          right: 60,
          opacity: swap,
          transform: `translateX(${(1 - swap) * 60}px)`,
        }}
      >
        <div style={{ fontSize: 20, fontWeight: 600, color: P.muted }}>Start › {s.title}</div>
        <div style={{ marginTop: 8, fontSize: 54, fontWeight: 800, letterSpacing: "-0.03em", color: P.ink }}>{s.title}</div>
        {Array.from({ length: 7 }, (_, i) => (
          <div key={i} style={{ marginTop: i ? 16 : 28, width: `${96 - ((seed * 5 + i * 11) % 6) * 7}%`, height: 14, borderRadius: 7, background: P.soft }} />
        ))}
      </div>
    </div>
  );
};

// Each click opens one more tab and one more page; the pointer alternates between tab strip and menu.
const STATES: State[] = [];
{
  const tabs = ["example.com", "Hilfe", "FAQ", "Konto", "Preise"];
  let nav = 0;
  let sub = 0;
  for (let k = 0; k < PR.switches.length + 1; k++) {
    const title = PAGES[k % PAGES.length];
    if (k > 0) {
      tabs.push(title.split(" ")[0]);
      nav = (nav + 3) % NAV.length;
      sub = (sub + 2) % SUB.length;
    }
    STATES.push({ tabs: [...tabs], active: tabs.length - 1, nav, sub, title, path: `/${NAV[nav].toLowerCase()}/${title.split(" ")[0].toLowerCase()}` });
  }
}
/** Where the pointer clicks before switch k (browser coordinates): the "+" of the tab strip or a menu item. */
const target = (k: number) => {
  const s = STATES[k];
  if (k % 2 === 0) return { x: 24 + s.tabs.length * tabW(s.tabs.length) + 20, y: TAB_H / 2 + 6 };
  const nav = STATES[k + 1]?.nav ?? 0;
  return { x: 48 + 170 + 36 + nav * 150, y: TOP + NAV_H / 2 };
};

// Other browsers for the zoom-out: every one of them full of tabs, too.
const COLS = 5;
const ROWS = 3;
const GX = 1760;
const GY = 1020;
const OTHERS = Array.from({ length: COLS * ROWS }, (_, i) => {
  const n = 7 + Math.floor(rnd(i, 3) * 11);
  const tabs = Array.from({ length: n }, (_, j) => PAGES[(i * 5 + j * 3) % PAGES.length].split(" ")[0]);
  const title = PAGES[(i * 7) % PAGES.length];
  return {
    x: ((i % COLS) - (COLS - 1) / 2) * GX,
    y: (Math.floor(i / COLS) - (ROWS - 1) / 2) * GY,
    s: { tabs, active: Math.floor(rnd(i, 5) * n), nav: i % NAV.length, sub: i % SUB.length, title, path: `/${title.toLowerCase().split(" ")[0]}` } as State,
  };
});
const MAIN = Math.floor((COLS * ROWS) / 2);

export const Problem: React.FC = () => {
  const t = useT();
  if (t < PR.start || t >= K.reveal.logo) return null;
  let k = 0;
  while (k < PR.switches.length && t >= PR.switches[k]) k++;
  const s = STATES[k];
  const swap = k > 0 ? prog(t, PR.switches[k - 1], PR.switches[k - 1] + 0.18, ez.out) : 1;
  const enter = prog(t, PR.start, PR.start + 0.32, ez.out);
  const over = prog(t, PR.overview, PR.overview + 0.8, ez.inOut);
  const z = zoom(1.2 * (1 + 0.012 * k), 0.2, over);
  const implode = (i: number) => prog(t, PR.implode + rnd(i, 7) * 0.12, PR.dot - 0.03, ez.in);
  // Pointer: glides to the next target and clicks just before each switch.
  const next = Math.min(k, PR.switches.length - 1);
  const from = k > 0 ? target(Math.min(k, PR.switches.length) - 1) : { x: BW * 0.7, y: BH * 0.75 };
  const to = target(next);
  const move = k >= PR.switches.length ? 0 : prog(t, (k > 0 ? PR.switches[k - 1] : PR.start + 0.2) + 0.05, PR.switches[next] - 0.14, ez.inOut);
  const cursor = {
    x: CX + (lerp(from.x, to.x, move) - BW / 2) * z,
    y: CY + (lerp(from.y, to.y, move) - BH / 2) * z + (1 - enter) * 1000,
  };
  const press = Math.max(...PR.switches.map((sw) => pressAt(t, sw - 0.06)));
  const pointer = prog(t, PR.start + 0.2, PR.start + 0.4, ez.out) * (1 - prog(t, PR.overview, PR.overview + 0.2, ez.out));
  return (
    <AbsoluteFill>
      <Smear id="problem-enter" x={0} y={(1 - enter) * 24}>
        <div
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            transformOrigin: "0 0",
            transform: `translate(${CX}px, ${CY + (1 - enter) * 1000}px) scale(${z})`,
          }}
        >
          {OTHERS.map((o, i) => {
            const isMain = i === MAIN;
            if (!isMain && over <= 0) return null;
            const k2 = implode(i);
            return (
              <div
                key={i}
                style={{
                  position: "absolute",
                  left: lerp(o.x, 0, k2) - BW / 2,
                  top: lerp(o.y, 0, k2) - BH / 2,
                  width: BW,
                  height: BH,
                  transform: `scale(${1 - k2}) rotate(${(rnd(i, 4) - 0.5) * 30 * k2}deg)`,
                  opacity: isMain ? 1 : clamp01(over * 1.5),
                }}
              >
                <Browser s={isMain ? s : o.s} swap={isMain ? swap : 1} seed={isMain ? k : i} />
              </div>
            );
          })}
        </div>
      </Smear>
      <Pointer x={cursor.x} y={cursor.y} opacity={pointer} press={press} />
      <Dot scale={prog(t, PR.dot - 0.08, PR.dot + 0.05, ez.out)} pulseFrom={PR.dot} />
    </AbsoluteFill>
  );
};
