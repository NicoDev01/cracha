import { ArrowUp, Globe, Sparkles } from "lucide-react";
import React from "react";
import { AbsoluteFill } from "remotion";
import { Dot, Pointer, Ring, SHADOW_SOFT, SHADOW_TINY, Tile } from "./kit";
import { CX, CY, K, P, SITE, clamp01, ez, lerp, pressAt, prog, sp, ui, useT } from "./look";

const CH = K.chat;
const V = K.verify;

const QUESTION = "Wo ändere ich meine Rechnungsadresse?";
const SOURCE_PATH = "/hilfe/konto/rechnungsadresse";
const INPUT = { w: 1100, h: 104, cy: 900 };
const SEND = { x: CX + INPUT.w / 2 - 14 - 38, y: INPUT.cy };
const Q = { right: 1640, top: 250 };
const A = { left: 280, top: 390, w: 1320 };
const CHIP = { left: 280, top: 620, w: 700, h: 72 };
const CHIP_C = { x: CHIP.left + CHIP.w / 2, y: CHIP.top + CHIP.h / 2 };
const PAGE = { w: 1400, h: 800, cx: CX, cy: CY };

type Tok = { w: string; mark?: boolean; cite?: boolean };
const TOKENS: Tok[] = [
  ..."Das geht unter".split(" ").map((w) => ({ w })),
  { w: "Konto › Einstellungen › Rechnungsdaten", mark: true },
  { w: "." },
  ..."Die neue Adresse gilt ab der nächsten Rechnung.".split(" ").map((w) => ({ w })),
  { w: "1", cite: true },
];

const ChipContent: React.FC = () => (
  <div style={{ display: "flex", alignItems: "center", gap: 14, height: CHIP.h, padding: "0 28px 0 14px", fontFamily: ui, fontSize: 25, fontWeight: 500, color: P.text, whiteSpace: "nowrap" }}>
    <div style={{ width: 44, height: 44, borderRadius: 22, background: P.accentSoft, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 21, fontWeight: 700, color: P.accent }}>1</div>
    <Globe size={24} color={P.muted} strokeWidth={2} />
    {SITE}
    {SOURCE_PATH}
  </div>
);

/** The original page with the passage marked. Drawn at PAGE size. */
const SourcePage: React.FC<{ t: number }> = ({ t }) => {
  const mark = prog(t, V.mark, V.mark + 0.5, ez.inOut);
  return (
    <div style={{ position: "absolute", left: 0, top: 0, width: PAGE.w, height: PAGE.h, fontFamily: ui, background: "white" }}>
      <div style={{ height: 78, borderBottom: `1px solid ${P.line}`, display: "flex", alignItems: "center", gap: 10, padding: "0 30px" }}>
        {[0, 1, 2].map((i) => (
          <div key={i} style={{ width: 15, height: 15, borderRadius: 8, background: "#e6e0da" }} />
        ))}
        <div style={{ marginLeft: 18, padding: "10px 24px", borderRadius: 26, background: P.soft, fontSize: 24, fontWeight: 500, color: P.muted }}>
          {SITE}
          <span style={{ color: P.ink }}>{SOURCE_PATH}</span>
        </div>
      </div>
      <div style={{ position: "absolute", left: 90, right: 90, top: 140 }}>
        <div style={{ fontSize: 26, fontWeight: 500, color: P.muted }}>Start › Hilfe › Konto › Rechnungsadresse</div>
        <div style={{ marginTop: 14, fontSize: 74, fontWeight: 800, letterSpacing: "-0.03em", color: P.ink }}>Rechnungsadresse ändern</div>
        <div style={{ marginTop: 28, fontSize: 38, lineHeight: 1.65, color: P.text, maxWidth: 1180 }}>
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
        {[860, 720, 800].map((w, i) => (
          <div key={i} style={{ marginTop: i ? 18 : 48, width: w, height: 16, borderRadius: 16, background: P.soft }} />
        ))}
      </div>
    </div>
  );
};

