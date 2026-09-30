import { Frown, Search } from "lucide-react";
import React from "react";
import { Easing, interpolateColors } from "remotion";
import { BAR, BH, BW, Browser, Page, Tab } from "./Browser";
import { Box, Cursor, mixRect } from "./kit";
import { C, SHADOW, T, TEXT, clamp01, ease, lerp, prog } from "./theme";

const DOT = { x: 0, y: 0, w: 28, h: 28, r: 14 };
const WIN = { x: 0, y: 0, w: BW, h: BH, r: 26 };
/** Window-local point → world point (the front window is centred on the origin). */
const world = (x: number, y: number) => ({ x: x - BW / 2, y: y - BH / 2 });

const [c1, c2, c3] = T.clicks;
const FRONT_TABS: Tab[] = [
  { label: "Start", at: 0.75 },
  { label: "Hilfe", at: c1 + 0.05 },
  { label: "FAQ", at: c2 + 0.05 },
  { label: "Einstellungen", at: c3 + 0.05 },
];
const FRONT_PAGES: { page: Page; at: number }[] = [
  { page: "start", at: 0 },
  { page: "hilfe", at: c1 + 0.05 },
  { page: "faq", at: c2 + 0.05 },
  { page: "konto", at: c3 + 0.05 },
];

// The windows the zoom-out reveals, each already crowded with tabs.
const LABELS = ["Preise", "Kontakt", "Blog", "Downloads", "Support", "Doku", "Login", "Suche", "Über uns", "Hilfe", "Team"];
const OTHERS = [
  { x: -720, y: -360, page: "faq" as Page },
  { x: 720, y: -360, page: "hilfe" as Page },
  { x: -720, y: 360, page: "konto" as Page },
  { x: 720, y: 360, page: "start" as Page },
].map((o, i) => ({
  ...o,
  at: T.zoomOut + 0.4 + i * 0.06,
  tabs: Array.from({ length: 6 + (i % 3) }, (_, k) => ({ label: LABELS[(i * 3 + k) % LABELS.length], at: T.zoomOut + 0.45 + i * 0.06 + k * 0.08 })),
}));

const hilfe = world(830, BAR + 56 + 35);
const faqCard = world(320, 365);
const faqRow = world(590, 503);

export const Problem: React.FC<{ t: number }> = ({ t }) => {
  if (t > T.stop + 0.05) return null;

  // Dot → window, window → dot. The box is the one element that carries the story.
  const grow = prog(t, T.browserIn, T.browserIn + 0.55, Easing.bezier(0.7, 0, 0.2, 1.12));
  const shrink = prog(t, T.collapse + 0.03, T.stop, Easing.bezier(0.5, 0, 0.75, 0));
  const pop = prog(t, T.dotIn, T.dotIn + 0.25, ease.back);
  const rect = mixRect(mixRect(DOT, WIN, grow), DOT, shrink);
  const white = t < T.collapse ? grow : 1 - shrink;
  const bg = interpolateColors(clamp01(white * 3), [0, 1], [C.ink, C.white]);
  const content = Math.min(prog(t, T.browserIn + 0.35, T.browserIn + 0.65, ease.out), 1 - prog(t, T.collapse, T.collapse + 0.12));
  // "Keine Treffer": the window shakes once.
  const shake = t > T.empty && t < T.empty + 0.3 ? Math.sin((t - T.empty) * 70) * 12 * (1 - (t - T.empty) / 0.3) : 0;

  // Background windows: spring in on the zoom-out, get sucked back into the front one.
  const back = prog(t, T.zoomOut + 0.8, T.zoomOut + 1.1, ease.in);

  return (
    <>
      {OTHERS.map((o, i) => {
        const s = prog(t, o.at, o.at + 0.45, ease.back);
        if (s <= 0 || back >= 1) return null;
        return (
          <Box
            key={i}
            x={lerp(o.x, 0, back)}
            y={lerp(o.y, 0, back)}
            w={BW}
            h={BH}
            r={26}
            opacity={Math.min(1, s * 2) * (1 - back)}
            scaleX={lerp(0.6, 1, s) * lerp(1, 0.5, back)}
            scaleY={lerp(0.6, 1, s) * lerp(1, 0.5, back)}
          >
            <Browser t={t} tabs={o.tabs} url={TEXT.domain} pages={[{ page: o.page, at: 0 }]} />
          </Box>
        );
      })}
      <Box
        x={rect.x + shake}
        y={rect.y}
        w={rect.w}
        h={rect.h}
        r={rect.r}
        bg={bg}
        shadow={white > 0.5 ? SHADOW : "none"}
        scaleX={pop}
        scaleY={pop}
      >
        {content > 0 && (
          <div style={{ position: "absolute", left: rect.w / 2 - BW / 2, top: rect.h / 2 - BH / 2, width: BW, height: BH }}>
            <Browser t={t} tabs={FRONT_TABS} url={TEXT.domain} pages={FRONT_PAGES} active={t > c1 ? 1 : -1} content={content}>
              <SearchOverlay t={t} />
            </Browser>
          </div>
        )}
      </Box>
      <Cursor
        t={t}
        show={[2.2, T.zoomOut + 0.3]}
        clicks={[c1, c2, c3]}
        path={[
          { t: 2.2, x: 420, y: 330 },
          { t: c1 - 0.1, x: hilfe.x, y: hilfe.y },
          { t: c1 + 0.35, x: hilfe.x, y: hilfe.y },
          { t: c2 - 0.1, x: faqCard.x, y: faqCard.y },
          { t: c2 + 0.35, x: faqCard.x, y: faqCard.y },
          { t: c3 - 0.1, x: faqRow.x, y: faqRow.y },
          { t: c3 + 1, x: faqRow.x + 40, y: faqRow.y + 30 },
        ]}
      />
    </>
  );
};

/** The site search, which finds nothing. */
const SearchOverlay: React.FC<{ t: number }> = ({ t }) => {
  const at = T.search;
  const p = prog(t, at, at + 0.35, ease.out);
  if (p <= 0) return null;
  const miss = prog(t, T.empty, T.empty + 0.3, ease.back);
  const typed = Math.floor(clamp01((t - at - 0.1) / 0.45) * "Passwort ändern".length);
  return (
    <div style={{ position: "absolute", inset: 0, top: BAR + 56, background: `rgba(255,255,255,${0.75 * p})` }}>
      <div
        style={{
          position: "absolute",
          left: 190,
          width: 800,
          top: 70,
          opacity: p,
          transform: `translateY(${(1 - p) * 30}px)`,
        }}
      >
        <div
          style={{
            height: 88,
            borderRadius: 44,
            background: C.white,
            boxShadow: SHADOW,
            display: "flex",
            alignItems: "center",
            gap: 18,
            padding: "0 34px",
            fontSize: 34,
            fontWeight: 600,
          }}
        >
          <Search size={32} color={C.sub} />
          {"Passwort ändern".slice(0, typed)}
          <div style={{ width: 3, height: 38, background: C.accent, opacity: Math.floor(t * 3) % 2 ? 1 : 0.2 }} />
        </div>
        <div
          style={{
            marginTop: 18,
            height: 150,
            borderRadius: 28,
            background: C.white,
            boxShadow: SHADOW,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 18,
            fontSize: 34,
            fontWeight: 700,
            color: C.sub,
            opacity: miss > 0 ? 1 : 0,
            transform: `scale(${lerp(0.85, 1, miss)})`,
          }}
        >
          <Frown size={40} color={C.sub} />
          Keine Treffer
        </div>
      </div>
    </div>
  );
};
