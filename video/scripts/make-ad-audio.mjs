// Builds the ad's soundtrack from src/ad/cues.json:
//  public/ad-music.wav  the Lyria take re-cut on bar lines (beat 1 on frame 0), ducked under the voice
//  public/ad-voice.wav  the voice-over take, phrase by phrase at its cue
//  public/ad-sfx.wav    synthesised UI foley and transition hits
// Usage: node scripts/make-ad-audio.mjs
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";

const K = JSON.parse(readFileSync(new URL("../src/ad/cues.json", import.meta.url)));
const pub = (f) => new URL(`../public/${f}`, import.meta.url).pathname.replace(/^\/([A-Z]:)/, "$1");
const SR = 48000;
const N = Math.round(SR * K.duration);

/** Decodes an audio file to two float channels at 48 kHz. */
const decode = (file) => {
  const raw = execFileSync("ffmpeg", ["-v", "error", "-i", pub(file), "-ac", "2", "-ar", String(SR), "-f", "f32le", "-"], { maxBuffer: 1 << 30 });
  const x = new Float32Array(raw.buffer, raw.byteOffset, raw.length / 4);
  const n = x.length / 2;
  const L = new Float32Array(n);
  const R = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    L[i] = x[2 * i];
    R[i] = x[2 * i + 1];
  }
  return { L, R, n };
};

const writeWav = (file, L, R, gain = 1) => {
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
    data.writeInt16LE(Math.round(Math.tanh(L[i] * gain) * 32767), 44 + i * 4);
    data.writeInt16LE(Math.round(Math.tanh(R[i] * gain) * 32767), 46 + i * 4);
  }
  writeFileSync(pub(file), data);
};

/** Copies [from, to) of a source to `at`, with short fades so the cuts do not click. */
const place = (dst, src, at, from, to, gain = 1, fade = 0.012) => {
  const a = Math.round(from * SR);
  const len = Math.round((to - from) * SR);
  const o = Math.round(at * SR);
  const f = Math.round(fade * SR);
  for (let k = 0; k < len; k++) {
    const i = o + k;
    const j = a + k;
    if (i < 0 || i >= N || j >= src.n) continue;
    const env = Math.min(1, k / f, (len - k) / f) * gain;
    dst.L[i] += src.L[j] * env;
    dst.R[i] += src.R[j] * env;
  }
};

// --- Voice
const vo = decode(K.vo.file);
const voice = { L: new Float32Array(N), R: new Float32Array(N) };
for (const c of K.vo.clips) place(voice, vo, c.at, c.src[0], c.src[1], 1, 0.02);

// --- Music, re-cut on bar lines and ducked wherever the voice speaks.
const src = decode(K.music.file);
const music = { L: new Float32Array(N), R: new Float32Array(N) };
for (const p of K.music.parts) place(music, src, p.at, p.from, p.to, 1, 0.01);
const speaking = new Float32Array(N);
for (const c of K.vo.clips) {
  const a = Math.round((c.at - 0.08) * SR);
  const b = Math.round((c.at + c.src[1] - c.src[0] + 0.05) * SR);
  for (let i = Math.max(0, a); i < Math.min(N, b); i++) speaking[i] = 1;
}
let g = 0;
const att = 1 - Math.exp(-1 / (0.06 * SR));
const rel = 1 - Math.exp(-1 / (0.35 * SR));
const fadeOutAt = Math.round(K.music.fadeOut * SR);
for (let i = 0; i < N; i++) {
  g += (speaking[i] - g) * (speaking[i] > g ? att : rel);
  const duck = 1 - 0.45 * g; // about −5 dB under the voice
  const fo = i > fadeOutAt ? Math.max(0, 1 - (i - fadeOutAt) / (N - fadeOutAt)) : 1;
  music.L[i] *= 0.7 * duck * fo;
  music.R[i] *= 0.7 * duck * fo;
}

// --- SFX
const S = { L: new Float32Array(N), R: new Float32Array(N) };
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
    S.L[i] += v * gl;
    S.R[i] += v * gr;
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
function key(t, gain = 0.12) {
  const f = 1800 + rand() * 500;
  put(t, 0.03, (x) => (rand() * 0.7 + Math.sin(2 * Math.PI * f * x) * 0.3) * Math.exp(-x * 240), gain * (0.8 + rand() * 0.3), rand() * 0.25);
  put(t, 0.05, (x) => Math.sin(2 * Math.PI * 220 * x) * Math.exp(-x * 90), gain * 0.5);
}
function pop(t, f = 700, gain = 0.3, pan = 0) {
  put(t, 0.14, (x) => Math.sin(2 * Math.PI * f * x * (1 + 1.2 * Math.exp(-x * 40))) * Math.exp(-x * 30), gain, pan);
}
function thud(t, gain = 0.5) {
  put(t, 0.3, (x) => Math.sin(2 * Math.PI * (60 + 90 * Math.exp(-x * 30)) * x) * Math.exp(-x * 12), gain);
  put(t, 0.02, () => rand(), gain * 0.2);
}
function chime(t, notes, gain = 0.08, gap = 0.07) {
  notes.forEach((f, i) => put(t + i * gap, 0.9, (x) => (Math.sin(2 * Math.PI * f * x) + 0.3 * Math.sin(4 * Math.PI * f * x)) * Math.exp(-x * 5), gain));
}
function boom(t, gain = 0.6) {
  put(t, 1.8, (x) => Math.sin(2 * Math.PI * (36 + 70 * Math.exp(-x * 9)) * x) * Math.exp(-x * 2.2), gain);
  put(t, 0.3, (x) => rand() * Math.exp(-x * 16), gain * 0.25);
}
const typeOver = (text, a, b, gain) => {
  for (let c = 0; c < text.length; c++) key(a + ((c + 0.3) / text.length) * (b - a) + rand() * 0.01, gain);
};

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

writeWav("ad-music.wav", music.L, music.R);
writeWav("ad-voice.wav", voice.L, voice.R, 1.1);
let peak = 0;
for (let i = 0; i < N; i++) peak = Math.max(peak, Math.abs(S.L[i]), Math.abs(S.R[i]));
writeWav("ad-sfx.wav", S.L, S.R, Math.min(1, 0.7 / peak));
console.log(`public/ad-music.wav, ad-voice.wav, ad-sfx.wav: ${K.duration} s`);
