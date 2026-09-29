import { AbsoluteFill, useCurrentFrame } from "remotion";
import { Background } from "../Background";
import { Caption, Words, words } from "../Caption";
import { C, CX, FPS, ease, prog, track, ui, type Keyframe } from "../theme";
import { Chat } from "./Chat";
import { Crawl } from "./Crawl";
import { Knowledge } from "./Knowledge";
import { CTA } from "./layout";
import { MorphBox } from "./MorphBox";
import { Ghosts, PAIN_TARGETS, PainCaption } from "./Pain";
import { E } from "./timeline";

const TAGLINE = "Frag einfach *die ganze Website.*";

const Tagline: React.FC<{ start: number; end: number }> = ({ start, end }) => (
  <div style={{ position: "absolute", top: 610, left: CX - 800, width: 1600 }}>
    <Words words={words(TAGLINE)} start={start} end={end} size={76} stagger={0.1} />
  </div>
);

type Pos = { x: number; y: number; o: number };
const glide = ease.inOut;
const BUTTON = { x: CTA.cx + 170, y: CTA.cy + 22 };
const CLICKS = [...E.clicks, E.click];

// The pointer clicks through the site at the start and on the button at the end.
const PATH: Keyframe<Pos>[] = [
  { t: 0, x: 1400, y: 960, o: 0 },
  { t: 0.8, x: 1320, y: 900, o: 0 },
  { t: 1.0, x: 1260, y: 840, o: 1 },
  ...E.clicks.flatMap((c, k) => [
    { t: c - 0.08, ...PAIN_TARGETS[k], o: 1, e: glide },
    { t: c + 0.3, ...PAIN_TARGETS[k], o: 1 },
  ]),
  { t: 4.1, x: 1240, y: 720, o: 1, e: glide },
  { t: 4.5, x: 1300, y: 780, o: 0 },
  { t: E.click - 1.0, x: 1560, y: 960, o: 0 },
  { t: E.click - 0.85, x: 1540, y: 940, o: 1 },
  { t: E.click - 0.08, ...BUTTON, o: 1, e: glide },
  { t: E.outro + 0.1, ...BUTTON, o: 1 },
  { t: E.outro + 0.4, ...BUTTON, o: 0 },
];

const Cursor: React.FC = () => {
  const t = useCurrentFrame() / FPS;
  const p = track(t, PATH);
  const last = CLICKS.filter((c) => c <= t + 0.1).at(-1) ?? -9;
  const press = prog(t, last - 0.1, last, ease.out) - prog(t, last, last + 0.3, ease.out);
  const ripple = prog(t, last, last + 0.6, ease.out);
  const onButton = last === E.click;
  return (
    <>
      {t >= last && ripple < 1 ? (
        <div
          style={{
            position: "absolute",
            left: p.x - 50,
            top: p.y - 50,
            width: 100,
            height: 100,
            borderRadius: 50,
            border: `3px solid ${onButton ? "white" : C.orange}`,
            transform: `scale(${0.2 + ripple * (onButton ? 1.6 : 0.9)})`,
            opacity: 1 - ripple,
          }}
        />
      ) : null}
      {p.o > 0 ? (
        <svg
          width={44}
          height={44}
          viewBox="0 0 24 24"
          style={{
            position: "absolute",
            left: p.x - 6,
            top: p.y - 4,
            opacity: p.o,
            transform: `scale(${1 - press * 0.15})`,
            filter: "drop-shadow(0 6px 10px rgba(48,39,32,0.3))",
          }}
        >
          <path d="M4 2.5 L19.5 12 L12.4 13.6 L9 20.5 Z" fill={C.ink} stroke="white" strokeWidth={1.6} strokeLinejoin="round" />
        </svg>
      ) : null}
    </>
  );
};

/** The domain under the closing logo. */
const Url: React.FC = () => {
  const t = useCurrentFrame() / FPS;
  const p = prog(t, E.outro + 1.6, E.outro + 2.2, ease.back);
  if (p <= 0) return null;
  return (
    <div
      style={{
        position: "absolute",
        left: CX - 300,
        width: 600,
        top: 755,
        display: "flex",
        justifyContent: "center",
        opacity: Math.min(1, p * 1.4),
        transform: `translateY(${(1 - p) * 20}px)`,
      }}
    >
      <div
        style={{
          padding: "12px 28px",
          borderRadius: 40,
          background: "rgba(255,255,255,0.8)",
          outline: `1px solid ${C.line}`,
          fontFamily: ui,
          fontSize: 28,
          fontWeight: 600,
          color: C.accent,
        }}
      >
        cracha-app.com
      </div>
    </div>
  );
};

export const Explainer: React.FC = () => (
  <AbsoluteFill>
    <Background />

    <PainCaption />
    <Tagline start={E.tagline} end={E.logoOut} />
    <Caption title="Gib *deine Website* ein" start={E.input + 0.2} end={E.root + 0.1} />
    <Caption title="CraCha liest *jede Unterseite*" sub="bis in die tiefste Ebene, ganz automatisch" start={E.root + 0.3} end={E.converge} />
    <Caption title="Daraus entsteht *deine Wissensbasis*" start={E.converge + 0.25} end={E.chat} />
    <Caption title="Stell einfach *deine Frage*" start={E.chat + 0.3} end={E.sources} />
    <Caption title="Jede Antwort *mit Quelle*" sub="direkt aus der passenden Unterseite" start={E.sources + 0.2} end={E.cta} />
    <Caption title="Starte jetzt mit *CraCha*" sub="100 Start-Credits gratis" start={E.cta + 0.4} end={E.outro + 0.1} y={300} />

    <Ghosts />
    <Crawl />
    <Knowledge />
    <Chat />
    <MorphBox />
    <Cursor />

    <Tagline start={E.outro + 0.9} end={99} />
    <Url />
  </AbsoluteFill>
);
