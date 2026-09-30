// Synthesises the explainer's sound effects on the cues the picture uses:
// whooshes on camera moves, clicks, pops, crawl ticks and the drop.
// Usage: node scripts/make-sfx.mjs  →  public/explainer-sfx.wav
import { readFileSync, writeFileSync } from "node:fs";

const K = JSON.parse(readFileSync(new URL("../src/explainer/cues.json", import.meta.url)));
const SR = 48000;
const N = Math.round(SR * K.duration);
const L = new Float32Array(N);
const R = new Float32Array(N);

let seed = 11;
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

/** Bandpassed noise sweeping from f0 to f1, peaking at `peak` (0..1 of dur). */
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

/** A soft bubbly pop, pitched. */
function pop(t, f = 700, gain = 0.3, pan = 0) {
  put(t, 0.14, (x) => Math.sin(2 * Math.PI * f * x * (1 + 1.2 * Math.exp(-x * 40))) * Math.exp(-x * 30), gain, pan);
}

function thud(t, gain = 0.6) {
  put(t, 0.3, (x) => Math.sin(2 * Math.PI * (60 + 90 * Math.exp(-x * 30)) * x) * Math.exp(-x * 12), gain);
  put(t, 0.02, () => rand(), gain * 0.25);
}

// Hook: a low swell under the pull-back, a shimmer when the answer lights up.
whoosh(0.2, 3.4, 90, 700, 0.35, 0.85);
for (const [dt, f] of [[0, 1320], [0.08, 1760], [0.16, 2217]]) put(K.hook.answer + dt, 0.9, (x) => Math.sin(2 * Math.PI * f * x) * Math.exp(-x * 5), 0.09, 0.4);
thud(K.hook.where, 0.55);
whoosh(K.hook.dive + 0.35, 0.8, 300, 5000, 0.5, 0.75);

// Problem: whip on each click, a thud per "Klick." stamp, pops as windows pile up.
for (const h of K.problem.hits) {
  click(h, 0.55);
  thud(h + 0.02, 0.35);
  whoosh(h + 0.18, 0.3, 1200, 4000, 0.3, 0.5, 0.3);
}
for (let i = 0; i < 7; i++) pop(K.problem.cascade + 0.08 + i * 0.11, 500 + i * 60, 0.22, (i % 2 ? 0.4 : -0.4));
for (let i = 0; i < 17; i++) put(K.problem.cascade + Math.pow(i / 17, 1 / 1.3) * 1.1, 0.03, (x) => rand() * Math.exp(-x * 200), 0.08, rand() * 0.6);
whoosh(K.problem.implode + 0.55, 0.7, 4000, 120, 0.45, 0.85);
thud(K.problem.nothing, 0.3);

// The drop: sub boom, bright burst, rising shimmer.
whoosh(K.drop, 1.4, 200, 8000, 0.25, 0.25);
put(K.drop, 1.6, (x) => Math.sin(2 * Math.PI * (38 + 70 * Math.exp(-x * 9)) * x) * Math.exp(-x * 2.6), 0.9);
put(K.drop, 0.25, (x) => rand() * Math.exp(-x * 18), 0.3);
for (const [dt, f] of [[0.3, 1047], [0.36, 1319], [0.42, 1568], [0.48, 2093]]) pop(K.drop + dt, f, 0.1);

// URL and crawl.
whoosh(K.url.morph + 0.3, 0.5, 600, 3000, 0.25);
put(K.url.paste, 0.06, (x) => (rand() * 0.6 + Math.sin(2 * Math.PI * 1800 * x)) * Math.exp(-x * 90), 0.35);
click(K.url.enter, 0.6);
whoosh(K.crawl.root + 0.3, 0.6, 400, 2500, 0.28);
const COUNTS = [6, 16, 34, 64];
K.crawl.rings.forEach((start, k) => {
  const n = COUNTS[k];
  for (let j = 0; j < n; j += k < 2 ? 1 : 2) {
    const t = start + (j / n) * 0.55 + 0.25;
    pop(t, 900 + k * 260 + (j % 5) * 40, 0.09 - k * 0.012, (j / n) * 1.6 - 0.8);
  }
  whoosh(start + 0.3, 0.7, 150, 900, 0.18, 0.5);
});

// Knowledge base: a swirl down into the centre, a pop, a chime.
whoosh(K.base.collapse + 0.8, 1.1, 3000, 150, 0.4, 0.8);
thud(K.base.db, 0.5);
for (const [dt, f] of [[0, 784], [0.1, 1175], [0.2, 1568]]) put(K.base.collapse + 1.5 + dt, 0.8, (x) => Math.sin(2 * Math.PI * f * x) * Math.exp(-x * 5), 0.1);
whoosh(K.base.toInput + 0.4, 0.5, 500, 3000, 0.22);

// Chat.
const q = "Welche Zahlungsarten bietet ihr an?";
for (let c = 0; c < q.length; c++) {
  const t = K.ask.typeStart + ((c + 0.5) / q.length) * (K.ask.typeEnd - K.ask.typeStart);
  put(t, 0.025, (x) => rand() * Math.exp(-x * 260), 0.12, rand() * 0.3);
}
click(K.ask.send, 0.55);
whoosh(K.ask.send + 0.35, 0.5, 800, 4000, 0.25);
pop(K.answer.card, 620, 0.25);
pop(K.answer.sources, 880, 0.25, -0.3);
pop(K.answer.sources + 0.12, 1040, 0.22, 0.3);
whoosh(K.answer.dive + 0.45, 0.7, 200, 3500, 0.4, 0.7);
whoosh(K.answer.marker + 0.3, 0.55, 2000, 6000, 0.12, 0.5);

// Comparison.
whoosh(K.edge.back + 0.7, 1.0, 4000, 200, 0.4, 0.75);
pop(K.edge.surface, 600, 0.25);
whoosh(K.edge.deep + 0.4, 0.9, 150, 1800, 0.35, 0.4);
put(K.edge.deep, 1.2, (x) => Math.sin(2 * Math.PI * (55 + 40 * Math.exp(-x * 6)) * x) * Math.exp(-x * 3), 0.5);
whoosh(K.edge.sites + 0.5, 0.7, 500, 2500, 0.25);
pop(K.edge.sites + 0.2, 700, 0.2, 0);
pop(K.edge.sites + 0.35, 820, 0.2, 0.5);
whoosh(K.edge.implode + 0.5, 0.8, 3500, 150, 0.4, 0.85);

// Finale.
thud(K.cta.logo, 0.6);
for (const [dt, f] of [[0.2, 1047], [0.27, 1568], [0.34, 2093]]) pop(K.cta.logo + dt, f, 0.1);
pop(K.cta.button, 520, 0.3);
click(K.cta.click, 0.6);
for (const [dt, f] of [[0.05, 1319], [0.13, 1976]]) put(K.cta.click + dt, 0.7, (x) => Math.sin(2 * Math.PI * f * x) * Math.exp(-x * 6), 0.1);

let peak = 0;
for (let i = 0; i < N; i++) peak = Math.max(peak, Math.abs(L[i]), Math.abs(R[i]));
const norm = Math.min(1, 0.9 / peak);
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
writeFileSync(new URL("../public/explainer-sfx.wav", import.meta.url), data);
console.log(`public/explainer-sfx.wav: ${K.duration} s, peak ${peak.toFixed(2)}`);
