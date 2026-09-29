import { Plus } from "lucide-react";
import { useCurrentFrame } from "remotion";
import { Words, words } from "../Caption";
import { C, CX, FPS, SHADOW_SM, ease, heading, prog, ui } from "../theme";
import { PAGE } from "./layout";
import { E, SITE } from "./timeline";

// The problem: somebody clicks from page to page and still has no answer.
// The page itself is the morphing box; this file draws what is on it, the
// pages left behind, and the caption.

const BAR = 54;
const NAV = [
  { label: "Produkte", x: 44, w: 132 },
  { label: "Preise", x: 190, w: 102 },
  { label: "Service", x: 306, w: 118 },
  { label: "Über uns", x: 438, w: 128 },
];
const NAV_Y = 74;
const NAV_H = 40;

/** Each page and the nav item that is active on it. */
const PAGES = [
  { path: "", nav: -1 },
  { path: "/service", nav: 2 },
  { path: "/service/faq", nav: 2 },
  { path: "/ueber-uns", nav: 3 },
];

const BOX = { left: PAGE.cx - PAGE.w / 2, top: PAGE.cy - PAGE.h / 2 };
const FAQ_LINK = { x: 44, y: 270, w: 60, h: 44 };

/** Where the cursor clicks, in frame coordinates. */
export const PAIN_TARGETS = [
  { x: BOX.left + NAV[2].x + NAV[2].w / 2, y: BOX.top + NAV_Y + NAV_H / 2 },
  { x: BOX.left + FAQ_LINK.x + FAQ_LINK.w / 2, y: BOX.top + FAQ_LINK.y + FAQ_LINK.h / 2 },
  { x: BOX.left + NAV[3].x + NAV[3].w / 2, y: BOX.top + NAV_Y + NAV_H / 2 },
];

const swapAt = (k: number) => E.clicks[k] + 0.12;
const pageIndex = (t: number) => E.clicks.filter((_, k) => t >= swapAt(k) + 0.2).length;
const flash = (t: number, at: number) => prog(t, at - 0.06, at, ease.out) * (1 - prog(t, at + 0.05, at + 0.35, ease.out));

const Line: React.FC<{ x: number; y: number; w: number; h?: number; color?: string }> = ({ x, y, w, h = 12, color = "#f0e9e1" }) => (
  <div style={{ position: "absolute", left: x, top: y, width: w, height: h, borderRadius: h, background: color }} />
);

const Heading: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div style={{ position: "absolute", left: 44, top: 150, fontFamily: heading, fontWeight: 800, fontSize: 42, color: C.ink, letterSpacing: "-0.02em" }}>
    {children}
  </div>
);

const Body: React.FC<{ k: number; t: number }> = ({ k, t }) => {
  if (k === 0)
    return (
      <>
        <Line x={44} y={160} w={330} h={26} color={`${C.orange}33`} />
        <Line x={44} y={206} w={300} />
        <Line x={44} y={230} w={250} />
        <Line x={44} y={254} w={280} />
        <div style={{ position: "absolute", left: 44, top: 296, width: 150, height: 44, borderRadius: 22, background: "#f3ece4" }} />
        <div
          style={{
            position: "absolute",
            right: 44,
            top: 150,
            width: 330,
            height: 220,
            borderRadius: 18,
            background: `linear-gradient(135deg, ${C.orange}26, ${C.red}20)`,
          }}
        />
      </>
    );
  if (k === 1)
    return (
      <>
        <Heading>Service</Heading>
        {["Hilfe-Center", "FAQ", "Kontakt"].map((label, i) => (
          <div
            key={label}
            style={{
              position: "absolute",
              left: FAQ_LINK.x - 8,
              top: 226 + i * 44,
              height: FAQ_LINK.h,
              padding: "0 8px",
              borderRadius: 10,
              display: "flex",
              alignItems: "center",
              fontSize: 26,
              fontWeight: 600,
              color: C.accent,
              textDecoration: "underline",
              textUnderlineOffset: 5,
              background: i === 1 ? `${C.orange}${Math.round(flash(t, E.clicks[1]) * 40).toString(16).padStart(2, "0")}` : undefined,
            }}
          >
            {label}
          </div>
        ))}
        <Line x={440} y={236} w={300} />
        <Line x={440} y={262} w={240} />
        <Line x={440} y={288} w={270} />
      </>
    );
  if (k === 2)
    return (
      <>
        <Heading>Häufige Fragen</Heading>
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            style={{
              position: "absolute",
              left: 44,
              right: 44,
              top: 226 + i * 52,
              height: 44,
              borderRadius: 12,
              background: "#faf6f1",
              display: "flex",
              alignItems: "center",
              gap: 16,
              padding: "0 18px",
            }}
          >
            <Plus size={20} color={C.muted} strokeWidth={2.5} />
            <div style={{ width: [320, 260, 380, 290][i], height: 11, borderRadius: 11, background: "#ebe2d8" }} />
          </div>
        ))}
      </>
    );
  return (
    <>
      <Heading>Über uns</Heading>
      <Line x={44} y={226} w={420} />
      <Line x={44} y={250} w={380} />
      <Line x={44} y={274} w={400} />
      {[0, 1, 2].map((i) => (
        <div key={i} style={{ position: "absolute", left: 44 + i * 120, top: 316, width: 84, height: 84, borderRadius: 42, background: `${C.orange}${["22", "30", "1a"][i]}` }} />
      ))}
    </>
  );
};

