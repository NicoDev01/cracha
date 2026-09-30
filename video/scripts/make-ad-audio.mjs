// Builds the ad's soundtrack from src/ad/cues.json:
//  public/ad-music.wav  the Lyria take, cut so beat 1 lands on frame 0 and spliced into its own ending
//  public/ad-sfx.wav    synthesised UI foley and transition hits on the picture's cues
// Usage: node scripts/make-ad-audio.mjs
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";

const K = JSON.parse(readFileSync(new URL("../src/ad/cues.json", import.meta.url)));
const pub = (f) => new URL(`../public/${f}`, import.meta.url).pathname.replace(/^\/([A-Z]:)/, "$1");

// --- Music: [offset, offset+at] then [to, ...], 30 ms crossfade, fade out at the end.
const M = K.music;
const xf = 0.03;
const tail = K.duration - M.splice.at + 0.2;
execFileSync("ffmpeg", [
  "-v", "error", "-y", "-i", pub(M.file),
  "-filter_complex",
  `[0:a]atrim=${M.offset}:${M.offset + M.splice.at + xf},asetpts=N/SR/TB[a];` +
    `[0:a]atrim=${M.splice.to}:${M.splice.to + tail},asetpts=N/SR/TB[b];` +
    `[a][b]acrossfade=d=${xf}:c1=tri:c2=tri,atrim=0:${K.duration},` +
    `afade=t=out:st=${M.fadeOut}:d=${K.duration - M.fadeOut},volume=0.85[out]`,
  "-map", "[out]", "-ar", "48000", "-ac", "2", pub("ad-music.wav"),
]);

// --- SFX
const SR = 48000;
const N = Math.round(SR * K.duration);
const L = new Float32Array(N);
const R = new Float32Array(N);
let seed = 7;
const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647) * 2 - 1;

function put(t, dur, fn, gain = 1, pan = 0) {
  const s = Math.round(t * SR);
  const n = Math.round(dur * SR);
  const gl = gain * Math.cos(((pan + 1) * Math.PI) / 4);
  const gr = gain * Math.sin(((pan + 1) * Math.PI) / 4);
  for (let k = 0; k < n; k++) {
    const i = s + k;
    if (i < 0 || i >= N) continue;
    const v = fn(k / SR, k);
    L[i] += v * gl;
    R[i] += v * gr;
  }
}
/** Bandpassed noise sweeping from f0 to f1; `t` is where it peaks. */
function whoosh(t, dur, f0, f1, gain, peak = 0.7, pan = 0) {
  let low = 0;
  let band = 0;
  put(t - dur * peak, dur, (x) => {
    const p = x / dur;
    const f = f0 * Math.pow(f1 / f0, p);
    const q = 2 * Math.sin((Math.PI * Math.min(f, 9000)) / SR);
    const high = rand() - low - 0.6 * band;
    band += q * high;
    low += q * band;
    const env = p < peak ? Math.pow(p / peak, 2) : Math.pow(1 - (p - peak) / (1 - peak), 1.6);
    return band * env;
  }, gain, pan);
}
function click(t, gain = 0.5) {
  put(t, 0.05, (x) => (Math.sin(2 * Math.PI * 2300 * x) * 0.6 + rand() * 0.4) * Math.exp(-x * 130), gain);
  put(t, 0.08, (x) => Math.sin(2 * Math.PI * 480 * x) * Math.exp(-x * 60), gain * 0.6);
}
function key(t, gain = 0.14) {
  const f = 1800 + rand() * 500;
  put(t, 0.03, (x) => (rand() * 0.7 + Math.sin(2 * Math.PI * f * x) * 0.3) * Math.exp(-x * 240), gain * (0.8 + rand() * 0.3), rand() * 0.25);
  put(t, 0.05, (x) => Math.sin(2 * Math.PI * 220 * x) * Math.exp(-x * 90), gain * 0.5);
}
function pop(t, f = 700, gain = 0.3, pan = 0) {
  put(t, 0.14, (x) => Math.sin(2 * Math.PI * f * x * (1 + 1.2 * Math.exp(-x * 40))) * Math.exp(-x * 30), gain, pan);
}
function thud(t, gain = 0.6) {
  put(t, 0.3, (x) => Math.sin(2 * Math.PI * (60 + 90 * Math.exp(-x * 30)) * x) * Math.exp(-x * 12), gain);
  put(t, 0.02, () => rand(), gain * 0.25);
}
function chime(t, notes, gain = 0.1, gap = 0.07) {
  notes.forEach((f, i) => put(t + i * gap, 0.9, (x) => (Math.sin(2 * Math.PI * f * x) + 0.3 * Math.sin(4 * Math.PI * f * x)) * Math.exp(-x * 5), gain));
}
function boom(t, gain = 0.9) {
  put(t, 1.8, (x) => Math.sin(2 * Math.PI * (36 + 70 * Math.exp(-x * 9)) * x) * Math.exp(-x * 2.2), gain);
  put(t, 0.3, (x) => rand() * Math.exp(-x * 16), gain * 0.3);
}
const typeOver = (text, a, b, gain) => {
  for (let c = 0; c < text.length; c++) key(a + ((c + 0.3) / text.length) * (b - a) + rand() * 0.01, gain);
};

