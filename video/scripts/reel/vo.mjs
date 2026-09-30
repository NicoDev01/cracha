// Speaks each line of src/reel/vo-script.json with Gemini TTS via OpenRouter, then
// has a second model transcribe it, so read-aloud directions or lines that slip
// into English show up before they reach the video.
// Usage: node scripts/reel/vo.mjs [id …]   (no ids: all lines)  →  public/reel/vo/<id>.wav
import { readFileSync } from "node:fs";
import { at, envelope, key, transcribe, writeWav } from "./lib.mjs";

const script = JSON.parse(readFileSync(at("src/reel/vo-script.json")));
const only = process.argv.slice(2);
const lines = script.lines.filter((l) => !only.length || only.includes(l.id));
const RATE = 24000;

async function speak(text) {
  const res = await fetch("https://openrouter.ai/api/v1/audio/speech", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "google/gemini-3.8-flash-tts",
      voice: script.voice,
      input: text,
      response_format: "pcm",
      provider: { options: { google: { speech_metadata: { style: script.style } } } },
    }),
  });
  if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
  const pcm = Buffer.from(await res.arrayBuffer());
  const x = new Float32Array(pcm.length / 2);
  for (let i = 0; i < x.length; i++) x[i] = pcm.readInt16LE(i * 2) / 32768;
  return x;
}

/** Cuts leading and trailing silence (keeps 30 ms before the first sound). */
function trim(x) {
  const env = envelope(x, RATE, 5);
  const peak = Math.max(...env);
  const loud = env.map((v) => v > peak - 40);
  const a = Math.max(0, loud.indexOf(true) - 6);
  const b = Math.min(env.length, loud.lastIndexOf(true) + 16);
  return x.slice(a * 120, b * 120);
}

await Promise.all(
  lines.map(async ({ id, text }) => {
    const x = trim(await speak(text));
    const file = at(`public/reel/vo/${id}.wav`);
    writeWav(file, [x], RATE);
    const verdict = await transcribe(
      file,
      "Transkribiere diese kurze deutsche Aufnahme wortgetreu in einer Zeile. Dann in einer Zeile: Klingt etwas englisch, " +
        "wie eine vorgelesene Regieanweisung, abgehackt oder unnatürlich? Wie wird der Markenname ausgesprochen? Note 1–10.",
    );
    console.log(`=== ${id} (${(x.length / RATE).toFixed(2)} s)  soll: ${text}\n${verdict}\n`);
  }),
);
