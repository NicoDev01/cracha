// Builds the spot's soundtrack from src/spot/cues.json:
//  public/spot/music.wav  the Lyria take re-cut on beat lines (intro, stop, breakdown, build, drop, ending), ducked under the voice
//  public/spot/voice.wav  the voice-over take, phrase by phrase at its cue
//  public/spot/sfx.wav    synthesised UI foley and transition hits at the same cues as the picture
// Usage: node scripts/make-spot-audio.mjs
import { readFileSync } from "node:fs";
import { SR, duck, foley, voiceAndMusic, writeWav } from "./audio-kit.mjs";

const K = JSON.parse(readFileSync(new URL("../src/spot/cues.json", import.meta.url)));
const N = Math.round(SR * K.duration);
const { voice, music } = voiceAndMusic(K, N);
duck(music, K.vo.clips, K.music.fadeOut, N);
const { whoosh, click, pop, thud, chime, boom, typeOver, write } = foley(N);

// Hook: a soft pop per stacked word, a swish as the stack whips away.
K.hook.words.forEach((w, i) => pop(w, 520 + i * 90, 0.22, i % 2 ? 0.25 : -0.25));
whoosh(K.hook.out + 0.12, 0.3, 600, 5000, 0.3, 0.6);
// Problem: a click on every "klickst", a whip to the new page; zoom-out, implosion, dot.
const P = K.problem;
P.clicks.forEach((c, i) => {
  click(c, 0.5);
  whoosh(c + 0.08, 0.24, 900, 4200, 0.26, 0.5, i % 2 ? 0.45 : -0.45);
});
whoosh(P.overview + 0.25, 0.5, 300, 1500, 0.2, 0.5);
whoosh(P.implode + 0.25, 0.4, 4500, 150, 0.4, 0.85);
pop(P.dot, 520, 0.22);
// Reveal: the dot becomes the logo on the hit.
const RV = K.reveal;
thud(RV.logo, 0.5);
whoosh(RV.logo + 0.05, 0.45, 300, 6000, 0.2, 0.2);
chime(RV.logo + 0.1, [784, 1175], 0.06);
whoosh(RV.collapse + 0.15, 0.28, 3000, 400, 0.22, 0.8);
// URL.
const U = K.url;
pop(U.pill + 0.1, 640, 0.2);
typeOver("example.com", U.typeStart, U.typeEnd, 0.14);
click(U.click, 0.55);
// Crawl: a tick per page, rising ring by ring; the pages pour into the knowledge base.
const C = K.crawl;
whoosh(C.root + 0.1, 0.3, 400, 2500, 0.2);
[8, 14, 20, 26].forEach((n, k) => {
  for (let j = 0; j < n; j += k < 2 ? 1 : 2) pop(C.rings[k] + (j / n) * 0.3 + 0.05, 900 + k * 160 + (j % 4) * 50, 0.07 - k * 0.01, (j / n) * 1.6 - 0.8);
});
whoosh(C.flow + 0.45, 0.8, 3500, 180, 0.3, 0.8);
thud(C.full, 0.3);
pop(C.full, 700, 0.26);
chime(C.full + 0.05, [784, 1175, 1568], 0.07);
// Chat: the base collapses into the input, the question types, send on the drop.
const CH = K.chat;
whoosh(CH.input + 0.25, 0.4, 2500, 500, 0.2);
typeOver("Wie ändere ich meine Adresse?", CH.typeStart, CH.typeEnd, 0.11);
click(CH.send, 0.55);
whoosh(CH.send + 0.25, 0.35, 800, 4000, 0.2);
pop(CH.answer, 620, 0.22);
whoosh(CH.mark + 0.3, 0.4, 2500, 7000, 0.08, 0.5);
pop(CH.source, 880, 0.26);
// Verify: click the source, the page opens, the passage lights up, the page implodes.
const V = K.verify;
click(V.click, 0.55);
whoosh(V.click + 0.3, 0.5, 200, 3500, 0.35, 0.7);
whoosh(V.mark + 0.3, 0.5, 2500, 7000, 0.12, 0.5);
chime(V.mark + 0.4, [1568, 2093], 0.05);
whoosh(V.implode + 0.25, 0.4, 4000, 150, 0.35, 0.85);
pop(V.dot, 520, 0.2);
// End.
const E = K.end;
boom(E.hit, 0.5);
chime(E.hit + 0.15, [1047, 1319, 1568, 2093], 0.05, 0.05);
pop(E.claim + 0.18, 620, 0.18);
pop(E.cta, 560, 0.26);

writeWav("spot/music.wav", music);
writeWav("spot/voice.wav", voice, 1.1);
write("spot/sfx.wav");
console.log(`public/spot/music.wav, voice.wav, sfx.wav: ${K.duration} s`);
