// Synthesises the soundtrack of the 15-second film: 120 BPM, kick on every
// beat, UI clicks and whooshes on the cues the picture uses.
// Usage: node scripts/make-music.mjs  →  public/film15.wav
import { readFileSync, writeFileSync } from "node:fs";

const cues = JSON.parse(readFileSync(new URL("../src/film15/cues.json", import.meta.url)));
const SR = 48000;
const LEN = cues.duration;
const N = Math.round(SR * LEN);
const BEAT = 60 / cues.bpm;
const L = new Float32Array(N);
const R = new Float32Array(N);
const busL = new Float32Array(N); // sent through the delay
const busR = new Float32Array(N);

let seed = 7;
const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647) * 2 - 1;
const hz = (midi) => 440 * 2 ** ((midi - 69) / 12);

function add(buf, i, v) {
  if (i >= 0 && i < N) buf[i] += v;
}
function put(t, dur, fn, gain = 1, pan = 0, send = 0) {
  const s = Math.round(t * SR);
  const n = Math.round(dur * SR);
  const gl = gain * Math.cos(((pan + 1) * Math.PI) / 4);
  const gr = gain * Math.sin(((pan + 1) * Math.PI) / 4);
  for (let k = 0; k < n; k++) {
    const v = fn(k / SR, k);
    add(L, s + k, v * gl);
    add(R, s + k, v * gr);
    if (send) {
      add(busL, s + k, v * gl * send);
      add(busR, s + k, v * gr * send);
    }
  }
}

// Sidechain: everything tonal ducks a little under each kick.
const duck = (t) => {
  const since = t % BEAT;
  return t < 13.5 ? 0.55 + 0.45 * Math.min(1, since / 0.18) : 1;
};

// --- Harmony: Am F C G | Am F G | C (resolve on the logo) -----------------
const BARS = [
  { at: 0, notes: [57, 60, 64], root: 45 },
  { at: 2, notes: [57, 60, 65], root: 41 },
  { at: 4, notes: [55, 60, 64], root: 48 },
  { at: 6, notes: [55, 59, 62], root: 43 },
  { at: 8, notes: [57, 60, 64], root: 45 },
  { at: 10, notes: [57, 60, 65], root: 41 },
  { at: 12, notes: [55, 59, 62], root: 43 },
  { at: 13.5, notes: [55, 60, 64, 67], root: 48 },
];
const barAt = (t) => BARS.filter((b) => b.at <= t).at(-1);

// Kick on every beat until the logo, then one big one.
function kick(t, gain) {
  put(t, 0.45, (x) => {
    const f = 48 + 110 * Math.exp(-x * 28);
    return Math.sin(2 * Math.PI * f * x - 0.2 * Math.exp(-x * 30)) * Math.exp(-x * 7.5);
  }, gain);
  put(t, 0.012, () => rand() * 0.3, gain * 0.5);
}
for (let b = 0; b * BEAT < 13.5; b++) kick(b * BEAT, b < 4 ? 0.55 : 0.8);
kick(13.5, 1.0);

// Hats: off-beats from the first morph, sixteenths while the crawl runs.
function hat(t, gain, pan) {
  let hp = 0;
  let prev = 0;
  put(t, 0.06, (x) => {
    const n = rand();
    hp = 0.6 * (hp + n - prev);
    prev = n;
    return hp * Math.exp(-x * 70);
  }, gain, pan);
}
for (let s = 0; s * BEAT / 4 < 13.4; s++) {
  const t = (s * BEAT) / 4;
  if (t < 2) continue;
  const off = s % 4 === 2;
  const busy = t >= 5 && t < 7.5;
  if (off) hat(t, 0.32, 0.2);
  else if (busy && s % 2 === 1) hat(t, 0.13, -0.3);
}

// Bass: eighth pulses on the root, lowpassed saw.
for (let e = 0; e * BEAT / 2 < 13.5; e++) {
  const t = (e * BEAT) / 2;
  if (t < 1.5) continue;
  const f = hz(barAt(t).root);
  let lp = 0;
  put(t, BEAT / 2 - 0.01, (x) => {
    const saw = 2 * ((f * x) % 1) - 1;
    lp += 0.08 * (saw - lp);
    return lp * Math.min(1, x / 0.005) * Math.exp(-x * 6) * duck(t + x);
  }, 0.5);
}
// Final low note under the logo.
put(13.5, 1.5, (x) => Math.sin(2 * Math.PI * hz(36) * x) * Math.min(1, x / 0.01) * Math.exp(-x * 1.8), 0.55);

