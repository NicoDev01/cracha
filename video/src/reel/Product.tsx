import { evolvePath } from "@remotion/paths";
import {
  ArrowRight,
  ArrowUp,
  Bell,
  BookOpen,
  Check,
  Database,
  Download,
  FileText,
  Globe,
  CircleHelp,
  LifeBuoy,
  Link2,
  Lock,
  Mail,
  Newspaper,
  Shield,
  Tag,
  UserRound,
  Users,
} from "lucide-react";
import React from "react";
import { Row } from "./Intro";
import { Check as CheckBadge, Cursor, Line, Rect, Ring, mixRect } from "./kit";
import { Sentence } from "./Sentence";
import { C, FONT, GRADIENT, T, TEXT, clamp01, ease, lerp, prog, shadow, springAt } from "./theme";
import { GradientField, IconBubble, Logo } from "./ui";
import cues from "./cues.json";

const H2Y = -330;
const FIELD: Rect = { x: 0, y: 40, w: 1100, h: 128, r: 64 };
const HUB: Rect = { x: 0, y: 70, w: 170, h: 170, r: 85 };
const KB: Rect = { x: 0, y: 70, w: 230, h: 230, r: 115 };
const QUESTION: Rect = { x: 550 - 330, y: -175, w: 660, h: 92, r: 46 };
const ANSWER: Rect = { x: 0, y: 125, w: 1100, h: 320, r: 36 };
const CHIP: Rect = { x: -550 + 44 + 290, y: 125 + 160 - 40 - 36, w: 580, h: 72, r: 36 };
const SOURCE: Rect = { x: 0, y: 110, w: 1240, h: 560, r: 32 };

const PAGE_ICONS = [FileText, CircleHelp, Tag, Mail, UserRound, BookOpen, Download, Newspaper, Shield, Users, LifeBuoy, Bell];
const N = cues.pages;
const PAGES = PAGE_ICONS.map((icon, k) => {
  const a = -Math.PI / 2 + (k / N) * Math.PI * 2;
  return {
    icon,
    a,
    x: Math.cos(a) * 640,
    y: HUB.y + Math.sin(a) * 250,
    at: T.pages[0] + ((T.pages[1] - T.pages[0]) * ((k * 5) % N)) / (N - 1),
    arrive: T.gather[0] + ((T.gather[1] - T.gather[0]) * k) / (N - 1),
  };
});

const typed = (t: number, [a, b]: number[], text: string) => text.slice(0, Math.floor(clamp01((t - a) / (b - a)) * text.length));
const caret = (t: number) => <div style={{ width: 4, height: 50, marginLeft: 4, background: C.accent, opacity: Math.floor(t * 3) % 2 ? 1 : 0.15 }} />;

/** The round gradient button inside the field. */
const Send: React.FC<{ t: number; at: number; icon: "arrow" | "up"; x: number; show: number }> = ({ t, at, icon, x, show }) => {
  const done = t >= at;
  const s = done ? lerp(0.8, 1, prog(t, at, at + 0.3, ease.back)) : 1;
  return (
    <div
      style={{
        position: "absolute",
        left: x - 44,
        top: FIELD.h / 2 - 3 - 44,
        width: 88,
        height: 88,
        borderRadius: 44,
        background: GRADIENT,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        transform: `scale(${s})`,
        opacity: show,
      }}
    >
      {done ? <Check size={46} color="white" strokeWidth={3} /> : icon === "arrow" ? <ArrowRight size={46} color="white" strokeWidth={2.8} /> : <ArrowUp size={46} color="white" strokeWidth={2.8} />}
    </div>
  );
};

/**
 * Solution and proof: link in, every subpage read, the knowledge base, a question,
 * an answer with its source, and the source page with the passage marked. One white
 * field carries the story: link box → site → knowledge base → question box → bubble.
 */
