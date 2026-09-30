import React from "react";
import { AbsoluteFill } from "remotion";
import { Caption, MiniPage, Pointer, Smear } from "./kit";
import { CX, CY, K, P, SITE, clamp01, ez, lerp, pressAt, prog, rnd, useT, zoom } from "./look";

const PR = K.problem;
const COLS = 9;
const ROWS = 6;
const DX = 380;
const DY = 270;

const TITLES = [
  "Hilfe", "FAQ", "Konto", "Preise", "Downloads", "Kontakt", "Blog", "Service", "Produkte", "Karriere",
  "Presse", "Versand", "Rechnungen", "Tarife", "Support", "Updates", "Anleitungen", "Team", "Partner", "Status",
  "Datenschutz", "Impressum", "Einstellungen", "Rückgabe", "Termine", "Formulare", "News", "Über uns",
];
const slug = (s: string) => s.toLowerCase().replace(/ü/g, "ue").replace(/ /g, "-");

type Page = { x: number; y: number; title: string; path: string; seed: number };
export const PAGES: Page[] = Array.from({ length: COLS * ROWS }, (_, i) => {
  const c = i % COLS;
  const r = Math.floor(i / COLS);
  const title = TITLES[(i * 7) % TITLES.length];
  const parent = TITLES[(i * 3 + 5) % TITLES.length];
  return {
    x: (c - (COLS - 1) / 2) * DX + (rnd(i, 2) - 0.5) * 60,
    y: (r - (ROWS - 1) / 2) * DY + (rnd(i, 3) - 0.5) * 40,
    title,
    path: `${SITE}/${slug(parent)}/${slug(title)}`,
    seed: i,
  };
});

// The pages the pointer clicks through, one per click, deeper and more lost.
const VISITS: { cell: number; title: string; path: string }[] = [
  { cell: 2 * COLS + 4, title: "Start", path: SITE },
  { cell: 1 * COLS + 6, title: "Hilfe", path: `${SITE}/hilfe` },
  { cell: 3 * COLS + 7, title: "FAQ", path: `${SITE}/hilfe/faq` },
  { cell: 4 * COLS + 2, title: "Downloads", path: `${SITE}/service/downloads` },
  { cell: 1 * COLS + 1, title: "Konto", path: `${SITE}/konto` },
  { cell: 4 * COLS + 5, title: "Blog", path: `${SITE}/blog/2024/update` },
  { cell: 0 * COLS + 3, title: "Kontakt", path: `${SITE}/hilfe/kontakt` },
  { cell: 5 * COLS + 7, title: "Einstellungen", path: `${SITE}/konto/profil` },
];
for (const v of VISITS) Object.assign(PAGES[v.cell], { title: v.title, path: v.path });

const ZOOMS = [3.3, 2.9, 2.5, 2.1, 1.75, 1.45, 1.2, 0.95];

/** Which visit the camera is on, and how far the whip to the next one has gone. */
const cameraAt = (t: number) => {
  const times = [PR.start, ...PR.clicks];
  let i = 0;
  while (i < times.length - 1 && t >= times[i + 1]) i++;
  const next = Math.min(i + 1, VISITS.length - 1);
  const leave = i < times.length - 1 ? prog(t, times[i + 1] - 0.2, times[i + 1] + 0.02, ez.whip) : 0;
  const a = PAGES[VISITS[i].cell];
  const b = PAGES[VISITS[next].cell];
  let x = lerp(a.x, b.x, leave);
  let y = lerp(a.y, b.y, leave);
  let z = zoom(ZOOMS[i], ZOOMS[next], leave);
  // Entry: pushed in on the first page, pulled back into the grid.
  z *= zoom(1.6, 1, prog(t, PR.start, PR.start + 0.45, ez.out));
  // Before the implosion the camera backs out over the whole jungle.
  const out = prog(t, PR.clicks[PR.clicks.length - 1] + 0.05, PR.implode + 0.1, ez.inOut);
  x = lerp(x, 0, out);
  y = lerp(y, 0, out);
  z = zoom(z, 0.55, out);
  return { x, y, z, i };
};

export const Problem: React.FC = () => {
  const t = useT();
  if (t < PR.start || t >= K.reveal.iris) return null;
  const cam = cameraAt(t);
  const prev = cameraAt(t - 1 / 60);
  const speed = Math.hypot(cam.x - prev.x, cam.y - prev.y) * cam.z;
  const implode = (d: number) => prog(t, PR.implode + d * 0.12, PR.dot - 0.05 + d * 0.05, ez.in);
  const visitedUpTo = cam.i;
  const trail = VISITS.slice(0, visitedUpTo + 1).map((v) => PAGES[v.cell]);
  const press = Math.max(...PR.clicks.map((c) => pressAt(t, c)));
  const pointerOn = 1 - prog(t, PR.clicks[PR.clicks.length - 1] + 0.1, PR.implode, ez.out);
  const dotIn = prog(t, PR.dot - 0.1, PR.dot + 0.05, ez.out);
  return (
    <AbsoluteFill style={{ background: P.ink }}>
      <Smear id="problem-whip" x={Math.min(speed * 0.35, 30)} y={Math.min(speed * 0.08, 6)}>
        <div
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            transformOrigin: "0 0",
            transform: `translate(${CX}px, ${CY}px) scale(${cam.z}) translate(${-cam.x}px, ${-cam.y}px)`,
          }}
        >
          <svg style={{ position: "absolute", left: -3000, top: -2000, overflow: "visible" }} width={6000} height={4000}>
            <polyline
              points={trail.map((p) => `${p.x + 3000},${p.y + 2000}`).join(" ")}
              fill="none"
              stroke={P.accent}
              strokeWidth={4 / Math.max(cam.z, 0.5)}
              strokeDasharray="10 12"
              opacity={0.85 * (1 - implode(0))}
            />
          </svg>
          {PAGES.map((p, i) => {
            const d = Math.hypot(p.x, p.y) / 1800;
            const k = implode(1 - clamp01(d));
            const current = VISITS[cam.i].cell === i;
            const visited = VISITS.slice(0, visitedUpTo + 1).some((v) => v.cell === i);
            return (
              <div
                key={i}
                style={{
                  position: "absolute",
                  left: lerp(p.x, 0, k) - 150,
                  top: lerp(p.y, 0, k) - 100,
                  width: 300,
                  height: 200,
                  transform: `scale(${1 - k}) rotate(${(rnd(i, 9) - 0.5) * 40 * k}deg)`,
                  opacity: current ? 1 : visited ? 0.85 : 0.6,
                }}
              >
                <MiniPage title={p.title} path={p.path} dark seed={p.seed} hot={current ? 1 : 0} />
              </div>
            );
          })}
        </div>
      </Smear>
      <Pointer x={CX + 70} y={CY + 50} opacity={pointerOn} press={press} light />
      {dotIn > 0 ? (
        <div
          style={{
            position: "absolute",
            left: CX - 9,
            top: CY - 9,
            width: 18,
            height: 18,
            borderRadius: 9,
            background: P.accent,
            transform: `scale(${dotIn * (1 + 0.25 * Math.sin((t - PR.dot) * Math.PI * 4))})`,
          }}
        />
      ) : null}
      <Caption text="Die Info steht *irgendwo.*" from={PR.start + 0.08} to={PR.clicks[1] + 0.45} dark />
      <Caption text="Du klickst. *Jedes Mal wieder.*" from={PR.clicks[2] + 0.02} to={PR.implode - 0.02} dark />
    </AbsoluteFill>
  );
};
