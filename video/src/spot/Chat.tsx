import { ArrowUp, Globe } from "lucide-react";
import React from "react";
import { AbsoluteFill, interpolateColors } from "remotion";
import { Dot, Pointer, Ring, SHADOW_SOFT, SHADOW_TINY } from "../ad/kit";
import { CX, CY, P, SITE, clamp01, ez, lerp, pressAt, prog, sp, ui, useT } from "../ad/look";
import { DB } from "../ad/Solution";
import { DB_H, DB_TOP } from "./Build";
import K from "./cues.json";

const CH = K.chat;
const V = K.verify;

const QUESTION = "Wie ändere ich meine Adresse?";
const MARKED = "Konto › Einstellungen › Adresse";
const SOURCE_PATH = "/hilfe/konto/adresse";
const INPUT = { w: 1000, h: 110, cy: CY };
const SEND = { x: CX + INPUT.w / 2 - 16 - 39, y: INPUT.cy };
const Q = { right: 1620, top: 330 };
const A = { left: 300, top: 470 };
const CHIP = { left: 300, top: 630, w: 600, h: 76 };
const CHIP_C = { x: CHIP.left + CHIP.w / 2, y: CHIP.top + CHIP.h / 2 };
const PAGE = { w: 1400, h: 800, cx: CX, cy: CY };

type Tok = { w: string; mark?: boolean; cite?: boolean };
const TOKENS: Tok[] = [{ w: "Das" }, { w: "geht" }, { w: "unter" }, { w: MARKED, mark: true }, { w: "." }, { w: "1", cite: true }];

const ChipContent: React.FC = () => (
  <div style={{ display: "flex", alignItems: "center", gap: 14, height: CHIP.h, padding: "0 28px 0 16px", fontFamily: ui, fontSize: 28, fontWeight: 600, color: P.text, whiteSpace: "nowrap" }}>
    <div style={{ width: 46, height: 46, borderRadius: 23, background: P.accentSoft, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 23, fontWeight: 700, color: P.accent }}>1</div>
    <Globe size={26} color={P.muted} strokeWidth={2} />
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
        <div style={{ marginLeft: 18, padding: "10px 24px", borderRadius: 26, background: P.soft, fontSize: 26, fontWeight: 600, color: P.muted }}>
          {SITE}
          <span style={{ color: P.ink }}>{SOURCE_PATH}</span>
        </div>
      </div>
      <div style={{ position: "absolute", left: 90, right: 90, top: 140 }}>
        <div style={{ fontSize: 28, fontWeight: 600, color: P.muted }}>Start › Hilfe › Konto</div>
        <div style={{ marginTop: 14, fontSize: 76, fontWeight: 800, letterSpacing: "-0.03em", color: P.ink }}>Adresse ändern</div>
        <div style={{ marginTop: 28, fontSize: 42, fontWeight: 500, lineHeight: 1.6, color: P.text }}>
          Das geht jederzeit unter{" "}
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
            {MARKED}
          </span>
          . Die Änderung gilt sofort.
        </div>
        {[860, 720, 800].map((w, i) => (
          <div key={i} style={{ marginTop: i ? 18 : 48, width: w, height: 16, borderRadius: 16, background: P.soft }} />
        ))}
      </div>
    </div>
  );
};

/** Three dots while the knowledge base is searched. */
const Thinking: React.FC<{ t: number }> = ({ t }) => {
  const on = sp(t, CH.send + 0.15, 12, 220) * (1 - prog(t, CH.answer - 0.08, CH.answer, ez.out));
  if (on <= 0) return null;
  return (
    <div style={{ position: "absolute", left: A.left, top: A.top, padding: "30px 36px", borderRadius: 34, borderTopLeftRadius: 10, background: P.soft, display: "flex", gap: 12, transform: `scale(${on})`, transformOrigin: "0 0" }}>
      {[0, 1, 2].map((i) => (
        <div key={i} style={{ width: 18, height: 18, borderRadius: 9, background: P.accent, transform: `translateY(${-10 * Math.max(0, Math.sin((t - CH.send) * 14 - i * 0.9))}px)` }} />
      ))}
    </div>
  );
};

