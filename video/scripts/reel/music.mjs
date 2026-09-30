// Synthesizes the reel's music from src/reel/cues.json: free and licence-free, and
// every section lands exactly on the picture (build under the problem, a dead stop
// on "nichts", the drop on the logo, an impact on the brand, a final ring-out).
// Usage: node scripts/reel/music.mjs  →  public/reel/music.wav
import { readFileSync } from "node:fs";
import { SR, at, writeWav } from "./lib.mjs";

const cues = JSON.parse(readFileSync(at("src/reel/cues.json")));
const { t, duration, bpm } = cues;
const BEAT = 60 / bpm;
const N = Math.ceil(duration * SR);
const L = new Float32Array(N);
const R = new Float32Array(N);
const duck = new Float32Array(N).fill(1); // sidechain from the kick

// Random with a fixed seed, so every render sounds the same.
let seed = 7;
const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647) * 2 - 1;

const hz = (m) => 440 * 2 ** ((m - 69) / 12);
const DROP = t.drop;
const CUT = t.collapse - 0.15; // everything stops on "nichts"
const BRAND = t.logo2;
const OUTRO = t.outro;

/** Tiny state-variable filter (TPT), cutoff may change every sample. */
function svf() {
  let ic1 = 0,
    ic2 = 0;
  return (x, fc, q = 0.7) => {
    const g = Math.tan((Math.PI * Math.min(fc, SR * 0.45)) / SR);
    const k = 1 / q;
    const a1 = 1 / (1 + g * (g + k));
    const v3 = x - ic2;
    const v1 = a1 * ic1 + g * a1 * v3;
    const v2 = ic2 + g * v1;
    ic1 = 2 * v1 - ic1;
    ic2 = 2 * v2 - ic2;
    return { lp: v2, bp: v1, hp: x - k * v1 - v2 };
  };
}

const add = (i, l, r = l) => {
  if (i >= 0 && i < N) {
    L[i] += l;
    R[i] += r;
  }
};

// ---------- drums ----------
function kick(time, gain = 1) {
  const s = Math.round(time * SR);
  let ph = 0;
  for (let i = 0; i < SR * 0.45; i++) {
    const x = i / SR;
    const f = 44 + 120 * Math.exp(-x * 24);
    ph += (2 * Math.PI * f) / SR;
    const env = Math.exp(-x * 5.5) * (x < 0.002 ? x / 0.002 : 1);
    const click = i < SR * 0.004 ? rnd() * 0.35 * (1 - i / (SR * 0.004)) : 0;
    const v = Math.tanh((Math.sin(ph) * env + click) * 2.2) * 0.7 * gain;
    add(s + i, v);
  }
  // Sidechain: the bass and chords breathe with the kick.
  for (let i = 0; i < SR * 0.32; i++) {
    const x = i / (SR * 0.32);
    const d = 1 - 0.72 * gain * (1 - x) ** 2;
    if (s + i < N) duck[s + i] = Math.min(duck[s + i], d);
  }
}

function clap(time, gain = 1) {
  const s = Math.round(time * SR);
  const f = svf();
  for (let i = 0; i < SR * 0.25; i++) {
    const x = i / SR;
    const burst = [0, 0.011, 0.022].some((b) => x >= b && x < b + 0.009) ? 1 : 0;
    const env = x < 0.03 ? burst * 0.9 : Math.exp(-(x - 0.03) * 22);
    const body = x < 0.12 ? Math.sin(2 * Math.PI * 190 * x) * Math.exp(-x * 30) * 0.5 : 0;
    const v = (f(rnd(), 1050, 1.4).bp * env * 0.38 + body) * gain;
    add(s + i, v * 0.9, v);
  }
}

function hat(time, gain = 1, open = false) {
  const s = Math.round(time * SR);
  const f = svf();
  const len = open ? 0.22 : 0.05;
  for (let i = 0; i < SR * len; i++) {
    const x = i / SR;
    const env = Math.exp(-x * (open ? 16 : 70));
    const v = f(rnd(), 9000, 0.8).hp * env * 0.1 * gain;
    add(s + i, v * 0.8, v);
  }
}

function crash(time, gain = 1, len = 1.8) {
  const s = Math.round(time * SR);
  const fl = svf();
  const fr = svf();
  for (let i = 0; i < SR * len; i++) {
    const x = i / SR;
    const env = Math.exp(-x * 2.6);
    add(s + i, fl(rnd(), 6000, 0.6).hp * env * 0.22 * gain, fr(rnd(), 6000, 0.6).hp * env * 0.22 * gain);
  }
}

