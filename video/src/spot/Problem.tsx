import React from "react";
import { AbsoluteFill } from "remotion";
import { BH, BW, Browser, NAV, NAV_H, PAGES, SUB, State, TAB_H, TOP, tabW } from "../ad/Problem";
import { Dot, Pointer, Stack } from "../ad/kit";
import { CX, CY, clamp01, ez, lerp, pressAt, prog, rnd, sp, useT, zoom } from "../ad/look";
import K from "./cues.json";

const HK = K.hook;
const PR = K.problem;

/** "Wo / stand / das / nochmal?" stacks up on the voice, then whips up and away. */
export const Hook: React.FC = () => {
  const t = useT();
  if (t >= HK.out + 0.3) return null;
  const words = ["Wo", "stand", "das", "nochmal?"].map((text, i) => ({ text, at: HK.words[i] }));
  return <Stack words={words} out={HK.out} />;
};

// Each "klickst" opens one more tab and one more page.
const STATES: State[] = [];
{
  const tabs = ["example.com", "Hilfe", "FAQ", "Konto", "Preise", "Service"];
  let nav = 0;
  let sub = 0;
  for (let k = 0; k <= PR.clicks.length; k++) {
    const title = PAGES[(k * 5) % PAGES.length];
    if (k > 0) {
      tabs.push(title.split(" ")[0]);
      nav = (nav + 3) % NAV.length;
      sub = (sub + 2) % SUB.length;
    }
    STATES.push({ tabs: [...tabs], active: tabs.length - 1, nav, sub, title, path: `/${NAV[nav].toLowerCase()}/${title.split(" ")[0].toLowerCase()}` });
  }
}
/** Where the pointer clicks for click k (browser coordinates): the "+" of the tab strip or a menu item. */
const target = (k: number) => {
  const s = STATES[k];
  if (k % 2 === 0) return { x: 24 + s.tabs.length * tabW(s.tabs.length) + 20, y: TAB_H / 2 + 6 };
  return { x: 48 + 170 + 36 + STATES[k + 1].nav * 150, y: TOP + NAV_H / 2 };
};

// The zoom-out: a grid of browsers, every one of them full of tabs. The whole grid fits the frame.
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
// Small enough that the whole browser (and later the whole grid) stays inside the frame.
const Z0 = 0.9;
const Z_OVER = 1700 / (COLS * GX);

export const Problem: React.FC = () => {
  const t = useT();
  if (t < PR.start || t >= K.reveal.logo + 0.05) return null;
  const switches = PR.clicks.map((c) => c + 0.04);
  let k = 0;
  while (k < switches.length && t >= switches[k]) k++;
  const s = STATES[k];
  const swap = k > 0 ? prog(t, switches[k - 1], switches[k - 1] + 0.22, ez.expo) : 1;
  const enter = prog(t, PR.start, PR.start + 0.3, ez.expo);
  const over = prog(t, PR.overview, PR.overview + 0.45, ez.inOut);
  // A little kick of the camera on every click, a slow push-in in between.
  const kick = PR.clicks.reduce((a, c) => a + (sp(t, c, 9, 260, 0.5) - prog(t, c, c + 0.5, ez.out)) * 0.02, 0);
  const push = prog(t, PR.start, PR.overview, (x) => x) * 0.04;
  const z = zoom(Z0 * (1 + push + kick), Z_OVER, over);
  const implode = (i: number) => prog(t, PR.implode + rnd(i, 7) * 0.12, PR.dot - 0.02, ez.in);

  // Pointer: glides to the next target and clicks on each "klickst".
  const next = Math.min(k, PR.clicks.length - 1);
  const from = k > 0 ? target(k - 1) : { x: BW * 0.72, y: BH * 0.8 };
  const to = target(next);
  const move = k >= PR.clicks.length ? 0 : prog(t, (k > 0 ? PR.clicks[k - 1] : PR.start + 0.05) + 0.08, PR.clicks[next] - 0.08, ez.inOut);
  const cursor = {
    x: CX + (lerp(from.x, to.x, move) - BW / 2) * z,
    y: CY + (lerp(from.y, to.y, move) - BH / 2) * z + (1 - enter) * 900,
  };
  const press = Math.max(...PR.clicks.map((c) => pressAt(t, c)));
  const pointer = prog(t, PR.start + 0.05, PR.start + 0.2, ez.out) * (1 - prog(t, PR.overview, PR.overview + 0.15, ez.out));
  return (
    <AbsoluteFill>
      <div
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          transformOrigin: "0 0",
          transform: `translate(${CX}px, ${CY + (1 - enter) * 900}px) scale(${z})`,
        }}
      >
        {OTHERS.map((o, i) => {
          const isMain = i === MAIN;
          if (!isMain && over <= 0) return null;
          const k2 = implode(i);
          if (k2 >= 1) return null;
          const pop = isMain ? 1 : sp(t, PR.overview + 0.05 + rnd(i, 2) * 0.2, 12, 200, 0.6);
          return (
            <div
              key={i}
              style={{
                position: "absolute",
                left: lerp(o.x, 0, k2) - BW / 2,
                top: lerp(o.y, 0, k2) - BH / 2,
                width: BW,
                height: BH,
                transform: `scale(${(1 - k2) * pop}) rotate(${(rnd(i, 4) - 0.5) * 30 * k2}deg)`,
                opacity: clamp01(pop * 2),
              }}
            >
              <Browser s={isMain ? s : o.s} swap={isMain ? swap : 1} seed={isMain ? k : i} />
            </div>
          );
        })}
      </div>
      <Pointer x={cursor.x} y={cursor.y} opacity={pointer} press={press} />
      <Dot scale={prog(t, PR.dot - 0.08, PR.dot + 0.05, ez.out)} />
    </AbsoluteFill>
  );
};
