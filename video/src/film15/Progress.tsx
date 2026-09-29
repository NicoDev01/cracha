import { ArrowRight, Check, Globe, LoaderCircle, MessagesSquare } from "lucide-react";
import { useCurrentFrame } from "remotion";
import { FPS, ease, lerp, prog, ui } from "../theme";
import { Layer, phase } from "./Box";
import { K, cues, mono, settle } from "./look";

const PAGES = cues.indexing.pages;
const CRAWL = { start: 5.3, end: 6.4 };
const INDEX = cues.indexing;
const PATHS = [
  "/",
  "/docs",
  "/docs/setup",
  "/docs/backups",
  "/docs/sso",
  "/pricing",
  "/docs/api",
  "/docs/export",
  "/changelog",
  "/docs/teams",
  "/security",
  "/docs/limits",
];
const number = new Intl.NumberFormat("de-DE");

// Labels as in crawl-monitor.tsx.
const STEPS = ["Vorbereiten", "Seiten crawlen", "Indexieren"];

const Marker: React.FC<{ state: "done" | "current" | "pending"; t: number }> = ({ state, t }) => (
  <span
    style={{
      width: 32,
      height: 32,
      borderRadius: 16,
      flexShrink: 0,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: state === "done" ? K.accent : "#fff",
      border: state === "done" ? "none" : `2px solid ${state === "current" ? K.accent : K.line}`,
      boxSizing: "border-box",
    }}
  >
    {state === "done" && <Check size={18} strokeWidth={3} color="#fff" />}
    {state === "current" && <LoaderCircle size={16} color={K.accent} style={{ transform: `rotate(${t * 540}deg)` }} />}
  </span>
);

