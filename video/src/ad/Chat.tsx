import { ArrowUp, Globe, Sparkles } from "lucide-react";
import React from "react";
import { AbsoluteFill } from "remotion";
import { Caption, Pointer, Ring } from "./kit";
import { CX, CY, K, P, SHADOW, SHADOW_SM, SITE, clamp01, ez, lerp, pressAt, prog, sp, ui, useT, wide } from "./look";

const CH = K.chat;
const V = K.verify;

const WIN = { w: 1240, h: 760, cx: CX, cy: CY + 50 };
const WL = WIN.cx - WIN.w / 2;
const WT = WIN.cy - WIN.h / 2;
const INPUT = { x: 28, y: WIN.h - 28 - 88, w: WIN.w - 56, h: 88 };
const SEND = { x: WL + INPUT.x + INPUT.w - 14 - 30, y: WT + INPUT.y + INPUT.h / 2 };
const QUESTION = "Wo ändere ich meine Rechnungsadresse?";
export const SOURCE_PATH = "/hilfe/konto/rechnungsadresse";
const CHIP = { x: 40, y: 430, w: 640, h: 64 };
const CHIP_C = { x: WL + CHIP.x + CHIP.w / 2, y: WT + CHIP.y + CHIP.h / 2 };
const PAGE = { w: 1320, h: 760, cx: CX, cy: CY + 50 };

type Tok = { w: string; mark?: boolean; cite?: boolean; br?: boolean };
const TOKENS: Tok[] = [
  ..."Das geht unter".split(" ").map((w) => ({ w })),
  { w: "Konto › Einstellungen › Rechnungsdaten", mark: true },
  { w: "." },
  ..."Die neue Adresse gilt ab der nächsten Rechnung.".split(" ").map((w) => ({ w })),
  { w: "1", cite: true },
];

const Cite: React.FC<{ glow: number }> = ({ glow }) => (
  <span
    style={{
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      width: 36,
      height: 36,
      borderRadius: 10,
      fontSize: 20,
      fontWeight: 700,
      color: glow > 0.05 ? "white" : P.accent,
      background: glow > 0.05 ? P.accent : P.accentSoft,
      transform: `scale(${1 + glow * 0.15})`,
      verticalAlign: "3px",
    }}
  >
    1
  </span>
);

const ChipContent: React.FC = () => (
  <div style={{ display: "flex", alignItems: "center", gap: 14, height: CHIP.h, padding: "0 26px 0 12px", fontFamily: ui, fontSize: 23, fontWeight: 500, color: P.text, whiteSpace: "nowrap" }}>
    <div style={{ width: 40, height: 40, borderRadius: 20, background: P.accentSoft, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 19, fontWeight: 700, color: P.accent }}>1</div>
    <Globe size={22} color={P.muted} strokeWidth={2} />
    {SITE}
    {SOURCE_PATH}
  </div>
);

