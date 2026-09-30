// Builds the ad's soundtrack from src/ad/cues.json:
//  public/ad-music.wav  the Lyria take re-cut on bar lines (beat 1 on frame 0), ducked under the voice
//  public/ad-voice.wav  the voice-over take, phrase by phrase at its cue
//  public/ad-sfx.wav    synthesised UI foley and transition hits
// Usage: node scripts/make-ad-audio.mjs
import { readFileSync } from "node:fs";
import { SR, duck, foley, voiceAndMusic, writeWav } from "./audio-kit.mjs";

const K = JSON.parse(readFileSync(new URL("../src/ad/cues.json", import.meta.url)));
const N = Math.round(SR * K.duration);
const { voice, music } = voiceAndMusic(K, N);
duck(music, K.vo.clips, K.music.fadeOut, N);
const { whoosh, click, pop, thud, chime, boom, typeOver, write } = foley(N);

// Hook: a soft pop per stacked word, a swish as the stack whips away.
K.hook.words.forEach((w, i) => pop(w, 520 + i * 90, 0.22, i % 2 ? 0.25 : -0.25));
whoosh(K.hook.out + 0.15, 0.35, 600, 5000, 0.3, 0.6);
// Problem: click, then a whip to the next page; the overview; the implosion.
const P = K.problem;
P.switches.forEach((s, i) => {
  click(s - 0.12, 0.45);
  whoosh(s + 0.02, 0.26, 900, 4200, 0.28, 0.5, i % 2 ? 0.45 : -0.45);
});
whoosh(P.overview + 0.4, 0.8, 300, 1500, 0.18, 0.5);
whoosh(P.implode + 0.4, 0.6, 4500, 150, 0.4, 0.85);
pop(P.dot, 520, 0.22);
// Reveal.
const RV = K.reveal;
thud(RV.logo, 0.45);
whoosh(RV.logo + 0.05, 0.5, 300, 6000, 0.2, 0.2);
chime(RV.logo + 0.1, [784, 1175], 0.06);
whoosh(RV.collapse + 0.18, 0.3, 3000, 400, 0.22, 0.8);
// URL.
const U = K.url;
pop(U.pill + 0.1, 640, 0.2);
typeOver("example.com", U.typeStart, U.typeEnd, 0.14);
click(U.click, 0.55);
// Crawl: a tick per page, rising ring by ring.
const C = K.crawl;
whoosh(C.root + 0.1, 0.35, 400, 2500, 0.2);
const COUNTS = [8, 14, 20, 26];
C.rings.forEach((start, k) => {
  const n = COUNTS[k];
  for (let j = 0; j < n; j += k < 2 ? 1 : 2) pop(start + (j / n) * 0.4 + 0.05, 900 + k * 160 + (j % 4) * 50, 0.07 - k * 0.01, (j / n) * 1.6 - 0.8);
});
whoosh(C.stack + 0.4, 0.7, 3500, 180, 0.3, 0.8);
thud(C.stack + 0.5, 0.3);
pop(C.ready, 700, 0.26);
chime(C.ready + 0.05, [784, 1175, 1568], 0.07);
// Chat.
const CH = K.chat;
whoosh(CH.input + 0.25, 0.4, 500, 2500, 0.18);
typeOver("Wo ändere ich meine Rechnungsadresse?", CH.typeStart, CH.typeEnd, 0.12);
click(CH.send, 0.5);
whoosh(CH.send + 0.3, 0.4, 800, 4000, 0.18);
for (let i = 0; i < 9; i++) pop(CH.send + 0.35 + ((i + 0.5) / 9) * (CH.answer - CH.send - 0.5), 1200 + i * 60, 0.05, i / 4.5 - 1);
pop(CH.answer, 620, 0.2);
whoosh(CH.mark + 0.3, 0.4, 2500, 7000, 0.08, 0.5);
pop(CH.source, 880, 0.24);
// Verify.
const V = K.verify;
click(V.click, 0.55);
whoosh(V.click + 0.35, 0.6, 200, 3500, 0.35, 0.7);
whoosh(V.mark + 0.3, 0.5, 2500, 7000, 0.12, 0.5);
chime(V.mark + 0.4, [1568, 2093], 0.05);
whoosh(V.implode + 0.5, 0.7, 4000, 150, 0.35, 0.85);
pop(V.dot, 520, 0.2);
// Finale and end.
K.finale.words.forEach((w, i) => pop(w, 560 + i * 120, 0.22));
whoosh(K.finale.collapse + 0.2, 0.35, 3000, 300, 0.3, 0.8);
const E = K.end;
boom(E.hit, 0.5);
chime(E.hit + 0.15, [1047, 1319, 1568, 2093], 0.05, 0.05);
pop(E.cta, 560, 0.25);

writeWav("ad-music.wav", music);
writeWav("ad-voice.wav", voice, 1.1);
write("ad-sfx.wav");
console.log(`public/ad-music.wav, ad-voice.wav, ad-sfx.wav: ${K.duration} s`);