/** While searching: a row of pages flicks past and lights up one by one. */
const Searching: React.FC<{ t: number }> = ({ t }) => {
  const on = prog(t, CH.send + 0.25, CH.send + 0.45, ez.out) * (1 - prog(t, CH.answer - 0.15, CH.answer, ez.out));
  if (on <= 0) return null;
  const sweep = ((t - CH.send) * 170) % 180 - 40;
  const n = 9;
  const lit = ((t - CH.send - 0.35) / (CH.answer - CH.send - 0.5)) * n;
  return (
    <div style={{ position: "absolute", left: A.left, top: A.top, opacity: on }}>
      <div style={{ display: "flex", alignItems: "center", gap: 16, fontFamily: ui }}>
        <Sparkles size={34} color={P.accent} strokeWidth={2.2} />
        <span
          style={{
            fontSize: 34,
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
      <div style={{ display: "flex", gap: 18, marginTop: 30 }}>
        {Array.from({ length: n }, (_, i) => {
          const a = sp(t, CH.send + 0.3 + i * 0.05, 13, 200);
          const hit = lit >= i && lit < i + 1.6;
          return (
            <div key={i} style={{ position: "relative", width: 96, height: 64, transform: `translateY(${(1 - a) * 24}px) scale(${a * (hit ? 1.08 : 1)})`, opacity: a }}>
              <Tile w={96} h={64} seed={i + 3} read={hit ? 1 : 0} hot={hit} />
            </div>
          );
        })}
      </div>
    </div>
  );
};

export const Chat: React.FC = () => {
  const t = useT();
  if (t < CH.input || t >= K.finale.words[0]) return null;
  // The "ready" pill slides down and becomes the input.
  const inputIn = prog(t, CH.input, CH.input + 0.35, ez.inOut);
  const inputOut = prog(t, CH.send + 0.1, CH.send + 0.4, ez.inOut);
  const typedN = Math.round(prog(t, CH.typeStart, CH.typeEnd, (x) => x) * QUESTION.length);
  const sent = t >= CH.send;
  const rise = prog(t, CH.send, CH.send + 0.4, ez.out);
  const pressSend = pressAt(t, CH.send);
  const perWord = 0.85 / TOKENS.length;
  const answerIn = sp(t, CH.answer, 14, 200);
  const markP = prog(t, CH.mark, CH.mark + 0.4, ez.inOut);
  const chip = sp(t, CH.source, 11, 200);
  const clickP = pressAt(t, V.click);
  const grow = prog(t, V.click, V.click + 0.55, ez.whip);
  const diving = t >= V.click;
  const away = prog(t, V.click, V.click + 0.35, ez.in);
  const implode = prog(t, V.implode, V.dot, ez.in);

  const path = [
    { at: CH.typeEnd - 0.5, x: 1640, y: 1060 },
    { at: CH.send - 0.1, x: SEND.x + 6, y: SEND.y + 8 },
    { at: CH.source + 0.2, x: SEND.x + 6, y: SEND.y + 8 },
    { at: V.click - 0.1, x: CHIP_C.x + 120, y: CHIP_C.y + 10 },
  ];
  let px = path[0].x;
  let py = path[0].y;
  for (let i = 1; i < path.length; i++) {
    if (t >= path[i - 1].at) {
      const p = prog(t, path[i - 1].at, path[i].at, ez.inOut);
      px = lerp(path[i - 1].x, path[i].x, p);
      py = lerp(path[i - 1].y, path[i].y, p);
    }
  }
  const pointerO = prog(t, CH.typeEnd - 0.5, CH.typeEnd - 0.3, ez.out) * (1 - prog(t, V.click + 0.15, V.click + 0.35, ez.out));

  const pw = lerp(CHIP.w, PAGE.w, grow);
  const ph = lerp(CHIP.h, PAGE.h, grow);
  const pcx = lerp(CHIP_C.x, PAGE.cx, grow);
  const pcy = lerp(CHIP_C.y, PAGE.cy, grow);
  return (
    <AbsoluteFill>
      <AbsoluteFill style={{ opacity: 1 - away, transform: `translateY(${-away * 60}px)` }}>
        {/* Input */}
        {inputOut < 1 ? (
          <div
            style={{
              position: "absolute",
              left: CX - lerp(290, INPUT.w / 2, inputIn),
              top: lerp(CY + 130, INPUT.cy - INPUT.h / 2, inputIn),
              width: lerp(580, INPUT.w, inputIn),
              height: lerp(96, INPUT.h, inputIn),
              borderRadius: 52,
              background: P.card,
              boxShadow: SHADOW_SOFT,
              outline: `1.5px solid ${t > CH.typeStart && !sent ? P.accent : P.line}`,
              display: "flex",
              alignItems: "center",
              padding: "0 34px",
              fontFamily: ui,
              fontSize: 36,
              color: P.ink,
              opacity: 1 - inputOut,
              transform: `translateY(${inputOut * 40}px)`,
            }}
          >
            <span style={{ opacity: prog(t, CH.input + 0.25, CH.input + 0.45, ez.out), whiteSpace: "nowrap" }}>
              {sent || typedN === 0 ? <span style={{ color: P.faint }}>Frag deine Website …</span> : QUESTION.slice(0, typedN)}
            </span>
            {!sent && t > CH.typeStart ? <span style={{ width: 3, height: 42, marginLeft: 2, background: P.accent }} /> : null}
            <div
              style={{
                position: "absolute",
                right: 14,
                top: (INPUT.h - 76) / 2,
                width: 76,
                height: 76,
                borderRadius: 38,
                background: typedN > 0 ? P.accent : "#e9e3dd",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                transform: `scale(${prog(t, CH.input + 0.2, CH.input + 0.4, ez.out) * (1 - pressSend * 0.1)})`,
              }}
            >
              <ArrowUp size={38} color="white" strokeWidth={2.6} />
            </div>
          </div>
        ) : null}
        <Ring x={SEND.x} y={SEND.y} at={CH.send} size={180} />
        {/* Question bubble */}
        {sent ? (
          <div
            style={{
              position: "absolute",
              right: 1920 - Q.right,
              top: lerp(INPUT.cy - 40, Q.top, rise),
              padding: "22px 32px",
              borderRadius: 34,
              borderBottomRightRadius: 10,
              background: P.ink,
              color: "white",
              fontFamily: ui,
              fontSize: 36,
              fontWeight: 500,
              opacity: clamp01(rise * 3),
              transform: `scale(${0.9 + 0.1 * rise})`,
              transformOrigin: "100% 100%",
            }}
          >
            {QUESTION}
          </div>
        ) : null}
        <Searching t={t} />
        {/* Answer bubble */}
        {answerIn > 0 ? (
          <div
            style={{
              position: "absolute",
              left: A.left,
              top: A.top,
              width: A.w,
              padding: "30px 38px",
              borderRadius: 34,
              borderTopLeftRadius: 10,
              background: P.soft,
              fontFamily: ui,
              fontSize: 38,
              lineHeight: 1.5,
              color: P.text,
              transform: `scale(${0.92 + 0.08 * answerIn})`,
              transformOrigin: "0 0",
              opacity: clamp01(answerIn * 2),
            }}
          >
            {TOKENS.map((tok, i) => {
              const at = CH.answer + 0.1 + i * perWord;
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
                    borderRadius: 8,
                    padding: tok.mark ? "0 6px" : undefined,
                  }}
                >
                  {tok.cite ? (
                    <span
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        width: 40,
                        height: 40,
                        borderRadius: 12,
                        fontSize: 22,
                        fontWeight: 700,
                        color: chip > 0.1 ? "white" : P.accent,
                        background: chip > 0.1 ? P.accent : P.accentSoft,
                        verticalAlign: "4px",
                      }}
                    >
                      1
                    </span>
                  ) : (
                    tok.w
                  )}
                </span>
              );
            })}
          </div>
        ) : null}
        {chip > 0 && !diving ? (
          <div
            style={{
              position: "absolute",
              left: CHIP.left,
              top: CHIP.top,
              width: CHIP.w,
              height: CHIP.h,
              borderRadius: CHIP.h / 2,
              background: "white",
              boxShadow: SHADOW_TINY,
              outline: `${1.5 + clickP * 2}px solid ${clickP > 0.05 ? P.accent : P.line}`,
              transform: `translateY(${(1 - chip) * 30}px) scale(${(0.7 + 0.3 * chip) * (1 - clickP * 0.04)})`,
              transformOrigin: "0 50%",
              opacity: clamp01(chip * 2),
            }}
          >
            <ChipContent />
          </div>
        ) : null}
      </AbsoluteFill>
      {/* The source chip grows into the original page. */}
      {diving && implode < 1 ? (
        <div
          style={{
            position: "absolute",
            left: pcx - pw / 2,
            top: pcy - ph / 2,
            width: pw,
            height: ph,
            borderRadius: lerp(CHIP.h / 2, 30, grow),
            background: "white",
            boxShadow: SHADOW_SOFT,
            outline: `${2 * (1 - grow) + 1.5}px solid ${grow < 0.9 ? P.accent : P.line}`,
            overflow: "hidden",
            transformOrigin: `${CX - (pcx - pw / 2)}px ${CY - (pcy - ph / 2)}px`,
            transform: `scale(${(1 - implode) * (1 + prog(t, V.click + 0.55, V.implode, (x) => x) * 0.05)})`,
          }}
        >
          <div style={{ position: "absolute", inset: 0, opacity: 1 - prog(t, V.click, V.click + 0.15, ez.out) }}>
            <ChipContent />
          </div>
          <div style={{ position: "absolute", left: 0, top: 0, transformOrigin: "0 0", transform: `scale(${pw / PAGE.w}, ${ph / PAGE.h})`, opacity: prog(t, V.click + 0.2, V.click + 0.45, ez.out) }}>
            <SourcePage t={t} />
          </div>
        </div>
      ) : null}
      <Ring x={CX - 20} y={CY + 30} at={V.mark + 0.35} size={1100} width={2} dur={0.8} />
      <Dot scale={prog(t, V.dot - 0.12, V.dot, ez.out)} pulseFrom={V.dot + 0.1} />
      <Pointer x={px} y={py} opacity={pointerO} press={Math.max(pressSend, clickP)} />
    </AbsoluteFill>
  );
};