export const Product: React.FC<{ t: number }> = ({ t }) => {
  if (t < T.logo - 0.3 || t > T.sourceOut + 0.5) return null;

  // ---- the hero field ----
  const toHub = prog(t, T.hub, T.hub + 0.45, ease.inOut);
  const toKb = prog(t, T.gather[1] - 0.1, T.kb, ease.back);
  const toPrompt = prog(t, T.askField, T.askField + 0.45, ease.inOut);
  const toQuestion = prog(t, T.qUp, T.qUp + 0.4, ease.inOut);
  const rect = mixRect(mixRect(mixRect(mixRect(FIELD, HUB, toHub), KB, toKb), FIELD, toPrompt), QUESTION, toQuestion);
  const appear = springAt(t, T.field, 12, 0.6);
  const recede = prog(t, T.sourceOpen, T.sourceOpen + 0.35, ease.out);
  const linkUi = prog(t, T.field + 0.1, T.field + 0.3, ease.out) * (1 - prog(t, T.hub, T.hub + 0.12));
  const hubUi = prog(t, T.hub + 0.15, T.hub + 0.4, ease.out) * (1 - prog(t, T.askField, T.askField + 0.12));
  const isKb = t >= T.gather[1] - 0.1;
  const askUi = prog(t, T.askField + 0.3, T.askField + 0.5, ease.out) * (1 - prog(t, T.qUp, T.qUp + 0.1));
  const qUi = prog(t, T.qUp + 0.08, T.qUp + 0.3, ease.out);

  // ---- answer and source ----
  const ans = springAt(t, T.answer[0] - 0.1, 13, 0.6);
  const answerWords = TEXT.answer.split(" ");
  const chip = prog(t, T.sourceChip, T.sourceChip + 0.35, ease.back);
  const open = prog(t, T.sourceOpen, T.sourceOpen + 0.6, ease.out);
  const leave = prog(t, T.sourceOut, T.sourceOut + 0.45, ease.inOut);
  const src = mixRect(CHIP, SOURCE, open);
  const mark = prog(t, T.mark[0], T.mark[1], ease.inOut);

  return (
    <>
      <Row y={H2Y}>
        <Sentence t={t} id="link" size="h2" out={T.linkOut} inline={{ CraCha: <Logo h={50} style={{ verticalAlign: "-0.1em" }} /> }} />
      </Row>
      <Row y={H2Y}>
        <Sentence t={t} id="crawl" size="h2" keys={["Unterseite"]} out={T.crawlOut} />
      </Row>
      <Row y={H2Y}>
        <Sentence t={t} id="base" size="h2" keys={["Wissensbasis"]} out={T.baseOut} />
      </Row>
      <Row y={H2Y}>
        <Sentence t={t} id="ask" size="h2" keys={["wissen"]} out={T.askOut} />
      </Row>
      <Row y={H2Y}>
        <Sentence t={t} id="answer" size="h2" keys={["Quelle"]} out={T.answerOut} />
      </Row>
      <Row y={H2Y}>
        <Sentence t={t} id="source" size="h2" keys={["genau"]} out={T.sourceOut} />
      </Row>

      {/* Subpages: dashed links out of the site, then each page pops with a check. */}
      <svg style={{ position: "absolute", left: -1000, top: -600, width: 2000, height: 1200, overflow: "visible" }} viewBox="-1000 -600 2000 1200">
        {PAGES.map((p, k) => {
          const d = `M0,${HUB.y} L${p.x},${p.y}`;
          const draw = prog(t, p.at - 0.25, p.at, ease.out);
          const fade = 1 - prog(t, T.gather[0] - 0.3, T.gather[0]);
          if (draw <= 0 || fade <= 0) return null;
          const ev = evolvePath(draw, d);
          return (
            <path
              key={k}
              d={d}
              stroke={C.accent}
              strokeOpacity={0.35 * fade}
              strokeWidth={3}
              strokeDasharray={ev.strokeDasharray}
              strokeDashoffset={ev.strokeDashoffset}
              strokeLinecap="round"
            />
          );
        })}
      </svg>
      {PAGES.map((p, k) => {
        const fly = prog(t, p.arrive - 0.45, p.arrive, ease.in);
        if (fly >= 1) return null;
        // Spiral in: the angle turns while the radius shrinks.
        const a = p.a + fly * 1.6;
        const rx = lerp(640, 0, fly);
        const ry = lerp(250, 0, fly);
        return (
          <IconBubble
            key={k}
            t={t}
            at={p.at}
            x={Math.cos(a) * rx}
            y={HUB.y + Math.sin(a) * ry}
            icon={p.icon}
            scale={lerp(1, 0.3, fly)}
            opacity={1 - clamp01((fly - 0.75) / 0.25)}
          />
        );
      })}

      {/* The hero field. */}
      {appear > 0 && (
        <div style={{ opacity: 1 - recede, filter: recede > 0 ? `blur(${recede * 6}px)` : undefined }}>
          <GradientField x={rect.x} y={rect.y} w={rect.w} h={rect.h} r={rect.r} border={lerp(3, 0, toQuestion)} scale={lerp(0.85, 1, appear)} opacity={Math.min(1, appear * 1.4)}>
            {linkUi > 0 && (
              <div style={{ position: "absolute", left: 0, top: 0, width: FIELD.w - 6, height: FIELD.h - 6, opacity: linkUi }}>
                <div style={{ position: "absolute", left: 40, top: 0, height: "100%", display: "flex", alignItems: "center", gap: 20, fontSize: 48, fontWeight: 600 }}>
                  <Link2 size={46} color={C.sub} strokeWidth={2.4} />
                  {t < T.type[0] ? <span style={{ color: "#b3aca5" }}>Website-Link einfügen</span> : typed(t, T.type, TEXT.domain)}
                  {t < T.submit && t >= T.type[0] && caret(t)}
                </div>
                <Send t={t} at={T.submit} icon="arrow" x={FIELD.w - 6 - 64} show={1} />
              </div>
            )}
            {hubUi > 0 && (
              <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", opacity: hubUi }}>
                {isKb ? <Database size={104} color={C.accent} strokeWidth={1.8} /> : <Globe size={80} color={C.ink} strokeWidth={1.8} />}
              </div>
            )}
            {askUi > 0 && (
              <div style={{ position: "absolute", left: 0, top: 0, width: FIELD.w - 6, height: FIELD.h - 6, opacity: askUi }}>
                <div style={{ position: "absolute", left: 44, top: 0, height: "100%", display: "flex", alignItems: "center", fontSize: 46, fontWeight: 600 }}>
                  {t < T.typeQ[0] ? <span style={{ color: "#b3aca5" }}>Frag deine Wissensbasis …</span> : typed(t, T.typeQ, TEXT.question)}
                  {t < T.send && t >= T.typeQ[0] && caret(t)}
                </div>
                <Send t={t} at={T.send} icon="up" x={FIELD.w - 6 - 64} show={1} />
              </div>
            )}
            {qUi > 0 && (
              <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 38, fontWeight: 600, opacity: qUi, whiteSpace: "nowrap" }}>
                {TEXT.question}
              </div>
            )}
          </GradientField>
          {/* Label under the site / knowledge base. */}
          {hubUi > 0 && (
            <div
              style={{
                position: "absolute",
                left: -300,
                width: 600,
                top: HUB.y + lerp(HUB.h, KB.h, toKb) / 2 + 22,
                textAlign: "center",
                fontFamily: FONT,
                fontSize: 32,
                fontWeight: 600,
                color: isKb ? C.ink : C.sub,
                opacity: hubUi,
              }}
            >
              {isKb ? "Deine Wissensbasis" : TEXT.domain}
            </div>
          )}
        </div>
      )}
      <Ring t={t} at={T.submit} x={FIELD.w / 2 - 67} y={FIELD.y} size={300} />
      <Ring t={t} at={T.kb} x={0} y={KB.y} size={700} />
      {t < T.askField && <CheckBadge t={t} at={T.kb} x={82} y={KB.y - 82} size={60} />}

      {/* Answer card: text streams word by word, then the citation and the source chip. */}
      {ans > 0 && recede < 1 && (
        <div
          style={{
            position: "absolute",
            left: ANSWER.x - ANSWER.w / 2,
            top: ANSWER.y - ANSWER.h / 2 + (1 - ans) * 40,
            width: ANSWER.w,
            height: ANSWER.h,
            borderRadius: ANSWER.r,
            background: C.white,
            boxShadow: shadow(),
            opacity: Math.min(1, ans * 1.5) * (1 - recede),
            filter: recede > 0 ? `blur(${recede * 6}px)` : undefined,
            padding: "36px 44px",
            boxSizing: "border-box",
            fontFamily: FONT,
            color: C.ink,
          }}
        >
          <Logo h={30} style={{ marginBottom: 18 }} />
          <div style={{ fontSize: 42, fontWeight: 500, lineHeight: 1.35 }}>
            {answerWords.map((w, i) => {
              const p = prog(t, lerp(T.answer[0], T.answer[1], i / (answerWords.length - 1)), lerp(T.answer[0], T.answer[1], i / (answerWords.length - 1)) + 0.3, ease.out);
              return (
                <span key={i} style={{ opacity: p, filter: p < 1 ? `blur(${(1 - p) * 8}px)` : undefined }}>
                  {w}{" "}
                </span>
              );
            })}
            <span
              style={{
                display: "inline-flex",
                width: 42,
                height: 42,
                borderRadius: 21,
                background: GRADIENT,
                color: "white",
                fontSize: 24,
                fontWeight: 800,
                alignItems: "center",
                justifyContent: "center",
                verticalAlign: "0.3em",
                transform: `scale(${prog(t, T.cite, T.cite + 0.3, ease.back)})`,
              }}
            >
              1
            </span>
          </div>
        </div>
      )}

      {/* Source chip → the source page, which tilts up out of it. */}
      {chip > 0 && leave < 1 && (
        <div style={{ perspective: 1800, position: "absolute", left: 0, top: 0 }}>
          <div
            style={{
              position: "absolute",
              left: src.x - src.w / 2,
              top: src.y - src.h / 2 - leave * 60,
              width: src.w,
              height: src.h,
              borderRadius: src.r,
              background: open > 0 ? C.white : C.soft,
              boxShadow: shadow(open),
              transform: `rotateX(${lerp(0, 26, Math.sin(open * Math.PI) * (1 - open * 0.3))}deg) scale(${lerp(0.6, 1, chip)})`,
              transformOrigin: "50% 100%",
              opacity: 1 - leave,
              filter: leave > 0 ? `blur(${leave * 10}px)` : undefined,
              overflow: "hidden",
              fontFamily: FONT,
              color: C.ink,
            }}
          >
            <div
              style={{
                position: "absolute",
                left: 0,
                top: 0,
                width: CHIP.w,
                height: CHIP.h,
                display: "flex",
                alignItems: "center",
                gap: 14,
                padding: "0 26px",
                fontSize: 30,
                fontWeight: 600,
                whiteSpace: "nowrap",
                opacity: 1 - open * 4,
              }}
            >
              <FileText size={30} color={C.accent} />
              {TEXT.sourceTitle}
              <span style={{ color: C.sub, fontWeight: 500 }}>· {TEXT.domain}</span>
            </div>
            <div
              style={{
                position: "absolute",
                left: src.w / 2 - SOURCE.w / 2,
                top: src.h / 2 - SOURCE.h / 2,
                width: SOURCE.w,
                height: SOURCE.h,
                padding: "40px 64px",
                boxSizing: "border-box",
                opacity: prog(t, T.sourceOpen + 0.15, T.sourceOpen + 0.4, ease.out),
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
                  marginBottom: 40,
                }}
              >
                <Lock size={24} color={C.sub} />
                {TEXT.sourcePath}
                <div style={{ flex: 1 }} />
                <div style={{ background: GRADIENT, color: "white", borderRadius: 20, padding: "6px 18px", fontSize: 22, fontWeight: 700 }}>Quelle</div>
              </div>
              <div style={{ fontSize: 60, fontWeight: 700, letterSpacing: "-0.025em", marginBottom: 26 }}>{TEXT.sourceTitle}</div>
              <Line w="82%" h={16} style={{ marginBottom: 14 }} />
              <Line w="64%" h={16} style={{ marginBottom: 30 }} />
              <div style={{ fontSize: 40, fontWeight: 500, lineHeight: 1.45, marginBottom: 30 }}>
                <span
                  style={{
                    backgroundImage: `linear-gradient(${C.mark}, ${C.mark})`,
                    backgroundRepeat: "no-repeat",
                    backgroundSize: `${mark * 100}% 100%`,
                    borderRadius: 8,
                    padding: "2px 6px",
                  }}
                >
                  {TEXT.mark}
                </span>{" "}
                und bestätige den Link in deiner E-Mail.
              </div>
              <Line w="76%" h={16} style={{ marginBottom: 14 }} />
              <Line w="52%" h={16} />
            </div>
          </div>
        </div>
      )}

      <Cursor
        t={t}
        show={[T.type[1] - 0.1, T.submit + 0.35]}
        clicks={[T.submit]}
        path={[
          { t: T.type[1] - 0.1, x: 560, y: 330 },
          { t: T.submit - 0.08, x: FIELD.w / 2 - 67, y: FIELD.y + 8 },
          { t: T.submit + 0.35, x: FIELD.w / 2 - 30, y: FIELD.y + 70 },
        ]}
      />
      <Cursor
        t={t}
        show={[T.typeQ[1] - 0.1, T.send + 0.3]}
        clicks={[T.send]}
        path={[
          { t: T.typeQ[1] - 0.1, x: 560, y: 330 },
          { t: T.send - 0.08, x: FIELD.w / 2 - 67, y: FIELD.y + 8 },
          { t: T.send + 0.3, x: FIELD.w / 2 - 30, y: FIELD.y + 70 },
        ]}
      />
      <Cursor
        t={t}
        show={[T.sourceChip + 0.35, T.sourceOpen + 0.35]}
        clicks={[T.sourceClick]}
        path={[
          { t: T.sourceChip + 0.35, x: 300, y: 420 },
          { t: T.sourceClick - 0.08, x: CHIP.x - 120, y: CHIP.y + 6 },
          { t: T.sourceOpen + 0.35, x: CHIP.x - 60, y: CHIP.y + 90 },
        ]}
      />
    </>
  );
};
