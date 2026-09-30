import { ArrowUp, FileText, Lock } from "lucide-react";
import React from "react";
import { Easing, interpolateColors } from "remotion";
import { DB } from "./Crawl";
import { BlurWord, Box, Cursor, Line, Rect, mixRect } from "./kit";
import { C, FONT, T, TEXT, clamp01, ease, lerp, prog, shadow } from "./theme";

const COMPOSER: Rect = { x: 0, y: 290, w: 1100, h: 120, r: 60 };
const QUESTION: Rect = { x: 550 - 350, y: -250, w: 700, h: 104, r: 52 };
const ANSWER: Rect = { x: -30, y: -60, w: 1040, h: 196, r: 40 };
const CHIP: Rect = { x: -550 + 330, y: 112, w: 660, h: 84, r: 42 };
export const SOURCE: Rect = { x: 0, y: 0, w: 1240, h: 660, r: 30 };
const DOT: Rect = { x: 0, y: 0, w: 28, h: 28, r: 14 };
const SEND = { x: COMPOSER.w / 2 - 60, y: COMPOSER.y };

const ANSWER_WORDS = TEXT.answer.split(" ");

/**
 * The database becomes the chat box, the typed question flies up as a bubble,
 * the answer streams in with a citation, and the source chip opens the page
 * with the passage marked. Ends by collapsing into a dot.
 */
export const Chat: React.FC<{ t: number }> = ({ t }) => {
  if (t < T.dbToAsk || t >= T.collapse2 + 0.42) return null;

  // DB → composer → question bubble: one box.
  const toComposer = prog(t, T.dbToAsk, T.dbToAsk + 0.45, ease.inOut);
  const toBubble = prog(t, T.send + 0.05, T.send + 0.5, ease.inOut);
  const q = mixRect(mixRect(DB, COMPOSER, toComposer), QUESTION, toBubble);
  const qBg = interpolateColors(toBubble, [0, 1], [C.white, C.ink]);
  const typed = Math.floor(clamp01((t - T.typeQ[0]) / (T.typeQ[1] - T.typeQ[0])) * TEXT.question.length);
  const composerUi = prog(t, T.dbToAsk + 0.35, T.dbToAsk + 0.55, ease.out) * (1 - prog(t, T.send + 0.05, T.send + 0.2));

  // Everything but the source recedes when the source opens.
  const open = prog(t, T.sourceOpen, T.sourceOpen + 0.5, ease.inOut);
  const recede = 1 - prog(t, T.sourceOpen, T.sourceOpen + 0.3, ease.out);

  const ans = prog(t, T.answer[0], T.answer[0] + 0.4, ease.back);
  const chip = prog(t, T.cite + 0.12, T.cite + 0.5, ease.back);
  const collapse = prog(t, T.collapse2 + 0.03, T.collapse2 + 0.4, Easing.bezier(0.5, 0, 0.75, 0));
  const src = mixRect(mixRect(CHIP, SOURCE, open), DOT, collapse);
  const srcBg = interpolateColors(collapse, [0, 0.4], [C.white, C.ink]);

  return (
    <>
      <div style={{ opacity: recede, transform: `scale(${lerp(0.94, 1, recede)})` }}>
        <Box x={q.x} y={q.y} w={q.w} h={q.h} r={q.r} bg={qBg} shadow={shadow(1 - toBubble * 0.6)}>
          <div
            style={{
              position: "absolute",
              left: 0,
              top: 0,
              height: q.h,
              display: "flex",
              alignItems: "center",
              padding: `0 ${lerp(44, 44, toBubble)}px`,
              fontSize: lerp(46, 42, toBubble),
              fontWeight: 600,
              whiteSpace: "nowrap",
              color: interpolateColors(toBubble, [0, 1], [C.ink, C.white]),
              opacity: prog(t, T.dbToAsk + 0.35, T.dbToAsk + 0.55, ease.out),
            }}
          >
            {typed === 0 ? <span style={{ color: "#b3aca5" }}>Frag deine Wissensbasis …</span> : TEXT.question.slice(0, typed)}
            {t < T.send && <div style={{ width: 4, height: 50, marginLeft: 4, background: C.accent, opacity: Math.floor(t * 3) % 2 ? 1 : 0.15 }} />}
          </div>
          <div
            style={{
              position: "absolute",
              left: q.w - 60 - 42,
              top: q.h / 2 - 42,
              width: 84,
              height: 84,
              borderRadius: 42,
              background: C.accent,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              opacity: composerUi,
            }}
          >
            <ArrowUp size={44} color="white" strokeWidth={2.8} />
          </div>
        </Box>

        {ans > 0 && (
          <Box
            x={ANSWER.x}
            y={ANSWER.y}
            w={ANSWER.w}
            h={ANSWER.h}
            r={ANSWER.r}
            scaleX={lerp(0.6, 1, ans)}
            scaleY={lerp(0.6, 1, ans)}
            style={{ transformOrigin: "0% 0%", overflow: "visible" }}
          >
            <div style={{ position: "absolute", inset: 0, padding: "34px 46px", fontSize: 46, fontWeight: 500, lineHeight: 1.36 }}>
              {ANSWER_WORDS.map((w, i) => (
                <React.Fragment key={i}>
                  <BlurWord t={t} at={lerp(T.answer[0] + 0.15, T.answer[1] - 0.3, i / (ANSWER_WORDS.length - 1))}>
                    {w}
                  </BlurWord>{" "}
                </React.Fragment>
              ))}
              <span
                style={{
                  display: "inline-flex",
                  width: 44,
                  height: 44,
                  borderRadius: 22,
                  background: C.accent,
                  color: "white",
                  fontSize: 26,
                  fontWeight: 800,
                  alignItems: "center",
                  justifyContent: "center",
                  verticalAlign: "0.35em",
                  transform: `scale(${prog(t, T.cite, T.cite + 0.3, ease.back)})`,
                }}
              >
                1
              </span>
            </div>
          </Box>
        )}
      </div>

      {chip > 0 && (
        <Box
          x={src.x}
          y={src.y}
          w={src.w}
          h={src.h}
          r={src.r}
          bg={srcBg}
          shadow={shadow(1 - collapse)}
          scaleX={lerp(0.5, 1, chip)}
          scaleY={lerp(0.5, 1, chip)}
          style={{ transformOrigin: "0% 50%" }}
        >
          <ChipFace opacity={(1 - open * 3) * (1 - collapse)} />
          <SourcePage t={t} opacity={prog(t, T.sourceOpen + 0.3, T.sourceOpen + 0.5, ease.out) * (1 - prog(t, T.collapse2, T.collapse2 + 0.1))} w={src.w} h={src.h} />
        </Box>
      )}

      <Cursor
        t={t}
        show={[T.typeQ[1] - 0.2, T.send + 0.3]}
        clicks={[T.send]}
        path={[
          { t: T.typeQ[1] - 0.2, x: 700, y: 520 },
          { t: T.send - 0.08, x: SEND.x, y: SEND.y + 6 },
          { t: T.send + 0.3, x: SEND.x + 40, y: SEND.y + 70 },
        ]}
      />
      <Cursor
        t={t}
        show={[T.cite + 0.4, T.sourceOpen + 0.3]}
        clicks={[T.sourceClick]}
        path={[
          { t: T.cite + 0.4, x: 400, y: 380 },
          { t: T.sourceClick - 0.08, x: CHIP.x + 60, y: CHIP.y + 8 },
          { t: T.sourceOpen + 0.3, x: CHIP.x + 120, y: CHIP.y + 120 },
        ]}
      />
    </>
  );
};

