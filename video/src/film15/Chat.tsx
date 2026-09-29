import { ArrowUp, ArrowUpRight, BookOpen, ChevronDown, Database, FileCheck, MessageSquare, Search } from "lucide-react";
import { useLayoutEffect, useRef } from "react";
import { interpolateColors, useCurrentFrame } from "remotion";
import { FPS, ease, lerp, prog, ui } from "../theme";
import { Layer, phase } from "./Box";
import { K, cues, settle, typed } from "./look";

export const CHAT = { w: 1300, h: 720 };
const Q = cues.typing[1];
const SEND = 9.5;
const HOVER = cues.hover;

// The answer, streamed in; each line ends on its citation marker.
const LINES = [
  { start: 10.5, end: 10.82, parts: [{ s: "Backups werden " }, { s: "30 Tage", b: true }, { s: " aufbewahrt." }], chip: 1 },
  { start: 10.86, end: 11.14, parts: [{ s: "Im Business-Tarif sind es " }, { s: "90 Tage", b: true }, { s: "." }], chip: 2 },
];

const reveal = (t: number, parts: { s: string; b?: boolean }[], start: number, end: number) => {
  const total = parts.reduce((n, p) => n + p.s.length, 0);
  let left = Math.round(prog(t, start, end, (x) => x) * total);
  return parts.map((p) => {
    const s = p.s.slice(0, Math.max(0, left));
    left -= p.s.length;
    return { ...p, s };
  });
};

/** Citation chip as in citation.tsx: just the number, raised like a footnote. */
const Chip: React.FC<{ n: number; show: number; active: number; chipRef?: React.Ref<HTMLSpanElement> }> = ({ n, show, active, chipRef }) => (
  <span
    ref={chipRef}
    style={{
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      width: 26,
      height: 26,
      marginLeft: 6,
      borderRadius: 13,
      verticalAlign: "0.3em",
      fontSize: 14,
      fontWeight: 600,
      background: interpolateColors(active, [0, 1], [K.soft, K.accent]),
      color: active > 0.5 ? "#fff" : K.gray5,
      opacity: show,
      transform: `scale(${lerp(0.6, 1, show)})`,
    }}
  >
    {n}
  </span>
);

const HoverCard: React.FC<{ t: number; chip: { x: number; y: number } }> = ({ t, chip }) => {
  const m = prog(t, HOVER + 0.05, HOVER + 0.42, settle);
  if (m <= 0 || t > 12.5) return null;
  const from = { x: chip.x - 13, y: chip.y - 13, w: 26, h: 26, r: 13 };
  const to = { x: chip.x + 26, y: chip.y - 16, w: 580, h: 196, r: 20 };
  const c = prog(t, HOVER + 0.28, HOVER + 0.5, ease.out);
  return (
    <div
      style={{
        position: "absolute",
        left: lerp(from.x, to.x, m),
        top: lerp(from.y, to.y, m),
        width: lerp(from.w, to.w, m),
        height: lerp(from.h, to.h, m),
        borderRadius: lerp(from.r, to.r, m),
        background: interpolateColors(m, [0, 0.6], [K.accent, "#ffffff"]),
        border: `1px solid rgba(233,228,222,${m})`,
        boxShadow: `0 10px 36px rgba(16,24,40,${0.14 * m})`,
        overflow: "hidden",
      }}
    >
      <div style={{ position: "absolute", left: 24, top: 20, width: 532, opacity: c, filter: c < 1 ? `blur(${(1 - c) * 6}px)` : undefined }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 16, fontWeight: 500, color: K.gray5 }}>
          Abschnitt: Aufbewahrung
          <ArrowUpRight size={17} />
        </div>
        <p style={{ margin: "12px 0 0", fontSize: 21, lineHeight: 1.6, color: K.text }}>
          Mit dem <Mark>Business-Tarif</Mark> bleiben Sicherungen <Mark>90 Tage</Mark> erhalten. Danach werden sie automatisch
          gelöscht.
        </p>
      </div>
    </div>
  );
};

