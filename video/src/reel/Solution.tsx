import { ArrowRight, Link2 } from "lucide-react";
import React from "react";
import { Box, Check, Cursor, Ring } from "./kit";
import { FRAME, LogoMorph } from "./LogoMorph";
import { C, T, shadow as shadowOf, TEXT, clamp01, ease, lerp, prog, springAt } from "./theme";

export const PILL = { x: 0, y: 0, w: 1100, h: 132, r: 66 };
export const LOGO_W = 880;
const BTN = { x: PILL.w / 2 - 66, y: 0 }; // button centre, world

/**
 * Dot → logo (on the drop) → input pill → the link typed in and sent.
 * Ends where the crawl scene takes the pill over and grows it into the start page.
 */
export const Solution: React.FC<{ t: number }> = ({ t }) => {
  if (t < T.stop - 0.05 || t >= T.inputToPage) return null;

  const toLogo = (tt: number) => prog(tt, T.drop, T.drop + 0.45, ease.inOut);
  const toPill = (tt: number) => prog(tt, T.logoToInput, T.logoToInput + 0.45, ease.inOut);
  const pillDone = t >= T.logoToInput + 0.45;
  // The dot lands with a squash on the stop beat, the logo with a spring on the drop.
  const land = t < T.drop ? 1 - 0.25 * Math.sin(clamp01((t - T.stop) / 0.2) * Math.PI) : 1;
  const bounce = t >= T.drop ? lerp(0.92, 1, springAt(t, T.drop + 0.3, 10, 0.5)) : 1;

  return (
    <>
      <Ring t={t} at={T.drop + 0.1} x={0} y={0} size={1300} />
      {!pillDone && (
        <div style={{ position: "absolute", left: 0, top: 0, transform: `scale(${bounce}, ${bounce * land})` }}>
          {t < T.logoToInput ? (
            <LogoMorph
              x={0}
              y={0}
              width={LOGO_W}
              from={{ kind: "dot", r: 14 }}
              to={{ kind: "logo" }}
              p={toLogo(t)}
              pAt={(k) => toLogo(t - k * FRAME)}
            />
          ) : (
            <LogoMorph
              x={0}
              y={0}
              width={LOGO_W}
              from={{ kind: "logo" }}
              to={{ kind: "pill", w: PILL.w, h: PILL.h }}
              p={toPill(t)}
              pAt={(k) => toPill(t - k * FRAME)}
              toColor={C.white}
            />
          )}
        </div>
      )}
      {pillDone && <Input t={t} />}
    </>
  );
};

/** The pill as an input field: link icon, the address typed in, a send button that turns into a check. */
export const Input: React.FC<{ t: number; content?: number; rect?: typeof PILL }> = ({ t, content = 1, rect = PILL }) => {
  const sh = prog(t, T.logoToInput + 0.35, T.logoToInput + 0.7, ease.out);
  const chars = Math.floor(clamp01((t - T.type[0]) / (T.type[1] - T.type[0])) * TEXT.domain.length);
  const sent = t >= T.submit;
  const btn = sent ? lerp(0.8, 1, prog(t, T.submit, T.submit + 0.3, ease.back)) : prog(t, T.logoToInput + 0.4, T.logoToInput + 0.75, ease.back);
  return (
    <>
      <Box
        x={rect.x}
        y={rect.y}
        w={rect.w}
        h={rect.h}
        r={rect.r}
        shadow={shadowOf(sh)}
      >
        <div
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            width: PILL.w,
            height: PILL.h,
            display: "flex",
            alignItems: "center",
            padding: "0 44px",
            gap: 22,
            fontSize: 48,
            fontWeight: 600,
            opacity: content * prog(t, T.logoToInput + 0.35, T.logoToInput + 0.6, ease.out),
            letterSpacing: "-0.01em",
          }}
        >
          <Link2 size={46} color={C.sub} strokeWidth={2.4} />
          {chars === 0 ? <span style={{ color: "#b3aca5" }}>Website-Link einfügen</span> : TEXT.domain.slice(0, chars)}
          {!sent && <div style={{ width: 4, height: 52, background: C.accent, opacity: Math.floor(t * 3) % 2 ? 1 : 0.15 }} />}
        </div>
        <div
          style={{
            position: "absolute",
            left: PILL.w - 66 - 48,
            top: PILL.h / 2 - 48,
            width: 96,
            height: 96,
            borderRadius: 48,
            background: C.accent,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            transform: `scale(${btn})`,
            opacity: content,
          }}
        >
          {!sent && <ArrowRight size={50} color="white" strokeWidth={2.8} />}
        </div>
      </Box>
      {sent && content > 0 && <Check t={t} at={T.submit} x={rect.x + BTN.x} y={rect.y} size={96} />}
      <Ring t={t} at={T.submit} x={BTN.x} y={0} size={320} />
      <Cursor
        t={t}
        show={[T.type[0] + 0.2, T.submit + 0.3]}
        clicks={[T.submit]}
        path={[
          { t: T.type[0] + 0.2, x: 380, y: 300 },
          { t: T.submit - 0.08, x: BTN.x + 6, y: 10 },
          { t: T.submit + 0.3, x: BTN.x + 30, y: 60 },
        ]}
      />
    </>
  );
};