/** The original page with the passage marked. Drawn at PAGE size. */
const SourcePage: React.FC<{ t: number }> = ({ t }) => {
  const mark = prog(t, V.mark, V.mark + 0.5, ez.inOut);
  return (
    <div style={{ position: "absolute", left: 0, top: 0, width: PAGE.w, height: PAGE.h, fontFamily: ui, background: "white" }}>
      <div style={{ height: 74, borderBottom: `1px solid ${P.line}`, display: "flex", alignItems: "center", gap: 10, padding: "0 28px" }}>
        {["#ff8a80", "#ffd166", "#7bdcb5"].map((c) => (
          <div key={c} style={{ width: 15, height: 15, borderRadius: 8, background: c }} />
        ))}
        <div style={{ marginLeft: 18, padding: "9px 22px", borderRadius: 24, background: "#f8f3ed", fontSize: 23, fontWeight: 500, color: P.muted }}>
          {SITE}
          <span style={{ color: P.ink }}>{SOURCE_PATH}</span>
        </div>
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 10, padding: "8px 20px 8px 10px", borderRadius: 24, background: P.accentSoft, fontSize: 21, fontWeight: 700, color: P.accent }}>
          <div style={{ width: 30, height: 30, borderRadius: 15, background: P.accent, color: "white", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>1</div>
          Quelle
        </div>
      </div>
      <div style={{ position: "absolute", left: 80, right: 80, top: 130 }}>
        <div style={{ fontSize: 25, fontWeight: 500, color: P.muted }}>Start › Hilfe › Konto › Rechnungsadresse</div>
        <div style={{ marginTop: 14, fontSize: 70, fontWeight: 800, letterSpacing: "-0.03em", color: P.ink }}>Rechnungsadresse ändern</div>
        <div style={{ marginTop: 26, fontSize: 36, lineHeight: 1.65, color: P.text, maxWidth: 1100 }}>
          Deine Rechnungsadresse änderst du jederzeit unter{" "}
          <span
            style={{
              padding: "3px 8px",
              margin: "0 -4px",
              borderRadius: 10,
              fontWeight: 700,
              color: P.ink,
              backgroundImage: `linear-gradient(90deg, ${P.accentMark}, ${P.accentMark})`,
              backgroundRepeat: "no-repeat",
              backgroundSize: `${mark * 100}% 100%`,
              boxDecorationBreak: "clone",
              WebkitBoxDecorationBreak: "clone",
            }}
          >
            Konto › Einstellungen › Rechnungsdaten
          </span>
          . Die neue Adresse gilt ab der nächsten Rechnung.
        </div>
        {[820, 700, 760].map((w, i) => (
          <div key={i} style={{ marginTop: i ? 16 : 44, width: w, height: 16, borderRadius: 16, background: "#f0e9e1" }} />
        ))}
      </div>
    </div>
  );
};

