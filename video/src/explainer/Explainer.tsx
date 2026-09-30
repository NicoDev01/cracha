import { ArrowRight } from "lucide-react";
import { AbsoluteFill, Audio, Sequence, staticFile } from "remotion";
import { Background } from "../Background";
import { C, CX, CY, FPS, GRADIENT, heading, lerp, prog, track, ui, type Keyframe } from "../theme";
import { Box } from "./Box";
import { Answer, DIVE_ORIGIN, SourceDive, diveAt } from "./Chat";
import { Crawl, Knowledge } from "./Crawl";
import { Edge } from "./Edge";
import { Hook } from "./Hook";
import { DARK, Headline, K, Kinetic, Pointer, Ripple, clamp01, ez, pressAt, sp, useT } from "./kit";
import { Problem } from "./Problem";
import vo from "./vo.json";

const TAGLINE = "Frag einfach *die ganze Website.*";

/** The light world opens as a circle out of the orange dot. */
const LightWorld: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const t = useT();
  if (t < K.drop) return null;
  const r = 20 + prog(t, K.drop, K.drop + 0.75, ez.out) * 1260;
  return <AbsoluteFill style={{ clipPath: r < 1250 ? `circle(${r}px at ${CX}px ${CY}px)` : undefined }}>{children}</AbsoluteFill>;
};

const Shockwave: React.FC = () => {
  const t = useT();
  return (
    <>
      {[0, 0.1, 0.22].map((d, i) => {
        const p = prog(t, K.drop + d, K.drop + d + 0.9, ez.out);
        if (p <= 0 || p >= 1) return null;
        const size = 2600;
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: CX - size / 2,
              top: CY - size / 2,
              width: size,
              height: size,
              borderRadius: size,
              border: `${(1 - p) * (10 - i * 3) + 1}px solid ${i === 1 ? "rgba(255,255,255,0.8)" : "rgba(249,115,22,0.9)"}`,
              transform: `scale(${0.01 + p * (0.55 - i * 0.08)})`,
              opacity: 1 - p,
            }}
          />
        );
      })}
    </>
  );
};

/** Everything of the chat except source 1 falls back while the camera dives into it. */
const ChatDepth: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const t = useT();
  const d = t < K.edge.back ? diveAt(t) : 0;
  return (
    <AbsoluteFill
      style={{
        transformOrigin: `${DIVE_ORIGIN.cx}px ${DIVE_ORIGIN.cy}px`,
        transform: `scale(${1 + d * 0.35})`,
        filter: d > 0.01 ? `blur(${d * 14}px)` : undefined,
        opacity: 1 - d,
      }}
    >
      {children}
    </AbsoluteFill>
  );
};

const BUTTON = { cx: CX, cy: 716, w: 580, h: 116 };

const Cta: React.FC = () => {
  const t = useT();
  const pop = sp(t, K.cta.button, 11, 180);
  const press = pressAt(t, K.cta.click);
  const sub = sp(t, K.cta.sub, 14, 200);
  const url = sp(t, K.cta.url, 14, 200);
  const cursor: Keyframe<{ x: number; y: number; o: number }>[] = [
    { t: 0, x: 1560, y: 1000, o: 0 },
    { t: K.cta.click - 0.8, x: 1560, y: 1000, o: 0 },
    { t: K.cta.click - 0.65, x: 1500, y: 960, o: 1 },
    { t: K.cta.click - 0.05, x: BUTTON.cx + 190, y: BUTTON.cy + 24, o: 1, e: ez.soft },
    { t: K.cta.click + 0.6, x: BUTTON.cx + 190, y: BUTTON.cy + 24, o: 1 },
    { t: K.cta.click + 1.0, x: BUTTON.cx + 260, y: BUTTON.cy + 120, o: 0 },
  ];
  const c = track(t, cursor);
  if (t < K.cta.logo) return null;
  return (
    <>
      <div style={{ position: "absolute", left: 80, right: 80, top: 540 }}>
        <Kinetic text={TAGLINE} start={K.cta.logo + 0.05} end={99} times={[37.65, 37.92, 38.3, 38.5, 38.72]} size={80} />
      </div>
      {pop > 0.001 ? (
        <div
          style={{
            position: "absolute",
            left: BUTTON.cx - BUTTON.w / 2,
            top: BUTTON.cy - BUTTON.h / 2,
            width: BUTTON.w,
            height: BUTTON.h,
            borderRadius: BUTTON.h / 2,
            background: GRADIENT,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 14,
            fontFamily: heading,
            fontWeight: 800,
            fontSize: 42,
            color: C.ink,
            boxShadow: `0 ${24 - press * 12}px 50px -14px rgba(249,115,22,0.7)`,
            transform: `scale(${pop * (1 - press * 0.06)})`,
            opacity: Math.min(1, pop * 2),
          }}
        >
          Jetzt kostenlos testen <ArrowRight size={40} strokeWidth={2.8} />
        </div>
      ) : null}
      <Ripple x={BUTTON.cx + 190} y={BUTTON.cy + 24} at={K.cta.click} color="#ffffff" size={220} />
      <div style={{ position: "absolute", left: 0, right: 0, top: BUTTON.cy + 84, textAlign: "center", fontFamily: ui, fontSize: 28, fontWeight: 600, color: C.muted, opacity: Math.min(1, sub * 1.5), transform: `translateY(${(1 - sub) * 20}px)` }}>
        100 Start-Credits gratis
      </div>
      <div style={{ position: "absolute", left: 0, right: 0, top: 950, display: "flex", justifyContent: "center" }}>
        <div
          style={{
            padding: "12px 30px",
            borderRadius: 40,
            background: "rgba(255,255,255,0.85)",
            outline: `1px solid ${C.line}`,
            fontFamily: ui,
            fontSize: 30,
            fontWeight: 700,
            color: C.accent,
            opacity: Math.min(1, url * 1.5),
            transform: `translateY(${(1 - url) * 24}px)`,
          }}
        >
          cracha-app.com
        </div>
      </div>
      <Pointer x={c.x} y={c.y} opacity={c.o} press={press} />
    </>
  );
};