// Hook: a snap in front of every slammed word.
K.hook.words.forEach((w, i) => {
  whoosh(w, 0.18, 800, 6000, 0.22, 0.85, i % 2 ? 0.3 : -0.3);
  thud(w, 0.35);
});
// Problem: click, then a whip to the next page.
const P = K.problem;
P.clicks.forEach((c, i) => {
  click(c, 0.5);
  whoosh(c + 0.12, 0.26, 900, 4200, 0.3, 0.5, i % 2 ? 0.4 : -0.4);
});
whoosh(P.implode + 0.45, 0.7, 4500, 120, 0.5, 0.85);
pop(P.dot, 520, 0.25);
// Reveal: boom out of the dot, letters pop into dots, wipe.
const RV = K.reveal;
boom(RV.iris, 0.7);
whoosh(RV.iris + 0.05, 0.5, 300, 7000, 0.3, 0.2);
pop(RV.sub, 880, 0.14);
for (let i = 0; i < 6; i++) pop(RV.collapse + i * 0.025 + 0.08, 900 + i * 120, 0.12, i / 3 - 0.8);
whoosh(RV.wipe + 0.15, 0.4, 500, 3500, 0.28, 0.6);
// URL.
const U = K.url;
pop(U.pill + 0.1, 640, 0.2);
typeOver("example.com", U.typeStart, U.typeEnd, 0.16);
click(U.click, 0.6);
// Crawl: a tick per page, rising ring by ring; chime when all are read.
const C = K.crawl;
whoosh(C.root + 0.15, 0.4, 400, 2500, 0.25);
const COUNTS = [6, 12, 18, 26, 34];
C.rings.forEach((start, k) => {
  const n = COUNTS[k];
  for (let j = 0; j < n; j += k < 3 ? 1 : 2) pop(start + (j / n) * 0.42 + 0.05, 900 + k * 180 + (j % 4) * 50, 0.075 - k * 0.008, (j / n) * 1.6 - 0.8);
  whoosh(start + 0.2, 0.5, 200, 1200, 0.12, 0.5);
});
chime(C.done, [1175, 1568], 0.06);
whoosh(C.stack + 0.35, 0.7, 3500, 180, 0.35, 0.8);
thud(C.stack + 0.45, 0.35);
pop(C.ready, 700, 0.3);
chime(C.ready + 0.05, [784, 1175, 1568], 0.08);
// Chat.
const CH = K.chat;
whoosh(CH.open + 0.25, 0.45, 500, 3000, 0.22);
typeOver("Wo ändere ich meine Rechnungsadresse?", CH.typeStart, CH.typeEnd, 0.13);
click(CH.send, 0.55);
whoosh(CH.send + 0.25, 0.4, 800, 4000, 0.2);
whoosh(CH.search + 0.4, 0.8, 2000, 6000, 0.05, 0.5);
for (let i = 0; i < 16; i++) put(CH.answer + i * 0.069, 0.02, (x) => rand() * Math.exp(-x * 300), 0.03, rand() * 0.4);
whoosh(CH.answer + 1.35, 0.4, 2500, 7000, 0.1, 0.5);
pop(CH.source, 880, 0.25);
// Verify.
const V = K.verify;
click(V.click, 0.6);
whoosh(V.click + 0.35, 0.6, 200, 3500, 0.4, 0.7);
whoosh(V.mark + 0.3, 0.5, 2500, 7000, 0.14, 0.5);
chime(V.mark + 0.45, [1568, 2093], 0.05);
whoosh(V.implode + 0.45, 0.6, 4000, 150, 0.4, 0.85);
pop(V.dot, 520, 0.2);
// Finale: hits on the words (the drop carries the energy), zoom-through, swirl, the last hit.
const F = K.finale;
F.words.forEach((w, i) => whoosh(w, 0.14, 1000, 7000, 0.16, 0.85, i % 2 ? 0.35 : -0.35));
whoosh(F.words[5] + 0.55, 0.4, 600, 3000, 0.2, 0.6);
whoosh(F.swirl, 0.55, 150, 5000, 0.35, 0.9);
whoosh(F.swirl + 0.6, 0.9, 400, 1400, 0.18, 0.5);
whoosh(F.collapse + 0.15, 0.6, 4000, 200, 0.4, 0.85);
pop(F.collapse + 0.2, 480, 0.25);
const E = K.end;
boom(E.hit, 0.6);
chime(E.hit + 0.15, [1047, 1319, 1568, 2093], 0.06, 0.05);
pop(E.cta, 560, 0.28);

let peak = 0;
for (let i = 0; i < N; i++) peak = Math.max(peak, Math.abs(L[i]), Math.abs(R[i]));
const norm = Math.min(1, 0.8 / peak);
const data = Buffer.alloc(44 + N * 4);
data.write("RIFF", 0);
data.writeUInt32LE(36 + N * 4, 4);
data.write("WAVEfmt ", 8);
data.writeUInt32LE(16, 16);
data.writeUInt16LE(1, 20);
data.writeUInt16LE(2, 22);
data.writeUInt32LE(SR, 24);
data.writeUInt32LE(SR * 4, 28);
data.writeUInt16LE(4, 32);
data.writeUInt16LE(16, 34);
data.write("data", 36);
data.writeUInt32LE(N * 4, 40);
for (let i = 0; i < N; i++) {
  data.writeInt16LE(Math.round(Math.tanh(L[i] * norm) * 32767), 44 + i * 4);
  data.writeInt16LE(Math.round(Math.tanh(R[i] * norm) * 32767), 46 + i * 4);
}
writeFileSync(pub("ad-sfx.wav"), data);
console.log(`public/ad-music.wav + public/ad-sfx.wav: ${K.duration} s, sfx peak ${peak.toFixed(2)}`);
