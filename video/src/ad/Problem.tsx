import React from "react";
import { AbsoluteFill } from "remotion";
import { Dot, Pointer, Smear, Stack, Tile } from "./kit";
import { CX, CY, K, SITE, clamp01, ez, lerp, pressAt, prog, rnd, useT, zoom } from "./look";

const HK = K.hook;
const PR = K.problem;

/** "Wo / stand / das / nochmal?" stacks up on the voice, then whips up and away. */
export const Hook: React.FC = () => {
  const t = useT();
  if (t >= HK.out + 0.3) return null;
  const words = ["Wo", "stand", "das", "nochmal?"].map((text, i) => ({ text, at: HK.words[i] }));
  return <Stack words={words} out={HK.out} />;
};

const COLS = 6;
const ROWS = 4;
const TW = 200;
const TH = 134;
const DX = 250;
const DY = 185;
const TITLES = ["Start", "Hilfe", "FAQ", "Konto", "Preise", "Service", "Downloads", "Kontakt", "Blog", "Support", "Profil", "Tarife"];
const cell = (c: number, r: number) => r * COLS + c;
const TILES = Array.from({ length: COLS * ROWS }, (_, i) => {
  const c = i % COLS;
  const r = Math.floor(i / COLS);
  const title = TITLES[(i * 5) % TITLES.length];
  return { x: (c - (COLS - 1) / 2) * DX, y: (r - (ROWS - 1) / 2) * DY, title, path: `${SITE}/${title.toLowerCase()}` };
});

// Back and forth along one row, then lost in the others.
const VISITS = [cell(2, 1), cell(4, 1), cell(1, 1), cell(5, 1), cell(0, 2), cell(3, 0), cell(2, 3), cell(4, 2)];
const ZOOM_IN = 4.2;

const camAt = (t: number) => {
  const times = [PR.start, ...PR.switches];
  let i = 0;
  while (i < times.length - 1 && t >= times[i + 1] - 0.1) i++;
  const next = Math.min(i + 1, VISITS.length - 1);
  const go = i < times.length - 1 ? prog(t, times[i + 1] - 0.1, times[i + 1] + 0.12, ez.whip) : 0;
  const a = TILES[VISITS[i]];
  const b = TILES[VISITS[next]];
  const over = prog(t, PR.overview, PR.overview + 0.7, ez.inOut);
  return {
    x: lerp(lerp(a.x, b.x, go), 0, over),
    y: lerp(lerp(a.y, b.y, go), 0, over),
    z: zoom(ZOOM_IN, 1, over),
    i: go > 0.5 ? next : i,
  };
};

export const Problem: React.FC = () => {
  const t = useT();
  if (t < PR.start || t >= K.reveal.logo) return null;
  const cam = camAt(t);
  const prev = camAt(t - 1 / 60);
  const speed = Math.hypot(cam.x - prev.x, cam.y - prev.y) * cam.z;
  // The first page arrives from below as the hook leaves upwards.
  const enter = prog(t, PR.start, PR.start + 0.3, ez.out);
  const implode = prog(t, PR.implode, PR.dot, ez.in);
  const press = Math.max(...PR.switches.map((s) => pressAt(t, s - 0.12)));
  const pointer = prog(t, PR.start + 0.2, PR.start + 0.4, ez.out) * (1 - prog(t, PR.overview, PR.overview + 0.2, ez.out));
  const visited = VISITS.slice(0, cam.i + 1).map((v) => TILES[v]);
  const trail = prog(t, PR.overview + 0.2, PR.overview + 0.9, ez.inOut);
  return (
    <AbsoluteFill>
      <Smear id="problem-whip" x={Math.min(speed * 0.4, 36)} y={(1 - enter) * 20}>
        <div
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            transformOrigin: "0 0",
            transform: `translate(${CX}px, ${CY + (1 - enter) * 900}px) scale(${cam.z}) translate(${-cam.x}px, ${-cam.y}px)`,
          }}
        >
          <svg style={{ position: "absolute", left: -2000, top: -2000, overflow: "visible" }} width={4000} height={4000}>
            <polyline
              points={visited.map((p) => `${p.x + 2000},${p.y + 2000}`).join(" ")}
              fill="none"
              stroke="#ea580c"
              strokeWidth={3}
              pathLength={1}
              style={{ strokeDasharray: `${trail} 1` }}
              opacity={1 - prog(t, PR.implode, PR.implode + 0.12, ez.out)}
            />
          </svg>
          {TILES.map((p, i) => {
            const d = Math.hypot(p.x, p.y) / 900;
            const k = prog(t, PR.implode + clamp01(1 - d) * 0.15, PR.dot - 0.02, ez.in);
            const current = VISITS[cam.i] === i && t < PR.overview + 0.4;
            const seen = VISITS.slice(0, cam.i + 1).includes(i);
            return (
              <div
                key={i}
                style={{
                  position: "absolute",
                  left: lerp(p.x, 0, k) - TW / 2,
                  top: lerp(p.y, 0, k) - TH / 2,
                  width: TW,
                  height: TH,
                  transform: `scale(${1 - k}) rotate(${(rnd(i, 4) - 0.5) * 30 * k}deg)`,
                }}
              >
                <Tile w={TW} h={TH} seed={i} title={p.title} path={p.path} hot={current} read={seen && !current ? 0.6 : 0} />
              </div>
            );
          })}
        </div>
      </Smear>
      <Pointer x={CX + 150} y={CY + 60} opacity={pointer} press={press} />
      <Dot scale={prog(t, PR.dot - 0.08, PR.dot + 0.05, ez.out)} pulseFrom={PR.dot} />
    </AbsoluteFill>
  );
};