const IntroTagline: React.FC = () => (
  <div style={{ position: "absolute", left: 80, right: 80, top: 640 }}>
    <Kinetic text={TAGLINE} start={12.55} end={K.intro.out} times={[12.6, 13.0, 13.8, 14.05, 14.3]} size={80} />
  </div>
);

// Music ducks under the voice.
const LINES = Object.entries(K.vo).map(([id, start]) => ({ id, start, dur: (vo as Record<string, { duration: number }>)[id].duration }));
const speaking = (t: number) =>
  Math.max(0, ...LINES.map((l) => Math.min(clamp01((t - l.start + 0.15) / 0.15), clamp01((l.start + l.dur + 0.25 - t) / 0.3))));

const musicVolume = (frame: number) => {
  const t = frame / FPS;
  const fade = Math.min(clamp01(t / K.music.fadeIn), 1 - prog(t, K.music.fadeOut, K.duration, (x) => x));
  return fade * lerp(0.62, 0.3, speaking(t));
};

export const Explainer: React.FC = () => (
  <AbsoluteFill style={{ background: DARK.bg }}>
    <AbsoluteFill style={{ background: "radial-gradient(ellipse at 50% 45%, rgba(120,60,30,0.22) 0%, rgba(17,13,11,0) 65%)" }} />
    <Hook />
    <Problem />

    <LightWorld>
      <Background />
      <Crawl />
      <Knowledge />
      <Edge />
      <ChatDepth>
        <Answer />
        <Box />
      </ChatDepth>
      <SourceDive />
      <IntroTagline />
      <Headline text="Link *rein.*" start={15.3} end={16.25} />
      <Headline text="Liest *jede Unterseite*" start={16.35} end={18.15} y={40} />
      <Headline text="Bis in die *tiefste Ebene*" start={18.25} end={19.8} y={40} />
      <Headline text="Deine eigene *Wissensbasis*" start={21.4} end={23.75} />
      <Headline text="Stell einfach *deine Frage*" start={24.7} end={26.9} />
      <Headline text="Die Antwort, *sofort.*" start={27.35} end={29.0} />
      <Headline text="Mit *Quelle*" start={29.05} end={30.1} />
      <Headline text="Direkt zur *richtigen Stelle*" start={30.2} end={31.85} />
      <Headline text="Wie eine *KI-Suche* …" start={32.25} end={33.35} y={40} />
      <Headline text="… nur *gründlicher.*" start={33.4} end={34.55} y={40} />
      <Headline text="Jede Website. *Jede Unterseite.*" start={34.7} end={36.95} />
      <Cta />
    </LightWorld>
    <Shockwave />

    <Audio src={staticFile("explainer-bed.mp3")} trimBefore={Math.round(K.music.offset * FPS)} volume={musicVolume} />
    <Audio src={staticFile("explainer-sfx.wav")} volume={0.8} />
    {LINES.map((l) => (
      <Sequence key={l.id} from={Math.round(l.start * FPS)} layout="none">
        <Audio src={staticFile(`vo/${l.id}.wav`)} />
      </Sequence>
    ))}
  </AbsoluteFill>
);