const ChipFace: React.FC<{ opacity: number }> = ({ opacity }) => (
  <div
    style={{
      position: "absolute",
      left: 0,
      top: 0,
      width: CHIP.w,
      height: CHIP.h,
      display: "flex",
      alignItems: "center",
      gap: 16,
      padding: "0 30px",
      fontSize: 32,
      fontWeight: 600,
      whiteSpace: "nowrap",
      opacity: Math.max(0, opacity),
    }}
  >
    <div style={{ width: 44, height: 44, borderRadius: 22, background: C.accent, color: "white", fontSize: 24, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center" }}>
      1
    </div>
    <FileText size={32} color={C.accent} />
    {TEXT.sourceTitle}
    <span style={{ color: C.sub, fontWeight: 500 }}>· {TEXT.domain}</span>
  </div>
);

/** The original page, the supporting sentence marked as if with a highlighter. */
const SourcePage: React.FC<{ t: number; opacity: number; w: number; h: number }> = ({ t, opacity, w, h }) => {
  if (opacity <= 0) return null;
  const mark = prog(t, T.mark[0], T.mark[1], ease.inOut);
  return (
    <div
      style={{
        position: "absolute",
        left: w / 2 - SOURCE.w / 2,
        top: h / 2 - SOURCE.h / 2,
        width: SOURCE.w,
        height: SOURCE.h,
        padding: "40px 64px",
        boxSizing: "border-box",
        opacity,
        fontFamily: FONT,
      }}
    >
      <div
        style={{
          height: 54,
          borderRadius: 27,
          background: C.soft,
          display: "flex",
          alignItems: "center",
          gap: 12,
          padding: "0 22px",
          fontSize: 26,
          fontWeight: 600,
          color: C.sub,
          marginBottom: 44,
        }}
      >
        <Lock size={24} color={C.sub} />
        {TEXT.sourcePath}
        <div style={{ flex: 1 }} />
        <div style={{ background: C.accent, color: "white", borderRadius: 20, padding: "6px 18px", fontSize: 22, fontWeight: 700 }}>Quelle</div>
      </div>
      <div style={{ fontSize: 64, fontWeight: 800, letterSpacing: "-0.03em", marginBottom: 30 }}>{TEXT.sourceTitle}</div>
      <Line w="82%" h={16} style={{ marginBottom: 14 }} />
      <Line w="64%" h={16} style={{ marginBottom: 34 }} />
      <div style={{ fontSize: 42, fontWeight: 500, lineHeight: 1.45, marginBottom: 34 }}>
        <span
          style={{
            backgroundImage: `linear-gradient(${C.mark}, ${C.mark})`,
            backgroundRepeat: "no-repeat",
            backgroundSize: `${mark * 100}% 100%`,
            borderRadius: 8,
            padding: "2px 6px",
            fontWeight: mark > 0.5 ? 600 : 500,
          }}
        >
          {TEXT.mark}
        </span>{" "}
        und bestätige den Link in deiner E-Mail.
      </div>
      <Line w="76%" h={16} style={{ marginBottom: 14 }} />
      <Line w="52%" h={16} />
    </div>
  );
};