function boom(time, gain = 1) {
  const s = Math.round(time * SR);
  let ph = 0;
  for (let i = 0; i < SR * 1.6; i++) {
    const x = i / SR;
    ph += (2 * Math.PI * (38 + 60 * Math.exp(-x * 9))) / SR;
    add(s + i, Math.sin(ph) * Math.exp(-x * 2.4) * 0.55 * gain);
  }
}

/** Noise swell with a rising filter, ending exactly at `to`. */
function riser(from, to, gain = 1) {
  const a = Math.round(from * SR);
  const b = Math.round(to * SR);
  const fl = svf();
  const fr = svf();
  for (let i = a; i < b; i++) {
    const p = (i - a) / (b - a);
    const fc = 300 * 40 ** p;
    const env = p ** 2 * 0.3 * gain;
    add(i, fl(rnd(), fc, 2).bp * env, fr(rnd(), fc, 2).bp * env);
  }
}

// ---------- harmony ----------
// F – C – Dm – Bb, one chord per bar (2 s), friendly and bright.
const PROG = [
  { root: 41, notes: [65, 69, 72, 76] }, // Fmaj7
  { root: 36, notes: [64, 67, 72, 76] }, // C
  { root: 38, notes: [65, 69, 72, 74] }, // Dm7
  { root: 34, notes: [65, 70, 74, 77] }, // Bb
];
const chordAt = (time) => PROG[Math.floor(time / (BEAT * 4)) % 4];

function saw(ph) {
  return 2 * (ph - Math.floor(ph + 0.5));
}

/** Chords with a filter that opens over the song; `level(time)` shapes them. */
function chords(from, to, cutoff, level, stab = false) {
  const a = Math.round(from * SR);
  const b = Math.round(to * SR);
  const detune = [-0.11, 0, 0.12];
  const phs = new Float64Array(4 * 3 * 2).map(() => (rnd() + 1) / 2);
  const fl = svf();
  const fr = svf();
  for (let i = a; i < b; i++) {
    const time = i / SR;
    const ch = chordAt(time);
    let l = 0,
      r = 0;
    ch.notes.forEach((m, n) => {
      detune.forEach((d, k) => {
        const idx = (n * 3 + k) * 2;
        phs[idx] += hz(m + d) / SR;
        phs[idx + 1] += hz(m - d * 0.8) / SR;
        l += saw(phs[idx]);
        r += saw(phs[idx + 1]);
      });
    });
    let env = level(time);
    if (stab) {
      // Off-beat stabs on the eighths between kicks.
      const pos = (time / (BEAT / 2)) % 1;
      const on = Math.floor(time / (BEAT / 2)) % 2 === 1;
      env *= on ? Math.exp(-pos * 3.5) : 0.18;
    }
    const fc = cutoff(time);
    const g = 0.03 * env * duck[i];
    add(i, fl(l, fc, 0.9).lp * g, fr(r, fc, 0.9).lp * g);
  }
}

function bass(from, to, level, cutoff) {
  const a = Math.round(from * SR);
  const b = Math.round(to * SR);
  let ph = 0;
  let sub = 0;
  const f = svf();
  for (let i = a; i < b; i++) {
    const time = i / SR;
    const ch = chordAt(time);
    // Eighth-note pulse, octave jump on the last eighth of each beat pair.
    const eighth = Math.floor(time / (BEAT / 2));
    const pos = (time / (BEAT / 2)) % 1;
    const m = ch.root + (eighth % 4 === 3 ? 12 : 0);
    ph += hz(m) / SR;
    sub += hz(m) / SR;
    const env = Math.min(1, pos * 60) * Math.exp(-pos * 1.6);
    const v = f(saw(ph) * 0.55 + Math.sin(2 * Math.PI * sub) * 1.1, cutoff(time), 1.1).lp;
    add(i, v * 0.26 * env * level(time) * duck[i]);
  }
}

