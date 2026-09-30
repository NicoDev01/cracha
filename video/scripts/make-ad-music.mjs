// Generates the ad's music with Lyria 3 via OpenRouter.
// Usage: node scripts/make-ad-music.mjs  →  public/ad-music.<ext>
// Afterwards run scripts/beat-grid.mjs and put bpm/offset into src/ad/cues.json.
import { readFileSync, writeFileSync } from "node:fs";

const root = new URL("../", import.meta.url);
const key =
  process.env.OPENROUTER_API_KEY ??
  readFileSync(new URL("../.env.local", root), "utf8").match(/^OPENROUTER_API_KEY=(.*)$/m)?.[1].trim().replace(/^"|"$/g, "");

const PROMPT =
  "Instrumental only, no vocals. A 32-second modern tech product ad track at exactly 120 BPM, 4/4, for fast kinetic-typography motion graphics. " +
  "Punchy, confident, cool and friendly, like a premium SaaS launch video. " +
  "0-6 s: driving tense intro, tight kick on every beat, crisp closed hi-hats, a filtered bass pulse, rising tension. " +
  "6-8 s: one-bar riser that stops dead for a beat. " +
  "8-16 s: stripped-down groove, muted kick, plucky synth arpeggio, lots of space for UI click sound effects. " +
  "16 s: big clean drop: full punchy kick, clap on 2 and 4, bright synth chords, bouncy bass, catchy hook. " +
  "24-28 s: highest energy, stutter fills on every beat. " +
  "28-32 s: final impact hit and a clean ringing chord that fades out. Crisp modern mix, no long reverb tails.";

const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
  method: "POST",
  headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
  body: JSON.stringify({
    model: "google/lyria-3-pro-preview",
    modalities: ["text", "audio"],
    audio: { format: "wav" },
    stream: true,
    messages: [{ role: "user", content: PROMPT }],
  }),
});
if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);

const chunks = [];
let text = "";
let buf = "";
const decoder = new TextDecoder();
for await (const part of res.body) {
  buf += decoder.decode(part, { stream: true });
  let nl;
  while ((nl = buf.indexOf("\n")) >= 0) {
    const line = buf.slice(0, nl).trim();
    buf = buf.slice(nl + 1);
    if (!line.startsWith("data:") || line === "data: [DONE]") continue;
    const json = JSON.parse(line.slice(5));
    const delta = json.choices?.[0]?.delta ?? {};
    if (delta.audio?.data) chunks.push(Buffer.from(delta.audio.data, "base64"));
    if (delta.content) text += delta.content;
    if (json.error) throw new Error(JSON.stringify(json.error));
  }
}
const audio = Buffer.concat(chunks);
const ext = audio.subarray(0, 4).toString() === "RIFF" ? "wav" : audio.subarray(0, 3).toString() === "ID3" || audio[0] === 0xff ? "mp3" : "bin";
const out = process.argv[2] ?? `public/ad-music.${ext}`;
writeFileSync(new URL(out, root), audio);
console.log(`${out}: ${(audio.length / 1e6).toFixed(2)} MB`, text.slice(0, 300));
