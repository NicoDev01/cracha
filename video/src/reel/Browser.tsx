import { ChevronDown, Search } from "lucide-react";
import React from "react";
import { Line } from "./kit";
import { C, FONT, clamp01, ease, lerp } from "./theme";

export const BW = 1180;
export const BH = 680;
export const BAR = 64;
export const ADDR = 56;
export const NAV = 70;

export const MENU = ["Produkt", "Hilfe", "Preise", "Konto"];
export const MENU_X = [700, 830, 950, 1070]; // item centres, window-local

export type Tab = { label: string; at: number };

/** Tabs that spring open one by one; the strip squeezes them when it runs full. */
const Tabs: React.FC<{ t: number; tabs: Tab[]; width: number }> = ({ t, tabs, width }) => {
  const open = tabs.map((tab) => clamp01((t - tab.at) / 0.3));
  const total = open.reduce((a, b) => a + ease.back(b), 0);
  const tabW = Math.min(210, (width - 150) / Math.max(1, total));
  const active = open.reduce((a, o, i) => (o > 0 ? i : a), 0);
  return (
    <div style={{ position: "absolute", left: 130, bottom: 0, height: 46, display: "flex", gap: 0 }}>
      {tabs.map((tab, i) => {
        const o = ease.back(open[i]);
        if (o <= 0) return null;
        const on = i === active;
        return (
          <div
            key={i}
            style={{
              width: tabW * o,
              height: 46,
              borderRadius: "14px 14px 0 0",
              background: on ? C.white : "transparent",
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "0 14px",
              overflow: "hidden",
              whiteSpace: "nowrap",
              fontSize: 20,
              fontWeight: 600,
              color: on ? C.ink : C.sub,
              borderRight: on ? "none" : `2px solid ${C.line}`,
              boxSizing: "border-box",
            }}
          >
            <div style={{ width: 16, height: 16, borderRadius: 5, background: on ? C.accent : "#d8d2cb", flexShrink: 0 }} />
            {tab.label}
          </div>
        );
      })}
    </div>
  );
};

export type Page = "start" | "hilfe" | "faq" | "konto";

const TITLE: Record<Page, string> = { start: "Willkommen", hilfe: "Hilfe-Center", faq: "Häufige Fragen", konto: "Einstellungen" };

/** The site's body for each page the cursor clicks through. */
const Body: React.FC<{ page: Page; p: number }> = ({ page, p }) => (
  <div
    style={{
      position: "absolute",
      left: 60,
      right: 60,
      top: BAR + ADDR + NAV + 34,
      opacity: p,
      transform: `translateY(${(1 - p) * 26}px)`,
    }}
  >
    <div style={{ fontSize: 50, fontWeight: 800, letterSpacing: "-0.03em", marginBottom: 26 }}>{TITLE[page]}</div>
    {page === "start" && (
      <>
        <Line w={720} style={{ marginBottom: 14 }} />
        <Line w={560} style={{ marginBottom: 40 }} />
        <div style={{ display: "flex", gap: 24 }}>
          {[0, 1, 2].map((i) => (
            <div key={i} style={{ flex: 1, height: 170, borderRadius: 20, background: C.soft, padding: 24, boxSizing: "border-box" }}>
              <Line w={120} h={18} color="#e2dcd5" style={{ marginBottom: 16 }} />
              <Line w="90%" style={{ marginBottom: 10 }} />
              <Line w="70%" />
            </div>
          ))}
        </div>
      </>
    )}
    {page === "hilfe" && (
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
        {["FAQ", "Anleitungen", "Konto", "Downloads"].map((l) => (
          <div key={l} style={{ height: 110, borderRadius: 20, background: C.soft, padding: "0 28px", display: "flex", alignItems: "center", gap: 18 }}>
            <div style={{ width: 44, height: 44, borderRadius: 14, background: "#e2dcd5" }} />
            <span style={{ fontSize: 30, fontWeight: 700 }}>{l}</span>
          </div>
        ))}
      </div>
    )}
    {page === "faq" &&
      [0, 1, 2, 3].map((i) => (
        <div
          key={i}
          style={{
            height: 66,
            borderRadius: 16,
            background: C.soft,
            marginBottom: 14,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0 26px",
          }}
        >
          <Line w={[520, 420, 600, 380][i]} h={16} color="#e2dcd5" />
          <ChevronDown size={28} color={C.sub} />
        </div>
      ))}
    {page === "konto" && (
      <div style={{ display: "flex", gap: 24 }}>
        <div style={{ width: 280, display: "flex", flexDirection: "column", gap: 14 }}>
          {[0, 1, 2, 3, 4].map((i) => (
            <Line key={i} w={[200, 160, 220, 140, 180][i]} h={18} color="#e2dcd5" />
          ))}
        </div>
        <div style={{ flex: 1, height: 260, borderRadius: 20, background: C.soft, padding: 28, boxSizing: "border-box" }}>
          <Line w="60%" h={18} color="#e2dcd5" style={{ marginBottom: 18 }} />
          <Line w="85%" style={{ marginBottom: 12 }} />
          <Line w="75%" style={{ marginBottom: 12 }} />
          <Line w="40%" />
        </div>
      </div>
    )}
  </div>
);