export const Chat: React.FC = () => {
  const t = useT();
  if (t < CH.input || t >= K.end.hit) return null;
  // The full knowledge base collapses into the question input.
  const morph = prog(t, CH.input, CH.input + 0.4, ez.inOut);
  const inputOut = prog(t, CH.send + 0.1, CH.send + 0.35, ez.inOut);
  const typedN = Math.round(prog(t, CH.typeStart, CH.typeEnd, (x) => x) * QUESTION.length);
  const sent = t >= CH.send;
  const rise = prog(t, CH.send, CH.send + 0.4, ez.expo);
  const pressSend = pressAt(t, CH.send);
  const perWord = 0.5 / TOKENS.length;
  const answerIn = sp(t, CH.answer, 14, 200);
  const markP = prog(t, CH.mark, CH.mark + 0.4, ez.inOut);
  const chip = sp(t, CH.source, 11, 200);
  const clickP = pressAt(t, V.click);
  const grow = prog(t, V.click, V.click + 0.5, ez.whip);
  const diving = t >= V.click;
  const away = prog(t, V.click, V.click + 0.3, ez.in);
  const implode = prog(t, V.implode, V.dot, ez.in);

  const path = [
    { at: CH.typeEnd - 0.4, x: 1560, y: 1000 },
    { at: CH.send - 0.08, x: SEND.x + 6, y: SEND.y + 8 },
    { at: CH.source, x: SEND.x + 6, y: SEND.y + 8 },
    { at: V.click - 0.08, x: CHIP_C.x + 120, y: CHIP_C.y + 10 },
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
  const pointerO = prog(t, CH.typeEnd - 0.4, CH.typeEnd - 0.25, ez.out) * (1 - prog(t, V.click + 0.12, V.click + 0.3, ez.out));

  const iw = lerp(DB.w, INPUT.w, morph);
  const ih = lerp(DB_H, INPUT.h, morph);
  const icy = lerp(DB_TOP + DB_H / 2, INPUT.cy, morph);
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
              left: CX - iw / 2,
              top: icy - ih / 2,
              width: iw,
              height: ih,
              borderRadius: lerp(60, INPUT.h / 2, morph),
              background: interpolateColors(morph, [0, 0.5], [P.accent, P.card]),
              boxShadow: SHADOW_SOFT,
              outline: `1.5px solid ${t > CH.typeStart && !sent ? P.accent : P.line}`,
              fontFamily: ui,
              fontSize: 40,
              fontWeight: 500,
              color: P.ink,
              opacity: 1 - inputOut,
              overflow: "hidden",
            }}
          >
            <div style={{ position: "absolute", left: 38, top: 0, height: INPUT.h, display: "flex", alignItems: "center", whiteSpace: "nowrap", opacity: prog(t, CH.input + 0.3, CH.input + 0.45, ez.out) }}>
              {sent || typedN === 0 ? <span style={{ color: P.faint }}>Frag deine Website …</span> : QUESTION.slice(0, typedN)}
              {!sent && t > CH.typeStart ? <span style={{ width: 3, height: 44, marginLeft: 2, background: P.accent }} /> : null}
            </div>
            <div
              style={{
                position: "absolute",
                right: 16,
                top: (INPUT.h - 78) / 2,
                width: 78,
                height: 78,
                borderRadius: 39,
                background: typedN > 0 ? P.accent : "#e9e3dd",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                transform: `scale(${sp(t, CH.input + 0.3, 12, 220) * (1 - pressSend * 0.1)})`,
              }}
            >
              <ArrowUp size={40} color="white" strokeWidth={2.6} />
            </div>
          </div>
        ) : null}
        <Ring x={SEND.x} y={SEND.y} at={CH.send} size={200} />
        {/* The question becomes the chat bubble. */}
        {sent ? (
          <div
            style={{
              position: "absolute",
              right: 1920 - Q.right,
              top: lerp(INPUT.cy - 40, Q.top, rise),
              padding: "24px 36px",
              borderRadius: 36,
              borderBottomRightRadius: 10,
              background: P.ink,
              color: "white",
              fontFamily: ui,
              fontSize: 42,
              fontWeight: 600,
              opacity: clamp01(rise * 3),
              transform: `scale(${0.9 + 0.1 * rise})`,
              transformOrigin: "100% 100%",
            }}
          >
            {QUESTION}
          </div>
        ) : null}
        <Thinking t={t} />
        {/* Answer bubble */}
        {answerIn > 0 ? (
          <div
            style={{
              position: "absolute",
              left: A.left,
              top: A.top,
              padding: "28px 38px",
              borderRadius: 36,
              borderTopLeftRadius: 10,
              background: P.soft,
              fontFamily: ui,
              fontSize: 44,
              fontWeight: 500,
              lineHeight: 1.45,
              color: P.text,
              whiteSpace: "nowrap",
              transform: `scale(${0.92 + 0.08 * answerIn})`,
              transformOrigin: "0 0",
              opacity: clamp01(answerIn * 2),
            }}
          >
            {TOKENS.map((tok, i) => {
              const at = CH.answer + 0.05 + i * perWord;
              if (t < at) return null;
              const q = clamp01((t - at) / 0.18);
              return (
                <span
                  key={i}
                  style={{
                    display: "inline-block",
                    marginRight: tok.mark || TOKENS[i + 1]?.w === "." ? 0 : "0.26em",
                    marginLeft: tok.cite ? "0.3em" : 0,
                    opacity: q,
                    filter: `blur(${(1 - q) * 8}px)`,
                    transform: `translateY(${(1 - q) * 12}px)`,
                    fontWeight: tok.mark ? 700 : undefined,
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
                        width: 44,
                        height: 44,
                        borderRadius: 13,
                        fontSize: 24,
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
            transform: `scale(${(1 - implode) * (1 + prog(t, V.click + 0.5, V.implode, (x) => x) * 0.04)})`,
          }}
        >
          <div style={{ position: "absolute", inset: 0, opacity: 1 - prog(t, V.click, V.click + 0.12, ez.out) }}>
            <ChipContent />
          </div>
          <div style={{ position: "absolute", left: 0, top: 0, transformOrigin: "0 0", transform: `scale(${pw / PAGE.w}, ${ph / PAGE.h})`, opacity: prog(t, V.click + 0.15, V.click + 0.4, ez.out) }}>
            <SourcePage t={t} />
          </div>
        </div>
      ) : null}
      <Ring x={CX - 20} y={CY + 60} at={V.mark + 0.35} size={1100} width={2} dur={0.8} />
      <Dot scale={prog(t, V.dot - 0.12, V.dot, ez.out)} />
      <Pointer x={px} y={py} opacity={pointerO} press={Math.max(pressSend, clickP)} />
    </AbsoluteFill>
  );
};
