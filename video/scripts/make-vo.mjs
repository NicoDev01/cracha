// Speaks every voice-over line of the explainer with Gemini TTS via OpenRouter
// and records each clip's length, so the picture can be timed to the voice.
// Usage: node scripts/make-vo.mjs [lineId …]  →  public/vo/<id>.wav, src/explainer/vo.json
// Needs OPENROUTER_API_KEY (read from the environment or ../.env.local).
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";

const MODEL = "google/gemini-3.8-flash-tts";
const VOICE = process.env.VO_VOICE ?? "Puck";
const RATE = 24000; // Gemini returns 16-bit mono PCM at 24 kHz
const STYLE =
  "Sprich als moderner deutscher Werbesprecher: energiegeladen, warm, zügig, aber klar verständlich, mit natürlichen Betonungen";

const root = new URL("../", import.meta.url);
const script = JSON.parse(readFileSync(new URL("src/explainer/vo-script.json", root)));
const key =
  process.env.OPENROUTER_API_KEY ??
  readFileSync(new URL("../.env.local", root), "utf8").match(/^OPENROUTER_API_KEY=(.*)$/m)?.[1].trim().replace(/^"|"$/g, "");
if (!key) throw new Error("OPENROUTER_API_KEY fehlt");

const only = process.argv.slice(2);
const outDir = new URL("public/vo/", root);
mkdirSync(outDir, { recursive: true });
const metaUrl = new URL("src/explainer/vo.json", root);
const meta = existsSync(metaUrl) ? JSON.parse(readFileSync(metaUrl)) : {};

const wav = (pcm) => {
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
  return Buffer.concat([head, pcm]);
};

// Trims leading and trailing silence so a clip starts on its first syllable.
const trim = (pcm) => {
  const n = pcm.length / 2;
  const loud = (i) => Math.abs(pcm.readInt16LE(i * 2)) > 600;
  let a = 0;
  while (a < n && !loud(a)) a++;
  let b = n - 1;
  while (b > a && !loud(b)) b--;
  a = Math.max(0, a - RATE * 0.02);
  b = Math.min(n - 1, b + RATE * 0.08);
  return pcm.subarray(Math.floor(a) * 2, Math.floor(b) * 2);
};

for (const line of script.lines) {
  if (only.length && !only.includes(line.id)) continue;
  const res = await fetch("https://openrouter.ai/api/v1/audio/speech", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model: MODEL, voice: VOICE, response_format: "pcm", input: line.text }),
  });
  if (!res.ok) throw new Error(`${line.id}: ${res.status} ${await res.text()}`);
  const pcm = trim(Buffer.from(await res.arrayBuffer()));
  writeFileSync(new URL(`${line.id}.wav`, outDir), wav(pcm));
  meta[line.id] = { text: line.text, duration: +(pcm.length / 2 / RATE).toFixed(3) };
  console.log(`${line.id}: ${meta[line.id].duration} s  ${line.text}`);
}
writeFileSync(metaUrl, JSON.stringify(meta, null, 2) + "\n");
