import { AbsoluteFill } from "remotion";
import { CX, CY, heading, prog } from "../theme";
import { DARK, K, Kinetic, LIGHT_ACCENT, MotionBlur, clamp01, ez, rnd, sp, useT, zoom } from "./kit";

// One page, then the camera pulls back: the website is hundreds of pages, and
// somewhere in there the answer lights up for a moment, then hides again.

const COLS = 15;
const ROWS = 11;
const PW = 300;
const PH = 196;
const GX = 340;
const GY = 236;
const MID = { c: 7, r: 5 };
const ANSWER = { c: 11, r: 2 };

const TILES = Array.from({ length: COLS * ROWS }, (_, i) => {
  const c = i % COLS;
  const r = Math.floor(i / COLS);
  return { i, c, r, x: (c - MID.c) * GX, y: (r - MID.r) * GY, d: Math.hypot(c - MID.c, r - MID.r) };
});

/** Camera scale and focus (world point at the frame centre). */
const camera = (t: number) => {
  const pull = ez.cam(prog(t, 0.15, 3.6, (x) => x));
  const dive = prog(t, K.hook.dive, K.hook.dive + 0.6, ez.in);
  const s = zoom(zoom(2.3, 0.36, pull), 7, dive);
  return { s, fx: 0, fy: 0, dive };
};

const DarkPage: React.FC<{ seed: number; lit?: number; decoy?: number }> = ({ seed, lit = 0, decoy = 0 }) => {
  const w = (k: number, min: number, max: number) => `${min + rnd(seed, k) * (max - min)}%`;
  const hero = rnd(seed, 9) > 0.45;
  const glow = Math.max(lit, decoy);
  return (
    <>
      <div style={{ position: "absolute", left: 0, right: 0, top: 0, height: 26, borderBottom: `1px solid ${DARK.line}`, display: "flex", gap: 5, alignItems: "center", paddingLeft: 10 }}>
        {[0, 1, 2].map((k) => (
          <div key={k} style={{ width: 7, height: 7, borderRadius: 4, background: "rgba(255,240,230,0.14)" }} />
        ))}
      </div>
      <div style={{ position: "absolute", left: 16, top: 42, width: w(1, 35, 60), height: 14, borderRadius: 7, background: "rgba(255,240,230,0.16)" }} />
      {[0, 1, 2, 3].map((k) => (
        <div
          key={k}
          style={{
            position: "absolute",
            left: 16,
            top: 70 + k * 18,
            width: hero ? w(k + 2, 25, 45) : w(k + 2, 55, 88),
            height: 8,
            borderRadius: 4,
            background: k === 2 && glow > 0 ? `rgba(251,146,60,${0.25 + glow * 0.75})` : DARK.skel,
            boxShadow: k === 2 && glow > 0 ? `0 0 ${18 * glow}px ${6 * glow}px rgba(251,146,60,${0.5 * glow})` : undefined,
          }}
        />
      ))}
      {hero ? (
        <div style={{ position: "absolute", right: 16, top: 42, width: "40%", height: 104, borderRadius: 10, background: "linear-gradient(135deg, rgba(251,146,60,0.12), rgba(239,68,68,0.08))" }} />
      ) : null}
      <div style={{ position: "absolute", left: 16, bottom: 16, width: 70, height: 20, borderRadius: 10, background: "rgba(255,240,230,0.08)" }} />
    </>
  );
};

