import { CameraMotionBlur } from "@remotion/motion-blur";
import React from "react";
import { AbsoluteFill, Audio, staticFile } from "remotion";
import { Background } from "../Background";
import { useT } from "../ad/look";
import { Crawl, Reveal, UrlInput } from "./Build";
import { Chat } from "./Chat";
import K from "./cues.json";
import { End } from "./End";
import { Hook, Problem } from "./Problem";

/** Real camera motion blur (several sub-frames per frame), only while things move fast. */
const Blur: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const t = useT();
  const fast = K.blur.some(([a, b]) => t >= a && t <= b);
  return fast ? (
    <CameraMotionBlur shutterAngle={200} samples={8}>
      {children}
    </CameraMotionBlur>
  ) : (
    <AbsoluteFill>{children}</AbsoluteFill>
  );
};

/** The 18-second spot: problem → CraCha → link in → crawl → ask → answer with source → CTA. */
export const Spot: React.FC = () => (
  <AbsoluteFill style={{ overflow: "hidden" }}>
    <Background />
    <Blur>
      <Hook />
      <Problem />
      <Reveal />
      <UrlInput />
      <Crawl />
      <Chat />
      <End />
    </Blur>
    <Audio src={staticFile("spot/music.wav")} />
    <Audio src={staticFile("spot/voice.wav")} />
    <Audio src={staticFile("spot/sfx.wav")} />
  </AbsoluteFill>
);
