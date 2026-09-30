// Lists word onsets inside a stretch of a voice take from its loudness: a word
// starts where the level rises after a dip (a pause or a plosive closure like the k in "klickst").
// Usage: node scripts/word-onsets.mjs take.wav from to
import { execFileSync } from "node:child_process";

const [file, from, to] = process.argv.slice(2);
const SR = 16000;
const raw = execFileSync("ffmpeg", ["-v", "error", "-i", file, "-ss", from, "-to", to, "-ac", "1", "-ar", String(SR), "-f", "f32le", "-"]);
const x = new Float32Array(raw.buffer, raw.byteOffset, raw.length / 4);
const hop = SR / 200; // 5 ms
const env = [];
for (let i = 0; i + hop <= x.length; i += hop) {
  let s = 0;
  for (let j = 0; j < hop; j++) s += x[i + j] ** 2;
  env.push(20 * Math.log10(Math.sqrt(s / hop) + 1e-6));
}
const peak = Math.max(...env);
// Onset: level jumps by > 12 dB within 25 ms out of a dip at least 18 dB under the peak.
const out = [];
for (let i = 5; i < env.length; i++) {
  const low = Math.min(...env.slice(i - 5, i));
  if (low < peak - 18 && env[i] - low > 12 && (!out.length || i * 0.005 - out[out.length - 1] > 0.12)) out.push(i * 0.005);
}
console.log(out.map((t) => (t + Number(from)).toFixed(3)).join("  "));
// A coarse level strip, 20 ms per character, for eyeballing.
let strip = "";
for (let i = 0; i < env.length; i += 4) strip += " .:-=+*#%@"[Math.max(0, Math.min(9, Math.round((env[i] - peak + 45) / 5)))];
console.log(strip);
