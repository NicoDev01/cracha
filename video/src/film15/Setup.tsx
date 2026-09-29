import { File, Globe, ListTree, LoaderCircle, Search } from "lucide-react";
import { useCurrentFrame } from "remotion";
import { FPS, ease, lerp, prog, ui } from "../theme";
import { Layer, phase } from "./Box";
import { K, cues, settle, typed } from "./look";

const URL = cues.typing[0];

/**
 * The address field. It is the pill on its own, then shrinks into the top of
 * the setup card without leaving the screen, as in crawl-config-form.tsx.
 */
const UrlRow: React.FC<{ t: number }> = ({ t }) => {
  const style = phase(t, 1.85, 5.0);
  if (!style) return null;
  const m = prog(t, 3.5, 3.95, settle);
  const focus = prog(t, 1.95, 2.1);
  const text = typed(t, URL.text, URL.start, URL.end);
  const caret = t > 2.0 && t < 3.0 && Math.floor(t * 3) % 2 === 0;
  const loading = t >= 3.0 && t < 3.55;
  const hover = prog(t, 2.8, 2.95) * (1 - prog(t, 3.4, 3.6));
  return (
    <div
      style={{
        position: "absolute",
        left: lerp(0, 40, m),
        top: lerp(0, 40, m),
        width: lerp(1100, 1020, m),
        height: lerp(104, 72, m),
        borderRadius: lerp(52, 18, m),
        border: `2px solid rgba(233,228,222,${m})`,
        display: "flex",
        alignItems: "center",
        fontFamily: ui,
        ...style,
      }}
    >
      <Globe
        size={lerp(32, 24, m)}
        strokeWidth={1.8}
        color={focus > 0.5 && t < 3.5 ? K.accent : K.gray4}
        style={{ marginLeft: lerp(38, 22, m), flexShrink: 0 }}
      />
      <span
        style={{
          marginLeft: lerp(20, 14, m),
          fontSize: lerp(32, 24, m),
          color: text ? K.ink : K.gray4,
          letterSpacing: "-0.01em",
          whiteSpace: "nowrap",
        }}
      >
        {text || "https://deine-website.de"}
        <span style={{ display: "inline-block", width: 3, height: "1.05em", marginLeft: 2, verticalAlign: "-0.15em", background: caret ? K.accent : "transparent" }} />
      </span>
      <span
        style={{
          marginLeft: "auto",
          marginRight: lerp(20, 10, m),
          height: lerp(64, 50, m),
          padding: `0 ${lerp(26, 18, m)}px`,
          borderRadius: lerp(20, 14, m),
          display: "flex",
          alignItems: "center",
          gap: 10,
          fontSize: lerp(24, 19, m),
          fontWeight: 500,
          color: hover > 0.5 ? K.ink : K.gray5,
          background: `rgba(244,241,237,${0.5 + hover * 0.5})`,
        }}
      >
        {loading ? (
          <LoaderCircle size={lerp(26, 20, m)} style={{ transform: `rotate(${t * 720}deg)` }} />
        ) : (
          <Search size={lerp(26, 20, m)} />
        )}
        Analysieren
      </span>
    </div>
  );
};

const MODES = [
  { label: "Einzelne Seite", icon: File },
  { label: "Unterseiten", icon: Globe },
  { label: "Sitemap", icon: ListTree },
];

/** A row that rises into place a little after the card has opened. */
const rise = (t: number, at: number) => {
  const p = prog(t, at, at + 0.4, ease.out);
  return { opacity: p, transform: `translateY(${(1 - p) * 18}px)` };
};

export const Setup: React.FC = () => {
  const t = useCurrentFrame() / FPS;
  const on = prog(t, 4.0, 4.14, ease.out);
  // Sitemap is chosen once the analysis found one; the highlight slides over.
  const seg = prog(t, 3.8, 4.1, settle);
  const press = prog(t, 4.5, 4.56) * (1 - prog(t, 4.56, 4.72));
  return (
    <>
      <UrlRow t={t} />
      <Layer w={1100} h={430} style={phase(t, 3.72, 5.0)}>
        <div style={{ position: "absolute", inset: 0, fontFamily: ui }}>
          <div
            style={{
              position: "absolute",
              left: 40,
              top: 132,
              width: 1020,
              height: 60,
              borderRadius: 14,
              background: K.accentSoft,
              display: "flex",
              alignItems: "center",
              padding: "0 18px 0 22px",
              boxSizing: "border-box",
              fontSize: 21,
              color: K.gray7,
              ...rise(t, 3.72),
            }}
          >
            <span style={{ fontWeight: 600, color: K.accent }}>48</span>&nbsp;Seiten in der Sitemap
            <span style={{ marginLeft: "auto", fontSize: 17, color: K.gray5, marginRight: 14 }}>Alle einlesen</span>
            <span style={{ width: 56, height: 32, borderRadius: 16, background: on > 0.5 ? K.accent : "#d0d5dd", position: "relative" }}>
              <span
                style={{
                  position: "absolute",
                  top: 3,
                  left: lerp(3, 27, on),
                  width: 26,
                  height: 26,
                  borderRadius: 13,
                  background: "#fff",
                  boxShadow: "0 1px 3px rgba(16,24,40,0.2)",
                }}
              />
            </span>
          </div>
          <div style={{ position: "absolute", left: 40, top: 212, fontSize: 18, fontWeight: 500, color: K.gray7, ...rise(t, 3.8) }}>
            Umfang
          </div>
          <div
            style={{
              position: "absolute",
              left: 40,
              top: 244,
              width: 1020,
              height: 62,
              borderRadius: 16,
              background: K.soft,
              ...rise(t, 3.84),
            }}
          >
            <div
              style={{
                position: "absolute",
                top: 5,
                left: 5 + lerp(1, 2, seg) * 336.7,
                width: 336.7,
                height: 52,
                borderRadius: 12,
                background: "#fff",
                boxShadow: "0 1px 3px rgba(16,24,40,0.1)",
              }}
            />
            <div style={{ position: "absolute", inset: 5, display: "grid", gridTemplateColumns: "1fr 1fr 1fr" }}>
              {MODES.map(({ label, icon: Icon }, i) => {
                const active = i === (seg > 0.5 ? 2 : 1);
                return (
                  <div
                    key={label}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 10,
                      fontSize: 19,
                      fontWeight: 500,
                      color: active ? K.ink : K.gray5,
                      position: "relative",
                    }}
                  >
                    <Icon size={20} />
                    {label}
                  </div>
                );
              })}
            </div>
          </div>
          <div
            style={{
              position: "absolute",
              left: 40,
              top: 330,
              width: 1020,
              height: 64,
              borderRadius: 16,
              background: K.accent,
              color: "#fff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 21,
              fontWeight: 600,
              ...rise(t, 3.9),
              transform: `${rise(t, 3.9).transform} scale(${1 - press * 0.025})`,
            }}
          >
            Crawl starten
          </div>
        </div>
      </Layer>
    </>
  );
};
