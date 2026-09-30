import React from "react";
import { AbsoluteFill, Audio, staticFile } from "remotion";
import { Chat } from "./Chat";
import { End, Finale } from "./End";
import { P } from "./look";
import { Hook, Problem } from "./Problem";
import { Crawl, Reveal, UrlInput } from "./Solution";

export const Ad: React.FC = () => (
  <AbsoluteFill style={{ background: P.paper, overflow: "hidden" }}>
    <Hook />
    <Problem />
    <Reveal />
    <UrlInput />
    <Crawl />
    <Chat />
    <Finale />
    <End />
    <Audio src={staticFile("ad-music.wav")} />
    <Audio src={staticFile("ad-voice.wav")} />
    <Audio src={staticFile("ad-sfx.wav")} />
  </AbsoluteFill>
);
