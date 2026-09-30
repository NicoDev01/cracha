// Word start times for every voice line, so the on-screen sentences appear word by
// word exactly with the voice. Whisper gives the word times, which are then
// snapped to the nearest onset in the take's loudness (a rise out of a dip).
// Usage: node scripts/reel/words.mjs  →  src/reel/words.json
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { at, envelope, readMono } from "./lib.mjs";

const script = JSON.parse(readFileSync(at("src/reel/vo-script.json")));
const RATE = 16000;

/**
 * Word segments from a local whisper.cpp server (OpenWhispr's binary and model):
 * whisper-server -m ggml-large-v3-turbo.bin -l de -ml 1 -sow -nfa --dtw large.v3.turbo --port 8765
 * Segment starts run a little early towards the end of a line, which reads fine
 * (the word is there as it is spoken); DTW token times were later and less steady.
 */
async function rough(file) {
  const wav = execFileSync("ffmpeg", ["-v", "error", "-i", fileURLToPath(file), "-ar", "16000", "-ac", "1", "-f", "wav", "-"], { maxBuffer: 1 << 28 });
  const form = new FormData();
  form.append("file", new Blob([wav], { type: "audio/wav" }), "a.wav");
  form.append("response_format", "verbose_json");
  const json = await (await fetch("http://127.0.0.1:8765/inference", { method: "POST", body: form })).json();
  return json.segments
    .filter((s) => s.text.trim())
    .map((s) => ({ text: s.text.trim(), start: s.start }));
}

/** Onsets: level rises > 10 dB within 25 ms out of a dip under peak − 16 dB. */
function onsets(x) {
  const env = envelope(x, RATE, 5);
  const peak = Math.max(...env);
  const out = [0];
  for (let i = 5; i < env.length; i++) {
    const low = Math.min(...env.slice(i - 5, i));
    if (low < peak - 16 && env[i] - low > 10 && i * 0.005 - out[out.length - 1] > 0.1) out.push(i * 0.005);
  }
  return out;
}

// Words the picture hits exactly, measured by hand from the takes' loudness
// (node scripts/word-onsets.mjs): the three clicks, the brand name, the click on the source.
const MEASURED = {
  klick: { 1: 0.235, 3: 1.25, 5: 2.345 },
  link: { 1: 0.165 },
  source: { 1: 0.265 },
  brand: { 2: 0.59, 4: 1.68 },
};

const result = {};
for (const { id, text } of script.lines) {
  const file = at(`public/reel/vo/${id}.wav`);
  const words = text.split(/\s+/);
  const segs = await rough(file);
  if (segs.length !== words.length) console.warn(`! ${id}: ${segs.length} segments for ${words.length} words: ${segs.map((x) => x.text).join(" | ")}`);
  const on = onsets(readMono(fileURLToPath(file), RATE));
  let prev = -1;
  result[id] = words.map((w, i) => {
    const r = segs[Math.min(i, segs.length - 1)]?.start ?? prev + 0.2;
    const near = on.filter((o) => Math.abs(o - r) < 0.1 && o > prev + 0.05).sort((a, b) => Math.abs(a - r) - Math.abs(b - r))[0];
    prev = MEASURED[id]?.[i] ?? Math.max(prev + 0.05, near ?? r);
    return { w, t: +prev.toFixed(3) };
  });
  console.log(id.padEnd(7), result[id].map((x) => `${x.w}@${x.t}`).join("  "));
}
writeFileSync(at("src/reel/words.json"), JSON.stringify(result, null, 1) + "\n");
