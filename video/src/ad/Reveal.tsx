import React from "react";
import { AbsoluteFill } from "remotion";
import { Iris, letterBoxes } from "./kit";
import { CX, CY, K, P, clamp01, ez, lerp, prog, serif, useT, wide } from "./look";

const R = K.reveal;
const SIZE = 290;
const NAME = letterBoxes("CRACHA", SIZE, 0.95);
export const DOT = 30;

/** Out of the dot: a double iris, the name slams in, then collapses letter by letter into dots that merge. */
export const Reveal: React.FC = () => {
  const t = useT();
  if (t < R.iris || t >= K.url.pill + 0.05) return null;
  const sub = clamp01((t - R.sub) / 0.35);
  const subOut = prog(t, R.collapse - 0.05, R.collapse + 0.2, ez.in);
  const wipe = prog(t, R.wipe, R.wipe + 0.32, ez.inOut);
  return (
    <AbsoluteFill>
      <Iris at={R.iris} color={P.paper} dur={0.2}>
        <Iris at={R.iris + 0.06} color={P.accent} dur={0.24} fringe={false}>
          {NAME.map((l, i) => {
            const rise = prog(t, R.iris + 0.06 + i * 0.03, R.iris + 0.4 + i * 0.03, ez.expo);
            const shrink = prog(t, R.collapse + i * 0.025, R.collapse + 0.12 + i * 0.025, ez.in);
            const travel = prog(t, R.collapse + 0.12, R.wipe + 0.1, ez.whip);
            const dotX = lerp(l.x, CX, travel);
            const dotOn = t >= R.collapse + i * 0.025 + 0.08;
            return (
              <React.Fragment key={i}>
                {!dotOn || shrink < 1 ? (
                  <div
                    style={{
                      position: "absolute",
                      left: l.x - l.w / 2,
                      top: CY - 90 - SIZE * 0.5,
                      width: l.w,
                      height: SIZE * 0.9,
                      overflow: "hidden",
                      textAlign: "center",
                      fontSize: SIZE,
                      lineHeight: `${SIZE * 0.9}px`,
                      color: P.ink,
                      ...wide(125, 900),
                    }}
                  >
                    <span style={{ display: "inline-block", transform: `translateY(${(1 - rise) * 105}%) scale(${1 - shrink})` }}>{l.c}</span>
                  </div>
                ) : null}
                {dotOn ? (
                  <div
                    style={{
                      position: "absolute",
                      left: dotX - DOT / 2,
                      top: CY - 90 - DOT / 2 + prog(t, R.wipe, R.wipe + 0.2, ez.inOut) * 90,
                      width: DOT,
                      height: DOT,
                      borderRadius: DOT,
                      background: P.ink,
                      transform: `scaleX(${1 + (travel > 0 && travel < 1 ? 1.5 : 0)})`,
                    }}
                  />
                ) : null}
              </React.Fragment>
            );
          })}
          <div
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              top: CY + 90,
              textAlign: "center",
              fontFamily: serif,
              fontStyle: "italic",
              fontSize: 104,
              color: P.ink,
              opacity: sub * (1 - subOut),
              filter: `blur(${(1 - sub) * 12 + subOut * 12}px)`,
              transform: `translateY(${(1 - sub) * 30 - subOut * 40}px)`,
            }}
          >
            frag deine Website.
          </div>
        </Iris>
      </Iris>
      {wipe > 0 ? (
        <AbsoluteFill
          style={{
            background: P.paper,
            WebkitMaskImage: `linear-gradient(to top left, #000 ${wipe * 130 - 15}%, transparent ${wipe * 130}%)`,
            maskImage: `linear-gradient(to top left, #000 ${wipe * 130 - 15}%, transparent ${wipe * 130}%)`,
          }}
        />
      ) : null}
      {t >= R.wipe ? (
        <div style={{ position: "absolute", left: CX - DOT / 2, top: CY - DOT / 2 + (1 - prog(t, R.wipe, R.wipe + 0.2, ez.inOut)) * -90, width: DOT, height: DOT, borderRadius: DOT, background: P.ink }} />
      ) : null}
    </AbsoluteFill>
  );
};
