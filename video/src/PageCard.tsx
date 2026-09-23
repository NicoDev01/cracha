import { C, ui } from "./theme";

const DOTS = ["#ff8a80", "#ffd166", "#7bdcb5"];

/**
 * A browser window reduced to its skeleton. `s` scales everything, so the root
 * page, the subpages and the tiny leaves are the same drawing.
 */
export const PageContent: React.FC<{ w: number; h: number; url?: string; s?: number; tint?: string }> = ({
  w,
  h,
  url,
  s = 1,
  tint = C.indigo,
}) => {
  const bar = 34 * s;
  const pad = 18 * s;
  const line = (width: string, top: number, color = "#eceef6", height = 10 * s) => (
    <div style={{ position: "absolute", left: pad, top, width, height, borderRadius: height, background: color }} />
  );
  return (
    <div style={{ position: "absolute", left: "50%", top: "50%", width: w, height: h, marginLeft: -w / 2, marginTop: -h / 2 }}>
      <div
        style={{
          position: "absolute",
          inset: 0,
          height: bar,
          borderBottom: `1px solid ${C.line}`,
          display: "flex",
          alignItems: "center",
          gap: 6 * s,
          paddingLeft: 14 * s,
        }}
      >
        {DOTS.map((c) => (
          <div key={c} style={{ width: 9 * s, height: 9 * s, borderRadius: 9, background: c }} />
        ))}
        {url ? (
          <div
            style={{
              marginLeft: 10 * s,
              padding: `${3 * s}px ${10 * s}px`,
              borderRadius: 20,
              background: "#f2f3f9",
              fontFamily: ui,
              fontSize: 13 * s,
              fontWeight: 500,
              color: C.muted,
              whiteSpace: "nowrap",
            }}
          >
            {url}
          </div>
        ) : null}
      </div>
      {line("46%", bar + pad, `${tint}33`, 14 * s)}
      {line("72%", bar + pad + 28 * s)}
      {line("58%", bar + pad + 46 * s)}
      {h / s > 150 ? line("66%", bar + pad + 64 * s) : null}
      {h / s > 150 ? line("40%", bar + pad + 82 * s) : null}
      {h / s > 150 ? (
        <div
          style={{
            position: "absolute",
            right: pad,
            bottom: pad,
            width: w * 0.3,
            height: h * 0.32,
            borderRadius: 10 * s,
            background: `linear-gradient(135deg, ${tint}26, ${C.purple}26)`,
          }}
        />
      ) : null}
    </div>
  );
};

/**
 * A glowing band sweeping over a page. `pos` runs 0..1 from top to bottom;
 * `dir` says which way it is moving, so the trail sits behind the edge.
 */
export const ScanBand: React.FC<{ pos: number; dir: 1 | -1; top: number; height: number; strength?: number }> = ({
  pos,
  dir,
  top,
  height,
  strength = 1,
}) => {
  const trail = Math.max(16, height * 0.22);
  const edge = top + pos * height;
  return (
    <>
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: dir === 1 ? edge - trail : edge,
          height: trail,
          background:
            dir === 1
              ? `linear-gradient(180deg, ${C.indigo}00, ${C.indigo}${Math.round(strength * 70).toString(16).padStart(2, "0")})`
              : `linear-gradient(0deg, ${C.indigo}00, ${C.indigo}${Math.round(strength * 70).toString(16).padStart(2, "0")})`,
        }}
      />
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: edge - 1.5,
          height: 3,
          background: C.indigo,
          opacity: strength,
          boxShadow: `0 0 14px 2px ${C.indigo}aa`,
        }}
      />
    </>
  );
};