export const Chat: React.FC = () => {
  const t = useT();
  if (t < CH.open || t >= K.finale.words[0]) return null;
  // The "ready" pill grows into the chat window.
  const open = prog(t, CH.open, CH.open + 0.4, ez.inOut);
  const w = lerp(600, WIN.w, open);
  const h = lerp(96, WIN.h, open);
  const cy = lerp(CY + 198, WIN.cy, open);
  const inner = clamp01((t - CH.open - 0.25) / 0.2);
  const typedN = Math.round(prog(t, CH.typeStart, CH.typeEnd, (x) => x) * QUESTION.length);
  const sent = t >= CH.send;
  const rise = prog(t, CH.send, CH.send + 0.35, ez.out);
  const press = pressAt(t, CH.send);
  const searching = t >= CH.search && t < CH.answer + 0.1;
  const perWord = 1.1 / TOKENS.length;
  const markP = prog(t, CH.answer + 1.2, CH.answer + 1.55, ez.inOut);
  const chip = sp(t, CH.source, 11, 200);
  const clickP = pressAt(t, V.click);
  // Verify: the chip grows into the source page, the chat falls back.
  const dive = prog(t, V.click, V.click + 0.5, ez.whip);
  const diving = t >= V.click;
  const implode = prog(t, V.implode, V.dot - 0.05, ez.in);
  const sweep = ((t - CH.search) * 170) % 180 - 40;
  const cursorPath = [
    { at: CH.typeEnd - 0.4, x: 1600, y: 1040 },
    { at: CH.send - 0.1, x: SEND.x + 6, y: SEND.y + 6 },
    { at: CH.source + 0.4, x: SEND.x + 6, y: SEND.y + 6 },
    { at: V.click - 0.1, x: CHIP_C.x + 60, y: CHIP_C.y + 8 },
  ];
  let cx = cursorPath[0].x;
  let cyy = cursorPath[0].y;
  for (let i = 1; i < cursorPath.length; i++) {
    const p = prog(t, cursorPath[i - 1].at, cursorPath[i].at, ez.inOut);
    if (t >= cursorPath[i - 1].at) {
      cx = lerp(cursorPath[i - 1].x, cursorPath[i].x, p);
      cyy = lerp(cursorPath[i - 1].y, cursorPath[i].y, p);
    }
  }
  const cursorO = prog(t, CH.typeEnd - 0.4, CH.typeEnd - 0.2, ez.out) * (1 - prog(t, V.click + 0.15, V.click + 0.35, ez.out));

  const pw = lerp(CHIP.w, PAGE.w, dive);
  const ph = lerp(CHIP.h, PAGE.h, dive);
  const pcx = lerp(CHIP_C.x, PAGE.cx, dive);
  const pcy = lerp(CHIP_C.y, PAGE.cy, dive);
  const shrink = 1 - implode;
  return (
    <AbsoluteFill>
      <AbsoluteFill
        style={{
          transformOrigin: `${CHIP_C.x}px ${CHIP_C.y}px`,
          transform: `scale(${1 + dive * 0.25})`,
          filter: dive > 0.01 ? `blur(${dive * 12}px)` : undefined,
          opacity: (1 - dive * 0.9) * (1 - prog(t, V.implode, V.implode + 0.3, ez.out)),
        }}
      >
        <div
          style={{
            position: "absolute",
            left: CX - w / 2,
            top: cy - h / 2,
            width: w,
            height: h,
            borderRadius: lerp(48, 30, open),
            background: P.card,
            boxShadow: SHADOW,
            overflow: "hidden",
            fontFamily: ui,
          }}
        >
          <div style={{ opacity: inner }}>
            <div style={{ height: 86, borderBottom: `1px solid ${P.line}`, display: "flex", alignItems: "center", padding: "0 32px", gap: 16 }}>
              <span style={{ fontSize: 30, color: P.ink, letterSpacing: "-0.02em", ...wide(100, 800) }}>CraCha</span>
              <span style={{ fontSize: 24, color: P.muted, fontWeight: 500 }}>Chat</span>
              <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 10, padding: "9px 18px", borderRadius: 22, background: "#f8f3ed", fontSize: 21, fontWeight: 500, color: P.text }}>
                <Globe size={20} color={P.muted} strokeWidth={2} />
                {SITE} · Wissensbasis
              </div>
            </div>
            {/* The question: typed in the input, then rises into a bubble. */}
            {sent ? (
              <div
                style={{
                  position: "absolute",
                  right: 40,
                  top: lerp(INPUT.y + 10, 120, rise),
                  padding: "18px 26px",
                  borderRadius: 26,
                  borderBottomRightRadius: 8,
                  background: P.ink,
                  color: "white",
                  fontSize: 29,
                  fontWeight: 500,
                  opacity: clamp01(rise * 3),
                }}
              >
                {QUESTION}
              </div>
            ) : null}
            {searching ? (
              <div style={{ position: "absolute", left: 40, top: 230, display: "flex", alignItems: "center", gap: 14 }}>
                <Sparkles size={30} color={P.accent} strokeWidth={2.2} />
                <span
                  style={{
                    fontSize: 28,
                    fontWeight: 600,
                    backgroundImage: `linear-gradient(90deg, ${P.faint} 0%, ${P.faint} ${sweep}%, ${P.accent} ${sweep + 20}%, ${P.faint} ${sweep + 40}%, ${P.faint} 100%)`,
                    WebkitBackgroundClip: "text",
                    backgroundClip: "text",
                    color: "transparent",
                  }}
                >
                  Durchsucht die Wissensbasis …
                </span>
              </div>
            ) : null}
            <div style={{ position: "absolute", left: 40, top: 226, width: WIN.w - 200, fontSize: 36, lineHeight: 1.6, color: P.text }}>
              {TOKENS.map((tok, i) => {
                const at = CH.answer + i * perWord;
                if (t < at) return null;
                const q = clamp01((t - at) / 0.18);
                return (
                  <span
                    key={i}
                    style={{
                      display: "inline-block",
                      marginRight: tok.mark || TOKENS[i + 1]?.w === "." ? 0 : "0.26em",
                      opacity: q,
                      filter: `blur(${(1 - q) * 6}px)`,
                      transform: `translateY(${(1 - q) * 10}px)`,
                      fontWeight: tok.mark ? 700 : 400,
                      color: tok.mark ? P.ink : undefined,
                      backgroundImage: tok.mark ? `linear-gradient(90deg, ${P.accentMark}, ${P.accentMark})` : undefined,
                      backgroundRepeat: "no-repeat",
                      backgroundSize: tok.mark ? `${markP * 100}% 100%` : undefined,
                      borderRadius: 6,
                      padding: tok.mark ? "0 4px" : undefined,
                    }}
                  >
                    {tok.cite ? <Cite glow={prog(t, CH.source, CH.source + 0.2, ez.out)} /> : tok.w}
                  </span>
                );
              })}
            </div>
            {/* Source chip. */}
            {chip > 0 && !diving ? (
              <div
                style={{
                  position: "absolute",
                  left: CHIP.x,
                  top: CHIP.y,
                  width: CHIP.w,
                  height: CHIP.h,
                  borderRadius: CHIP.h / 2,
                  background: "white",
                  boxShadow: SHADOW_SM,
                  outline: `${1 + clickP * 2}px solid ${clickP > 0.05 ? P.accent : P.line}`,
                  transform: `translateY(${(1 - chip) * 30}px) scale(${(0.7 + 0.3 * chip) * (1 - clickP * 0.04)})`,
                  opacity: clamp01(chip * 2),
                }}
              >
                <ChipContent />
              </div>
            ) : null}
            <div
              style={{
                position: "absolute",
                left: INPUT.x,
                top: INPUT.y,
                width: INPUT.w,
                height: INPUT.h,
                borderRadius: INPUT.h / 2,
                background: "#faf7f3",
                outline: `1.5px solid ${t > CH.typeStart && !sent ? P.accent : P.line}`,
                display: "flex",
                alignItems: "center",
                padding: "0 30px",
                fontSize: 30,
                color: P.ink,
              }}
            >
              {sent || typedN === 0 ? <span style={{ color: P.faint }}>Frag deine Website …</span> : QUESTION.slice(0, typedN)}
              {!sent && t > CH.typeStart ? <span style={{ width: 3, height: 38, marginLeft: 2, background: P.accent }} /> : null}
              <div
                style={{
                  position: "absolute",
                  right: 14,
                  top: 14,
                  width: 60,
                  height: 60,
                  borderRadius: 30,
                  background: typedN > 0 && !sent ? P.accent : "#e7dfd6",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  transform: `scale(${1 - press * 0.1})`,
                }}
              >
                <ArrowUp size={32} color="white" strokeWidth={2.6} />
              </div>
            </div>
          </div>
        </div>
        <Ring x={SEND.x} y={SEND.y} at={CH.send} size={160} />
      </AbsoluteFill>
      {diving ? (
        <div
          style={{
            position: "absolute",
            left: pcx - pw / 2,
            top: pcy - ph / 2,
            width: pw,
            height: ph,
            borderRadius: lerp(CHIP.h / 2, 28, dive),
            background: "white",
            boxShadow: SHADOW,
            outline: `${2.5 * (1 - dive) + 1}px solid ${dive < 0.9 ? P.accent : P.line}`,
            overflow: "hidden",
            transformOrigin: `${CX - (pcx - pw / 2)}px ${CY - (pcy - ph / 2)}px`,
            transform: `scale(${shrink}) rotate(${implode * 25}deg)`,
            opacity: shrink > 0.02 ? 1 : 0,
          }}
        >
          <div style={{ position: "absolute", inset: 0, opacity: 1 - prog(t, V.click, V.click + 0.15, ez.out) }}>
            <ChipContent />
          </div>
          <div style={{ position: "absolute", left: 0, top: 0, transformOrigin: "0 0", transform: `scale(${pw / PAGE.w}, ${ph / PAGE.h})`, opacity: prog(t, V.click + 0.2, V.page + 0.2, ez.out) }}>
            <SourcePage t={t} />
          </div>
        </div>
      ) : null}
      {implode > 0.9 ? (
        <div style={{ position: "absolute", left: CX - 9, top: CY - 9, width: 18, height: 18, borderRadius: 9, background: P.accent }} />
      ) : null}
      <Pointer x={cx} y={cyy} opacity={cursorO} press={Math.max(press, clickP)} />
      <Caption text="Dann *frag einfach.*" from={CH.open + 0.1} to={CH.search - 0.05} y={78} />
      <Caption text="Antwort *mit Quelle.*" from={CH.search + 0.05} to={V.click - 0.02} y={78} />
      <Caption text="Direkt *auf der Seite markiert.*" from={V.page + 0.2} to={V.implode} y={78} />
    </AbsoluteFill>
  );
};
