import { Check as CheckIcon, LucideIcon } from "lucide-react";
import React from "react";
import { LOGO_PATHS, LOGO_VIEWBOX } from "./logo";
import { C, FONT, GRAD_STOPS, GRADIENT, clamp01, ease, lerp, prog, shadow, springAt } from "./theme";

/** The wordmark as plain SVG, `h` tall. */
export const Logo: React.FC<{ h: number; color?: string; style?: React.CSSProperties }> = ({ h, color = C.ink, style }) => {
  const [x, y, w, hh] = LOGO_VIEWBOX;
  return (
    <svg height={h} width={(h * w) / hh} viewBox={`${x} ${y} ${w} ${hh}`} style={{ display: "inline-block", overflow: "visible", ...style }}>
      {LOGO_PATHS.map((d) => (
        <path key={d} d={d} fill={color} />
      ))}
    </svg>
  );
};

let gid = 0;

/**
 * A gradient arc that sweeps round a circle and closes: the "loading → done"
 * swirl from the Bard film, drawn around bubbles and the logo.
 */
export const Swirl: React.FC<{ t: number; at: number; size: number; dur?: number; width?: number; fadeOut?: boolean }> = ({
  t,
  at,
  size,
  dur = 0.55,
  width = 5,
  fadeOut = true,
}) => {
  const [id] = React.useState(() => `sw${gid++}`);
  const p = clamp01((t - at) / dur);
  if (p <= 0 || (fadeOut && p >= 1 && t > at + dur + 0.35)) return null;
  const draw = ease.inOut(p);
  const spin = lerp(-120, 250, ease.out(p));
  const fade = fadeOut ? 1 - prog(t, at + dur, at + dur + 0.35, ease.out) : 1;
  const r = size / 2 - width;
  return (
    <svg
      width={size}
      height={size}
      style={{ position: "absolute", left: -size / 2, top: -size / 2, transform: `rotate(${spin}deg)`, opacity: fade, overflow: "visible" }}
    >
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
          {GRAD_STOPS.map((c, i) => (
            <stop key={c} offset={i / (GRAD_STOPS.length - 1)} stopColor={c} />
          ))}
        </linearGradient>
      </defs>
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke={`url(#${id})`}
        strokeWidth={width}
        strokeLinecap="round"
        pathLength={1}
        strokeDasharray={`${Math.max(0.001, draw)} 1`}
      />
    </svg>
  );
};

/** White circle with an icon: swirl first, then the circle pops, then an orange check. */
export const IconBubble: React.FC<{
  t: number;
  at: number;
  x: number;
  y: number;
  size?: number;
  icon: LucideIcon;
  color?: string;
  check?: boolean;
  scale?: number;
  opacity?: number;
  label?: string;
}> = ({ t, at, x, y, size = 108, icon: Icon, color = C.ink, check = true, scale = 1, opacity = 1, label }) => {
  if (t < at) return null;
  const pop = springAt(t, at + 0.12, 12, 0.5);
  const done = prog(t, at + 0.5, at + 0.8, ease.back);
  return (
    <div style={{ position: "absolute", left: x, top: y, transform: `scale(${scale})`, opacity }}>
      <Swirl t={t} at={at} size={size + 26} />
      <div
        style={{
          position: "absolute",
          left: -size / 2,
          top: -size / 2,
          width: size,
          height: size,
          borderRadius: "50%",
          background: C.white,
          boxShadow: shadow(0.8),
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          transform: `scale(${pop})`,
        }}
      >
        <Icon size={size * 0.44} color={color} strokeWidth={2} />
      </div>
      {label && (
        <div
          style={{
            position: "absolute",
            left: -150,
            width: 300,
            top: size / 2 + 14,
            textAlign: "center",
            fontFamily: FONT,
            fontSize: 26,
            fontWeight: 600,
            color: C.sub,
            opacity: prog(t, at + 0.25, at + 0.5, ease.out),
          }}
        >
          {label}
        </div>
      )}
      {check && done > 0 && (
        <div
          style={{
            position: "absolute",
            left: size * 0.36 - 17,
            top: -size * 0.36 - 17,
            width: 34,
            height: 34,
            borderRadius: 17,
            background: C.accent,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            transform: `scale(${done})`,
            border: "3px solid white",
          }}
        >
          <CheckIcon size={20} color="white" strokeWidth={3.5} />
        </div>
      )}
    </div>
  );
};

/**
 * White field with a gradient hairline border, like the prompt box in the Google
 * films. Sized in world pixels, positioned by its centre.
 */
export const GradientField: React.FC<{
  x: number;
  y: number;
  w: number;
  h: number;
  r?: number;
  border?: number;
  opacity?: number;
  scale?: number;
  style?: React.CSSProperties;
  children?: React.ReactNode;
}> = ({ x, y, w, h, r = h / 2, border = 3, opacity = 1, scale = 1, style, children }) => (
  <div
    style={{
      position: "absolute",
      left: x - w / 2,
      top: y - h / 2,
      width: w,
      height: h,
      borderRadius: r,
      padding: border,
      background: GRADIENT,
      boxShadow: shadow(0.9),
      opacity,
      transform: `scale(${scale})`,
      boxSizing: "border-box",
      ...style,
    }}
  >
    <div
      style={{
        position: "relative",
        width: "100%",
        height: "100%",
        borderRadius: r - border,
        background: C.white,
        overflow: "hidden",
        fontFamily: FONT,
        color: C.ink,
      }}
    >
      {children}
    </div>
  </div>
);

/** Soft white bubbles drifting in the back, out of focus, so the stage breathes. */
export const Floaters: React.FC<{ t: number }> = ({ t }) => (
  <>
    {[
      { x: 180, y: 180, s: 90, sp: 0.21 },
      { x: 1700, y: 230, s: 60, sp: 0.17 },
      { x: 1540, y: 880, s: 110, sp: 0.13 },
      { x: 330, y: 860, s: 70, sp: 0.19 },
      { x: 980, y: 110, s: 44, sp: 0.23 },
    ].map((b, i) => (
      <div
        key={i}
        style={{
          position: "absolute",
          left: b.x + Math.sin(t * b.sp * 2 + i) * 30,
          top: b.y + Math.cos(t * b.sp * 1.6 + i * 2) * 24,
          width: b.s,
          height: b.s * 0.62,
          borderRadius: b.s,
          background: "rgba(255,255,255,0.3)",
          filter: "blur(16px)",
        }}
      />
    ))}
  </>
);
