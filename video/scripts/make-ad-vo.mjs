// Speaks the whole ad script as one take with Gemini TTS via OpenRouter (one take
// sounds far more natural than line by line) and lists its phrases, so they can be
// placed on the beat in src/ad/cues.json (vo.clips).
// Usage: node scripts/make-ad-vo.mjs [script.json] [out.wav]  →  default: src/ad/vo-script.json, public/ad-vo-take-new.wav
import { readFileSync, writeFileSync } from "node:fs";

const root = new URL("../", import.meta.url);
const sc = JSON.parse(readFileSync(new URL(process.argv[2] ?? "src/ad/vo-script.json", root)));
const out = process.argv[3] ?? "public/ad-vo-take-new.wav";
const key =
  process.env.OPENROUTER_API_KEY ??
  readFileSync(new URL("../.env.local", root), "utf8").match(/^OPENROUTER_API_KEY=(.*)$/m)?.[1].trim().replace(/^"|"$/g, "");
const RATE = 24000;

const res = await fetch("https://openrouter.ai/api/v1/audio/speech", {
  method: "POST",
  headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
  body: JSON.stringify({
    model: "google/gemini-3.8-flash-tts",
    voice: sc.voice,
    input: sc.lines.join("\n\n"),
    response_format: "pcm",
    provider: { options: { google: { speech_metadata: { style: sc.style } } } },
  }),
});
if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
const pcm = Buffer.from(await res.arrayBuffer());
const head = Buffer.alloc(44);
head.write("RIFF", 0);
head.writeUInt32LE(36 + pcm.length, 4);
head.write("WAVEfmt ", 8);
head.writeUInt32LE(16, 16);
head.writeUInt16LE(1, 20);
head.writeUInt16LE(1, 22);
head.writeUInt32LE(RATE, 24);
head.writeUInt32LE(RATE * 2, 28);
head.writeUInt16LE(2, 32);
head.writeUInt16LE(16, 34);
head.write("data", 36);
head.writeUInt32LE(pcm.length, 40);
writeFileSync(new URL(out, root), Buffer.concat([head, pcm]));

// Phrases: runs of sound separated by at least 0.3 s of quiet (10 ms frames).
const hop = RATE / 100;
const env = [];
for (let i = 0; i + hop <= pcm.length / 2; i += hop) {
  let s = 0;
  for (let j = 0; j < hop; j++) s += pcm.readInt16LE((i + j) * 2) ** 2;
  env.push(Math.sqrt(s / hop));
}
const peak = Math.max(...env);
let start = -1;
let quiet = 0;
env.forEach((v, i) => {
  if (v > peak * 0.04) {
    if (start < 0) start = i;
    quiet = 0;
  } else if (start >= 0 && ++quiet >= 30) {
    console.log(`[${Math.max(0, start - 3) / 100}, ${(i - quiet + 9) / 100}]`);
    start = -1;
    quiet = 0;
  }
});
if (start >= 0) console.log(`[${Math.max(0, start - 3) / 100}, ${env.length / 100}]`);
console.log(`${out} – anhören, dann übernehmen und vo.clips anpassen`);