/** The page inside the box: a fixed header, content that slides on each click. */
export const PainContent: React.FC<{ t: number }> = ({ t }) => {
  const current = pageIndex(t);
  const nav = PAGES[current].nav;
  return (
    <div style={{ position: "absolute", left: "50%", top: "50%", width: PAGE.w, height: PAGE.h, marginLeft: -PAGE.w / 2, marginTop: -PAGE.h / 2, fontFamily: ui }}>
      <div style={{ position: "absolute", left: 0, right: 0, height: BAR, borderBottom: `1px solid ${C.line}`, display: "flex", alignItems: "center", gap: 8, paddingLeft: 20 }}>
        {["#ff8a80", "#ffd166", "#7bdcb5"].map((c) => (
          <div key={c} style={{ width: 12, height: 12, borderRadius: 6, background: c }} />
        ))}
        <div style={{ marginLeft: 14, padding: "6px 16px", borderRadius: 20, background: "#f8f3ed", fontSize: 19, fontWeight: 500, color: C.muted }}>
          {SITE}
          <span style={{ color: C.ink }}>{PAGES[current].path}</span>
        </div>
      </div>

      {NAV.map((n, i) => {
        const pressed = i === 2 ? flash(t, E.clicks[0]) : i === 3 ? flash(t, E.clicks[2]) : 0;
        return (
          <div
            key={n.label}
            style={{
              position: "absolute",
              left: n.x,
              top: NAV_Y,
              width: n.w,
              height: NAV_H,
              borderRadius: NAV_H / 2,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 19,
              fontWeight: 600,
              color: i === nav ? C.accent : C.text,
              background: i === nav || pressed > 0.01 ? `${C.orange}${pressed > 0.01 ? "30" : "18"}` : "transparent",
            }}
          >
            {n.label}
          </div>
        );
      })}
      <div style={{ position: "absolute", right: 44, top: NAV_Y + 8, width: 110, height: 24, borderRadius: 12, background: "#f0e9e1" }} />

      {PAGES.map((_, k) => {
        // The old page leaves before the new one arrives, so they never overlap.
        const inP = k === 0 ? 1 : prog(t, swapAt(k - 1) + 0.2, swapAt(k - 1) + 0.6, ease.out);
        const outP = k === PAGES.length - 1 ? 0 : prog(t, swapAt(k), swapAt(k) + 0.22, ease.in);
        const o = inP * (1 - outP);
        if (o <= 0.001) return null;
        return (
          <div
            key={k}
            style={{
              position: "absolute",
              inset: 0,
              opacity: o,
              transform: `translateX(${(1 - inP) * 70 - outP * 70}px)`,
              filter: `blur(${(1 - inP) * 8 + outP * 8}px)`,
            }}
          >
            <Body k={k} t={t} />
          </div>
        );
      })}
    </div>
  );
};

/** Pages already visited pile up behind the current one. */
export const Ghosts: React.FC = () => {
  const t = useCurrentFrame() / FPS;
  if (t < E.clicks[0] || t > E.pageOut + 0.5) return null;
  const out = prog(t, E.pageOut - 0.1, E.pageOut + 0.35, ease.in);
  return (
    <>
      {E.clicks.map((_, k) => {
        const level = E.clicks.slice(k).reduce((sum, __, j) => sum + prog(t, swapAt(k + j), swapAt(k + j) + 0.5, ease.inOut), 0);
        if (level <= 0) return null;
        return (
          <div
            key={k}
            style={{
              position: "absolute",
              left: PAGE.cx - PAGE.w / 2,
              top: PAGE.cy - PAGE.h / 2,
              width: PAGE.w,
              height: PAGE.h,
              borderRadius: PAGE.r,
              background: "white",
              boxShadow: SHADOW_SM,
              outline: `1px solid ${C.line}`,
              transformOrigin: "50% 0%",
              transform: `translate(${level * 30}px, ${level * -20}px) scale(${1 - level * 0.035})`,
              opacity: Math.min(1, level * 2) * (1 - level * 0.2) * (1 - out),
            }}
          >
            <Line x={44} y={24} w={200} />
          </div>
        );
      })}
    </>
  );
};

/** "Klick. Klick. Klick." in time with the clicks, then the question. */
export const PainCaption: React.FC = () => (
  <div style={{ position: "absolute", top: 118, left: CX - 880, width: 1760 }}>
    <Words words={words("Klick. Klick. Klick.")} start={E.clicks[0]} end={E.pageOut} size={66} stagger={E.clicks[1] - E.clicks[0]} />
    <div style={{ marginTop: 4 }}>
      <Words words={words("*Wo stand das nochmal?*")} start={E.lost} end={E.pageOut} size={66} stagger={0.08} />
    </div>
  </div>
);
