import React from "react";
import { AbsoluteFill, Audio, staticFile } from "remotion";
import { Cards, FINALE, HOOK } from "./Cards";
import { Chat } from "./Chat";
import { End } from "./End";
import { Hud } from "./kit";
import { K, bgAt, useT } from "./look";
import { Problem } from "./Problem";
import { Reveal } from "./Reveal";
import { Crawl, UrlInput } from "./Solution";

/** Faint film grain on the flat colour frames. */
const Grain: React.FC = () => {
  const t = useT();
  const seed = Math.floor(t * 30) % 8;
  return (
    <AbsoluteFill style={{ opacity: 0.05, mixBlendMode: "multiply", pointerEvents: "none" }}>
      <svg width="100%" height="100%">
        <filter id={`grain-${seed}`}>
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves={2} seed={seed} />
          <feColorMatrix type="saturate" values="0" />
        </filter>
        <rect width="100%" height="100%" filter={`url(#grain-${seed})`} />
      </svg>
    </AbsoluteFill>
  );
};

export const Ad: React.FC = () => {
  const t = useT();
  return (
    <AbsoluteFill style={{ background: bgAt(t), overflow: "hidden" }}>
      <Cards cards={HOOK} until={K.problem.start} />
      <Problem />
      <Reveal />
      <UrlInput />
      <Crawl />
      <Chat />
      <Cards cards={FINALE} until={K.finale.swirl} zoomAt={K.finale.zoom} />
      <End />
      <Grain />
      <Hud />
      <Audio src={staticFile("ad-music.wav")} />
      <Audio src={staticFile("ad-sfx.wav")} />
    </AbsoluteFill>
  );
};