/** A browser window with a website inside; `content` fades the inside in and out. */
export const Browser: React.FC<{
  t: number;
  tabs: Tab[];
  url: string;
  pages: { page: Page; at: number }[];
  active?: number;
  content?: number;
  children?: React.ReactNode;
}> = ({ t, tabs, url, pages, active = -1, content = 1, children }) => {
  const current = pages.reduce((a, pg, i) => (t >= pg.at ? i : a), 0);
  const pg = pages[current];
  const p = current === 0 ? 1 : ease.out(clamp01((t - pg.at) / 0.3));
  return (
    <div style={{ position: "absolute", inset: 0, opacity: content, fontFamily: FONT, color: C.ink }}>
      <div style={{ position: "absolute", left: 0, right: 0, top: 0, height: BAR, background: C.soft }}>
        <div style={{ position: "absolute", left: 30, top: 26, display: "flex", gap: 12 }}>
          {[0, 1, 2].map((i) => (
            <div key={i} style={{ width: 16, height: 16, borderRadius: 8, background: "#ddd6ce" }} />
          ))}
        </div>
        <Tabs t={t} tabs={tabs} width={BW - 40} />
      </div>
      <div
        style={{
          position: "absolute",
          left: 24,
          right: 24,
          top: BAR + 8,
          height: ADDR - 16,
          borderRadius: 20,
          background: C.soft,
          display: "flex",
          alignItems: "center",
          padding: "0 20px",
          fontSize: 21,
          fontWeight: 600,
          color: C.sub,
          gap: 10,
        }}
      >
        <Search size={20} color={C.sub} />
        {url}
      </div>
      <div
        style={{
          position: "absolute",
          left: 60,
          right: 40,
          top: BAR + ADDR,
          height: NAV,
          display: "flex",
          alignItems: "center",
          borderBottom: `2px solid ${C.line}`,
        }}
      >
        <div style={{ width: 34, height: 34, borderRadius: 10, background: C.ink, marginRight: 14 }} />
        <span style={{ fontSize: 28, fontWeight: 800, letterSpacing: "-0.02em" }}>Example</span>
        {MENU.map((m, i) => (
          <div
            key={m}
            style={{
              position: "absolute",
              left: MENU_X[i] - 60 - 60,
              width: 120,
              textAlign: "center",
              fontSize: 24,
              fontWeight: 600,
              color: i === active ? C.ink : C.sub,
            }}
          >
            {m}
            <div
              style={{
                height: 4,
                borderRadius: 2,
                marginTop: 6,
                background: C.accent,
                transform: `scaleX(${i === active ? 1 : 0})`,
              }}
            />
          </div>
        ))}
      </div>
      <Body key={current} page={pg.page} p={lerp(0, 1, p)} />
      {children}
    </div>
  );
};