// Pad: soft detuned chord per bar.
for (let i = 0; i < BARS.length; i++) {
  const bar = BARS[i];
  const end = i + 1 < BARS.length ? BARS[i + 1].at : LEN;
  const dur = end - bar.at + 0.3;
  for (const note of bar.notes) {
    for (const det of [-0.08, 0.08]) {
      const f = hz(note + det);
      const pan = det < 0 ? -0.4 : 0.4;
      put(bar.at, dur, (x) => {
        const env = Math.min(1, x / 0.35) * Math.min(1, (dur - x) / 0.3);
        const tri = (2 / Math.PI) * Math.asin(Math.sin(2 * Math.PI * f * x));
        return tri * env * duck(bar.at + x);
      }, i === BARS.length - 1 ? 0.07 : 0.045, pan, 0.4);
    }
  }
}

// Plucked arpeggio: from the crawl to the answer, sixteenths over the chord.
for (let s = 0; s * BEAT / 4 < 12.5; s++) {
  const t = (s * BEAT) / 4;
  if (t < 3.5) continue;
  const notes = barAt(t).notes;
  const note = notes[[0, 1, 2, 1][s % 4]] + 12 + (s % 8 >= 4 ? 7 : 0);
  const f = hz(note);
  put(t, 0.22, (x) => Math.sin(2 * Math.PI * f * x + 0.8 * Math.sin(2 * Math.PI * f * 2 * x) * Math.exp(-x * 20)) * Math.exp(-x * 16), 0.07, s % 2 ? 0.5 : -0.5, 0.6);
}

// --- UI sounds ----------------------------------------------------------
function click(t, gain = 0.5) {
  put(t, 0.05, (x) => (Math.sin(2 * Math.PI * 2100 * x) * 0.6 + rand() * 0.4) * Math.exp(-x * 120), gain);
  put(t, 0.08, (x) => Math.sin(2 * Math.PI * 520 * x) * Math.exp(-x * 60), gain * 0.5);
}
for (const t of cues.clicks) click(t);
click(cues.hover, 0.18);

for (const run of cues.typing) {
  const n = run.text.length;
  for (let c = 0; c < n; c++) {
    const t = run.start + ((c + 0.5) / n) * (run.end - run.start);
    put(t, 0.025, (x) => rand() * Math.exp(-x * 260), 0.1, rand() * 0.3);
  }
}

// Whoosh: bandpassed noise swelling into the morph.
function whoosh(t, gain = 0.28) {
  const dur = 0.5;
  let low = 0;
  let band = 0;
  put(t - 0.3, dur, (x) => {
    const p = x / dur;
    const f = 300 + 2600 * p;
    const q = 2 * Math.sin((Math.PI * f) / SR);
    const high = rand() - low - 0.7 * band;
    band += q * high;
    low += q * band;
    return band * Math.sin(Math.PI * p) ** 2;
  }, gain, 0, 0.3);
}
for (const t of cues.whooshes) whoosh(t);

// Indexing: a tick every few pages, climbing as they become searchable.
const idx = cues.indexing;
for (let p = 0; p < idx.pages; p += 3) {
  const t = idx.start + (p / idx.pages) * (idx.end - idx.start);
  const f = 1200 + p * 25;
  put(t, 0.05, (x) => Math.sin(2 * Math.PI * f * x) * Math.exp(-x * 90), 0.12, (p / idx.pages) * 1.2 - 0.6, 0.3);
}

// Ready chime.
for (const [dt, note] of [[0, 88], [0.09, 95]]) {
  const f = hz(note);
  put(cues.ready + dt, 0.6, (x) => Math.sin(2 * Math.PI * f * x) * Math.exp(-x * 7), 0.13, 0, 0.5);
}

// --- Delay bus, master ---------------------------------------------------
const D = Math.round(((BEAT * 3) / 4) * SR);
for (let i = D; i < N; i++) {
  busL[i] += busR[i - D] * 0.38;
  busR[i] += busL[i - D] * 0.38;
}
let peak = 0;
for (let i = 0; i < N; i++) {
  const fade = Math.min(1, (N - i) / (SR * 0.35));
  L[i] = Math.tanh((L[i] + busL[i] * 0.5) * 1.1) * fade;
  R[i] = Math.tanh((R[i] + busR[i] * 0.5) * 1.1) * fade;
  peak = Math.max(peak, Math.abs(L[i]), Math.abs(R[i]));
}
const norm = 0.89 / peak;

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
  data.writeInt16LE(Math.round(L[i] * norm * 32767), 44 + i * 4);
  data.writeInt16LE(Math.round(R[i] * norm * 32767), 46 + i * 4);
}
writeFileSync(new URL("../public/film15.wav", import.meta.url), data);
console.log(`public/film15.wav: ${LEN} s, peak ${peak.toFixed(2)} → normalised`);