export const Progress: React.FC = () => {
  const t = useCurrentFrame() / FPS;
  const crawlP = prog(t, CRAWL.start, CRAWL.end, ease.inOut);
  const indexP = prog(t, INDEX.start, INDEX.end, (x) => x);
  const crawled = Math.round(crawlP * PAGES);
  const ready = Math.floor(indexP * PAGES);
  const chunks = Math.round((ready / PAGES) * 402);
  const current = t < CRAWL.start ? 0 : t < INDEX.start ? 1 : 2;
  const percent = Math.round(current === 0 ? 6 : current === 1 ? lerp(10, 62, crawlP) : lerp(62, 100, indexP));
  const seconds = Math.max(0, Math.floor((t - INDEX.start) * 14));
  const stepState = (i: number) => (i < current || (i === 2 && ready === PAGES) ? "done" : i === current ? "current" : "pending");

  return (
    <Layer w={1100} h={520} style={phase(t, 5.15, 7.5)}>
      <div style={{ position: "absolute", inset: 0, fontFamily: ui, color: K.ink }}>
        <div style={{ position: "absolute", left: 44, top: 40, display: "flex", alignItems: "center", gap: 16 }}>
          <span style={{ width: 48, height: 48, borderRadius: 24, background: K.accentSoft, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Globe size={24} color={K.accent} />
          </span>
          <span>
            <span style={{ display: "block", fontSize: 26, fontWeight: 600 }}>docs.example.com</span>
            <span style={{ display: "block", fontSize: 17, color: K.gray5, marginTop: 2 }}>Sitemap · alle {PAGES} Seiten</span>
          </span>
        </div>

        <div style={{ position: "absolute", left: 44, right: 44, top: 124 }}>
          <div style={{ display: "flex", alignItems: "baseline", fontSize: 20, fontWeight: 500 }}>
            <span style={{ fontFamily: mono, fontSize: 15, color: K.gray4, marginRight: 12 }}>{current + 1}/3</span>
            {STEPS[current]}
            <span style={{ marginLeft: "auto", fontFamily: mono, fontSize: 16, color: K.gray5 }}>{percent} %</span>
          </div>
          <div style={{ marginTop: 12, height: 10, borderRadius: 5, background: K.soft, overflow: "hidden" }}>
            <div style={{ width: `${percent}%`, height: "100%", borderRadius: 5, background: K.accent }} />
          </div>
        </div>

        {STEPS.map((label, i) => {
          const state = stepState(i);
          const top = [200, 282, 364][i];
          return (
            <div key={label} style={{ position: "absolute", left: 44, right: 44, top, display: "flex", gap: 18 }}>
              <div style={{ position: "relative" }}>
                <Marker state={state} t={t} />
                {i < 2 && (
                  <div style={{ position: "absolute", left: 15, top: 38, width: 2, height: 38, background: K.line }}>
                    <div
                      style={{
                        width: 2,
                        height: `${(i === 0 ? (current > 0 ? 1 : 0) : crawlP) * 100}%`,
                        background: K.accent,
                      }}
                    />
                  </div>
                )}
              </div>
              <div style={{ flex: 1, paddingTop: 3 }}>
                <div style={{ fontSize: 21, fontWeight: 600, color: state === "pending" ? K.gray4 : K.ink }}>{label}</div>
                <div style={{ fontSize: 17, color: K.gray5, marginTop: 4, display: "flex", gap: 14 }}>
                  {i === 0 && "Gestartet"}
                  {i === 1 && (
                    <>
                      <span>
                        <span style={{ fontWeight: 600, color: K.gray7 }}>{number.format(crawled)}</span>
                        {current === 1 ? ` von max. ${PAGES}` : ""} Seiten erfasst
                      </span>
                      {current === 1 && (
                        <span style={{ fontFamily: mono, fontSize: 15, color: K.gray4 }}>
                          {PATHS[Math.floor(t * 11) % PATHS.length]}
                        </span>
                      )}
                    </>
                  )}
                  {i === 2 && current < 2 && "Wartet auf die Seiten"}
                  {i === 2 && current === 2 && (
                    <span>
                      <span style={{ fontWeight: 600, color: K.gray7 }}>
                        {ready} von {PAGES}
                      </span>{" "}
                      Seiten durchsuchbar{chunks > 0 && ` · ${number.format(chunks)} Abschnitte`}
                    </span>
                  )}
                </div>
                {i === 2 && current === 2 && (
                  <>
                    <div style={{ display: "flex", gap: 6, marginTop: 12 }}>
                      {Array.from({ length: PAGES }, (_, s) => {
                        const lit = prog(indexP * PAGES, s, s + 1.2, ease.out);
                        return (
                          <span key={s} style={{ position: "relative", width: 14, height: 8, borderRadius: 4, background: K.soft, overflow: "hidden" }}>
                            <span
                              style={{
                                position: "absolute",
                                inset: 0,
                                borderRadius: 4,
                                background: K.accent,
                                opacity: lit,
                                transform: `scaleX(${lerp(0.3, 1, lit)})`,
                                transformOrigin: "left",
                              }}
                            />
                          </span>
                        );
                      })}
                    </div>
                    <div style={{ fontFamily: mono, fontSize: 13, color: K.gray4, marginTop: 10 }}>
                      läuft seit {seconds} s · meist unter einer Minute
                    </div>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </Layer>
  );
};

/** The finished crawl: "Bereit" and the one way on, "Fragen stellen". */
export const Ready: React.FC = () => {
  const t = useCurrentFrame() / FPS;
  const pop = prog(t, 7.6, 7.95, settle);
  const press = prog(t, 8.0, 8.06) * (1 - prog(t, 8.06, 8.2));
  return (
    <Layer w={1100} h={200} style={phase(t, 7.62, 8.1)}>
      <div style={{ position: "absolute", inset: 0, fontFamily: ui, display: "flex", alignItems: "center", padding: "0 40px" }}>
        <span
          style={{
            width: 68,
            height: 68,
            borderRadius: 34,
            background: K.accent,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            transform: `scale(${pop})`,
          }}
        >
          <Check size={36} strokeWidth={3} color="#fff" />
        </span>
        <span style={{ marginLeft: 24 }}>
          <span style={{ display: "block", fontSize: 36, fontWeight: 700, color: K.ink, letterSpacing: "-0.01em" }}>Bereit</span>
          <span style={{ display: "block", fontSize: 18, color: K.gray5, marginTop: 4 }}>
            48 Seiten · 402 Abschnitte · docs.example.com
          </span>
        </span>
        <span
          style={{
            marginLeft: "auto",
            width: 300,
            height: 64,
            borderRadius: 16,
            background: K.accent,
            color: "#fff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 12,
            fontSize: 21,
            fontWeight: 600,
            transform: `scale(${1 - press * 0.04})`,
          }}
        >
          <MessagesSquare size={22} />
          Fragen stellen
          <ArrowRight size={22} />
        </span>
      </div>
    </Layer>
  );
};
