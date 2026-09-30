// Measures tempo, first-beat offset and loudness per bar of a music file.
// Usage: node scripts/beat-grid.mjs public/ad-music.mp3
import { execFileSync } from "node:child_process";

const file = process.argv[2];
const SR = 22050;
const raw = execFileSync("ffmpeg", ["-v", "error", "-i", file, "-ac", "1", "-ar", String(SR), "-f", "f32le", "-"], { maxBuffer: 1 << 28 });
const x = new Float32Array(raw.buffer, raw.byteOffset, raw.length / 4);
const hop = Math.round(SR / 200); // ~5 ms
const env = [];
for (let i = 0; i + hop * 2 < x.length; i += hop) {
  let s = 0;
  for (let j = 0; j < hop * 2; j++) s += x[i + j] ** 2;
  env.push(Math.sqrt(s / (hop * 2)));
}
const flux = env.map((v, i) => Math.max(0, Math.log(v + 1e-4) - Math.log((env[i - 1] ?? v) + 1e-4)));
const dur = x.length / SR;

// Tempo: comb score over 90..160 BPM in 0.1 steps; phase: best offset for that period.
let best = { score: -1 };
for (let bpm = 90; bpm <= 160; bpm += 0.1) {
  const period = 60 / bpm / (hop / SR);
  for (let ph = 0; ph < period; ph += 1) {
    let s = 0;
    let n = 0;
    for (let k = ph; k < flux.length; k += period) {
      s += flux[Math.round(k)] ?? 0;
      n++;
    }
    const score = s / n;
    if (score > best.score) best = { score, bpm, offset: (ph * hop) / SR };
  }
}
const beat = 60 / best.bpm;
const bars = [];
for (let t = best.offset; t < dur; t += beat * 4) {
  const a = Math.round((t * SR) / hop), b = Math.round(((t + beat * 4) * SR) / hop);
  const seg = env.slice(a, b);
  const rms = Math.sqrt(seg.reduce((s, v) => s + v * v, 0) / Math.max(1, seg.length));
  bars.push(`${t.toFixed(2)}s:${(20 * Math.log10(rms + 1e-9)).toFixed(0)}dB`);
}
console.log(JSON.stringify({ file, duration: +dur.toFixed(2), bpm: +best.bpm.toFixed(2), offset: +best.offset.toFixed(3) }));
console.log("bars", bars.join("  "));