export const Hook: React.FC = () => {
  const t = useT();
  if (t > K.hook.dive + 0.75) return null;
  const cam = camera(t);
  const lit = sp(t, K.hook.answer, 12, 120) * (1 - prog(t, K.hook.where + 0.05, K.hook.where + 0.35, ez.out));
  const pulse = prog(t, K.hook.answer, K.hook.answer + 1.1, ez.out);
  const ax = CX + (ANSWER.c - MID.c) * GX * cam.s;
  const ay = CY + (ANSWER.r - MID.r) * GY * cam.s;
  const blur = cam.dive * 18;

  return (
    <AbsoluteFill style={{ opacity: 1 - prog(t, K.hook.dive + 0.35, K.hook.dive + 0.7, ez.out) }}>
      <MotionBlur id="hook-dive" x={blur} y={blur}>
        <div
          style={{
            position: "absolute",
            left: CX,
            top: CY,
            transform: `scale(${cam.s}) translate(${-cam.fx}px, ${-cam.fy}px)`,
            transformOrigin: "0 0",
          }}
        >
          {TILES.map((tile) => {
            const appear = sp(t, 0.05 + tile.d * 0.2, 16, 150);
            if (appear <= 0.001) return null;
            const isAnswer = tile.c === ANSWER.c && tile.r === ANSWER.r;
            // After "Aber wo?" a few other pages flash as well: the answer hides among them.
            const decoyAt = K.hook.where + 0.1 + rnd(tile.i, 4) * 0.5;
            const decoy = !isAnswer && rnd(tile.i, 7) > 0.86 ? clamp01(1 - Math.abs(t - decoyAt) / 0.22) : 0;
            return (
              <div
                key={tile.i}
                style={{
                  position: "absolute",
                  left: tile.x - PW / 2,
                  top: tile.y - PH / 2,
                  width: PW,
                  height: PH,
                  borderRadius: 16,
                  background: tile.c === MID.c && tile.r === MID.r ? DARK.card2 : DARK.card,
                  outline: `1.5px solid ${isAnswer && lit > 0.02 ? `rgba(251,146,60,${lit})` : DARK.line}`,
                  overflow: "hidden",
                  opacity: Math.min(1, appear * 1.3),
                  transform: `scale(${0.7 + 0.3 * appear})`,
                }}
              >
                <DarkPage seed={tile.i} lit={isAnswer ? lit : 0} decoy={decoy} />
              </div>
            );
          })}
        </div>
      </MotionBlur>

      {/* The answer calls out once, a ring in screen space. */}
      {pulse > 0 && pulse < 1 ? (
        <>
          {[0, 0.25].map((d) => {
            const q = clamp01((pulse - d) / (1 - d));
            return (
              <div
                key={d}
                style={{
                  position: "absolute",
                  left: ax - 60,
                  top: ay - 60,
                  width: 120,
                  height: 120,
                  borderRadius: 60,
                  border: `2px solid rgba(251,146,60,${(1 - q) * 0.9})`,
                  transform: `scale(${0.3 + q * 1.6})`,
                }}
              />
            );
          })}
        </>
      ) : null}

      {/* Readability for the line at the bottom. */}
      <AbsoluteFill style={{ background: "linear-gradient(180deg, rgba(17,13,11,0) 60%, rgba(17,13,11,0.9) 88%)" }} />
      <div style={{ position: "absolute", left: 80, right: 80, top: 888 }}>
        <Kinetic
          text="Irgendwo auf dieser Website steht die *Antwort.*"
          start={0.5}
          end={K.hook.where - 0.05}
          times={[0.5, 0.82, 1.05, 1.3, 1.75, 2.02, 2.3]}
          size={58}
          color={DARK.text}
          accent={LIGHT_ACCENT}
        />
      </div>

      {/* "Aber wo?" slams in, then the camera dives through it. */}
      <div style={{ position: "absolute", left: 0, right: 0, top: CY - 110, display: "flex", justifyContent: "center" }}>
        <WhereText t={t} />
      </div>
    </AbsoluteFill>
  );
};

const WhereText: React.FC<{ t: number }> = ({ t }) => {
  const p = sp(t, K.hook.where, 11, 220, 0.7);
  if (p <= 0) return null;
  const out = prog(t, K.hook.dive, K.hook.dive + 0.4, ez.in);
  return (
    <div
      style={{
        fontFamily: heading,
        fontWeight: 800,
        fontSize: 190,
        letterSpacing: "-0.04em",
        color: DARK.text,
        textShadow: "0 20px 60px rgba(0,0,0,0.6)",
        opacity: Math.min(1, p * 2) * (1 - out),
        transform: `scale(${(1.8 - 0.8 * p) * (1 + out * 2.5)})`,
        filter: `blur(${(1 - Math.min(1, p)) * 16 + out * 20}px)`,
      }}
    >
      Aber <span style={{ backgroundImage: LIGHT_ACCENT, WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent" }}>wo?</span>
    </div>
  );
};