/** Sixteenth pluck arpeggio with a dotted-eighth echo. */
function arp(from, to, level) {
  const step = BEAT / 4;
  const pattern = [0, 2, 1, 3, 2, 1, 3, 0];
  for (let time = from; time < to - 1e-6; time += step) {
    const n = Math.round(time / step);
    const ch = chordAt(time + 1e-4);
    const m = ch.notes[pattern[n % 8]] + 12;
    const s = Math.round(time * SR);
    const f = svf();
    let ph = 0;
    const g = level(time);
    if (g <= 0) continue;
    for (let i = 0; i < SR * 0.25; i++) {
      const x = i / SR;
      ph += hz(m) / SR;
      const tri = 1 - 4 * Math.abs(ph - Math.floor(ph) - 0.5);
      const v = f(tri + 0.35 * saw(ph), 700 + 2600 * Math.exp(-x * 24), 0.9).lp;
      const env = Math.exp(-x * 11) * 0.07 * g;
      const pan = n % 2 ? 0.7 : 1;
      add(s + i, v * env * pan, v * env * (1.7 - pan));
      // Echo, 3/16 later, quieter and on the other side.
      const e = s + i + Math.round(step * 3 * SR);
      add(e, v * env * 0.35 * (1.7 - pan), v * env * 0.35 * pan);
    }
  }
}

// ---------- arrangement ----------
const ramp = (time, a, b) => Math.max(0, Math.min(1, (time - a) / (b - a)));

// Drums first: the kicks write the sidechain that bass and chords read.
// Problem (0 → CUT): ticking hats, a kick that comes in with the first click.
for (let x = 1.0; x < CUT; x += BEAT / 2) hat(x, x % BEAT < 1e-6 ? 0.35 : 0.65);
for (let x = t.clicks[0]; x < CUT; x += BEAT) kick(x, 0.7);
riser(t.zoomOut, CUT, 0.7);
// Dead stop, then a swell that sucks into the drop.
riser(t.stop, DROP, 1.2);

// Drop → collapse: full groove. Collapse → brand: a short breath. Brand → outro: full again.
const grooveEnd = t.collapse2;
const groove = (from, to) => {
  for (let x = from; x < to - 1e-6; x += BEAT) {
    kick(x);
    hat(x + BEAT / 2, 1, true);
    if (Math.round((x - from) / BEAT) % 2 === 1) clap(x);
  }
  for (let x = from; x < to - 1e-6; x += BEAT / 4) hat(x, Math.round(x / (BEAT / 4)) % 2 ? 0.55 : 0.3);
};
boom(DROP, 1);
crash(DROP, 1);
groove(DROP, grooveEnd);
riser(grooveEnd, BRAND, 0.9);
boom(BRAND, 0.8);
crash(BRAND, 0.8);
groove(BRAND, OUTRO);
kick(OUTRO, 1.1);
boom(OUTRO, 0.9);
crash(OUTRO, 1, 2.5);

// Harmony.
chords(0, CUT + 0.05, (x) => 380 + 900 * ramp(x, 0, CUT), (x) => 0.7 * ramp(x, 0, 1.2) * (x > CUT - 0.05 ? 0 : 1));
bass(t.clicks[0], CUT, () => 0.8, (x) => 250 + 500 * ramp(x, t.clicks[0], CUT));
chords(DROP, grooveEnd, () => 3200, () => 1, true);
bass(DROP, grooveEnd, () => 1, () => 900);
arp(t.inputToPage, t.dbToAsk, () => 0.55);
arp(t.dbToAsk, grooveEnd, () => 0.9);
chords(grooveEnd, BRAND, (x) => 3200 * 0.15 ** ramp(x, grooveEnd, BRAND), () => 0.8);
chords(BRAND, OUTRO, () => 4200, () => 1, true);
bass(BRAND, OUTRO, () => 1, () => 1100);
arp(BRAND, OUTRO, () => 1);
chords(OUTRO, duration, (x) => 4200 * 0.2 ** ramp(x, OUTRO, duration), (x) => Math.exp(-(x - OUTRO) * 1.3));

// Short room so nothing sounds dry: two cross-fed delays.
for (const [ms, g] of [
  [23, 0.18],
  [41, 0.12],
]) {
  const d = Math.round((ms / 1000) * SR);
  for (let i = N - 1; i >= d; i--) {
    L[i] += R[i - d] * g;
    R[i] += L[i - d] * g;
  }
}

let peak = 0;
for (let i = 0; i < N; i++) peak = Math.max(peak, Math.abs(L[i]), Math.abs(R[i]));
const norm = 0.89 / peak;
for (let i = 0; i < N; i++) {
  L[i] = Math.tanh(L[i] * norm * 1.1) / Math.tanh(1.1);
  R[i] = Math.tanh(R[i] * norm * 1.1) / Math.tanh(1.1);
}
writeWav(at("public/reel/music.wav"), [L, R]);
console.log(`public/reel/music.wav  ${duration} s, ${bpm} BPM, drop ${DROP} s`);