const Mark: React.FC<{ children: string }> = ({ children }) => (
  <mark style={{ background: K.accentMark, color: "inherit", fontWeight: 600, borderRadius: 4, padding: "0 3px" }}>{children}</mark>
);

export const Chat: React.FC<{ chip: { x: number; y: number }; onChip: (p: { x: number; y: number }) => void }> = ({ chip, onChip }) => {
  const t = useCurrentFrame() / FPS;
  const root = useRef<HTMLDivElement>(null);
  const chipRef = useRef<HTMLSpanElement>(null);

  // Where marker 2 ended up, so the cursor and the hover card can find it.
  useLayoutEffect(() => {
    if (!root.current || !chipRef.current) return;
    const r = root.current.getBoundingClientRect();
    const c = chipRef.current.getBoundingClientRect();
    const scale = r.width / CHAT.w;
    const x = Math.round((c.left + c.width / 2 - r.left) / scale);
    const y = Math.round((c.top + c.height / 2 - r.top) / scale);
    if (x !== chip.x || y !== chip.y) onChip({ x, y });
  });

  const style = phase(t, 8.3, 12.5);
  const focus = prog(t, 8.45, 8.6);
  const sent = t >= SEND;
  const question = sent ? "" : typed(t, Q.text, Q.start, Q.end);
  const caret = t > 8.5 && !sent && Math.floor(t * 3) % 2 === 0;
  const bubble = prog(t, SEND, SEND + 0.42, settle);
  const searching = phase(t, 9.68, 10.5);
  const narrowed = t >= 10.05;
  const pages = Math.round(prog(t, 9.7, 10.0, ease.out) * 48);
  const passages = Math.round(prog(t, 9.8, 10.05, ease.out) * 17);
  const sources = prog(t, 11.15, 11.45, ease.out);
  const hover = prog(t, HOVER - 0.05, HOVER + 0.05);

  return (
    <Layer w={CHAT.w} h={CHAT.h} style={style}>
      <div ref={root} style={{ position: "absolute", inset: 0, fontFamily: ui, color: K.ink }}>
        <div
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            top: 0,
            height: 88,
            borderBottom: `1px solid ${K.line}`,
            display: "flex",
            alignItems: "center",
            padding: "0 32px",
            gap: 16,
          }}
        >
          <span style={{ width: 48, height: 48, borderRadius: 14, background: K.accent, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <MessageSquare size={24} color="#fff" />
          </span>
          <span style={{ fontSize: 23, fontWeight: 600 }}>CraCha Chat</span>
          <span style={{ marginLeft: "auto", ...pill }}>
            <Database size={19} color={K.gray5} />
            docs.example.com
            <ChevronDown size={19} color={K.gray5} />
          </span>
          <span style={pill}>
            <FileCheck size={18} />
            Content-Check
          </span>
        </div>

        {/* The question leaves the input and settles as the user's bubble. */}
        <div
          style={{
            position: "absolute",
            right: 80,
            top: 128,
            padding: "14px 26px",
            borderRadius: 28,
            background: K.accent,
            color: "#fff",
            fontSize: 22,
            opacity: bubble > 0 ? Math.min(1, bubble * 3) : 0,
            transform: `translateY(${lerp(518, 0, bubble)}px) scale(${lerp(0.96, 1, bubble)})`,
            transformOrigin: "right bottom",
          }}
        >
          {Q.text}
        </div>

        {searching && (
          <div style={{ position: "absolute", left: 80, top: 236, display: "flex", gap: 16, ...searching }}>
            <span style={{ position: "relative", width: 44, height: 44, borderRadius: 22, background: K.accentSoft, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <span
                style={{
                  position: "absolute",
                  inset: 0,
                  borderRadius: 22,
                  background: K.accentMark,
                  transform: `scale(${1 + ((t * 1.6) % 1) * 0.5})`,
                  opacity: 1 - ((t * 1.6) % 1),
                }}
              />
              <Search size={20} color={K.accent} style={{ position: "relative" }} />
            </span>
            <span>
              <span style={{ display: "block", fontSize: 21, fontWeight: 500, color: K.gray7 }}>
                {narrowed ? "Wähle die passendsten Quellen …" : "Durchsuche die Wissensbasis …"}
              </span>
              <span style={{ display: "block", fontSize: 17, color: K.gray5, marginTop: 4 }}>
                Geprüfte Quellen: <span style={{ fontWeight: 600, color: K.accent }}>{pages}</span>
                {passages > 0 && ` · ${passages} Textstellen`}
                {narrowed && " · 2 ausgewählt"}
              </span>
            </span>
          </div>
        )}

        <div style={{ position: "absolute", left: 80, top: 230, fontSize: 25, lineHeight: "46px", color: K.text }}>
          {LINES.map((line) => (
            <div key={line.chip} style={{ height: 46, whiteSpace: "nowrap" }}>
              {reveal(t, line.parts, line.start, line.end).map((p, i) => (
                <span key={i} style={{ fontWeight: p.b ? 700 : 400, color: p.b ? K.ink : undefined }}>
                  {p.s}
                </span>
              ))}
              <Chip
                n={line.chip}
                show={prog(t, line.end, line.end + 0.14, ease.out)}
                active={line.chip === 2 ? hover : 0}
                chipRef={line.chip === 2 ? chipRef : undefined}
              />
            </div>
          ))}
        </div>

        <div
          style={{
            position: "absolute",
            left: 80,
            right: 80,
            top: 350,
            paddingTop: 18,
            borderTop: `1px solid ${K.line}`,
            display: "flex",
            alignItems: "center",
            gap: 12,
            fontSize: 18,
            fontWeight: 500,
            color: K.gray7,
            opacity: sources,
            transform: `translateY(${(1 - sources) * 12}px)`,
          }}
        >
          <BookOpen size={20} color={K.gray4} />
          Verwendete Quellen
          <span style={{ fontSize: 15, padding: "2px 10px", borderRadius: 12, background: K.soft, color: K.gray5 }}>2</span>
          <span style={{ fontSize: 15, fontWeight: 400, color: K.gray4 }}>docs.example.com</span>
          <ChevronDown size={20} color={K.gray4} style={{ marginLeft: "auto" }} />
        </div>

        <div style={{ position: "absolute", left: 0, right: 0, top: 616, bottom: 0, borderTop: `1px solid ${K.line}` }}>
          <div
            style={{
              position: "absolute",
              left: 40,
              right: 40,
              top: 16,
              height: 72,
              borderRadius: 22,
              border: `2px solid ${interpolateColors(focus, [0, 1], [K.line, K.accent])}`,
              boxSizing: "border-box",
              display: "flex",
              alignItems: "center",
              padding: "0 12px 0 24px",
              fontSize: 22,
            }}
          >
            <span style={{ color: question ? K.ink : K.gray4 }}>
              {question || "Frage etwas zu deiner Wissensbasis …"}
              <span style={{ display: "inline-block", width: 2, height: "1.1em", marginLeft: 2, verticalAlign: "-0.2em", background: caret ? K.accent : "transparent" }} />
            </span>
            <span
              style={{
                marginLeft: "auto",
                width: 48,
                height: 48,
                borderRadius: 24,
                background: question ? K.accent : "#e4e7ec",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                transform: `scale(${1 - (prog(t, SEND, SEND + 0.06) - prog(t, SEND + 0.06, SEND + 0.2)) * 0.12})`,
              }}
            >
              <ArrowUp size={24} color="#fff" />
            </span>
          </div>
        </div>

        <HoverCard t={t} chip={chip} />
      </div>
    </Layer>
  );
};

const pill: React.CSSProperties = {
  height: 46,
  padding: "0 18px",
  borderRadius: 23,
  border: `1px solid ${K.line}`,
  display: "flex",
  alignItems: "center",
  gap: 10,
  fontSize: 17,
  fontWeight: 500,
  color: K.gray7,
};
