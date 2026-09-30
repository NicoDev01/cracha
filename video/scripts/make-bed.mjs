// Generates the explainer's music bed with Lyria 3 via OpenRouter.
// Usage: node scripts/make-bed.mjs  →  public/explainer-bed.<ext>
import { readFileSync, writeFileSync } from "node:fs";

const root = new URL("../", import.meta.url);
const key =
  process.env.OPENROUTER_API_KEY ??
  readFileSync(new URL("../.env.local", root), "utf8").match(/^OPENROUTER_API_KEY=(.*)$/m)?.[1].trim().replace(/^"|"$/g, "");

const PROMPT =
  "Instrumental only, no vocals. Modern, bright tech product launch music at 120 BPM for a 45-second explainer with a voice-over. " +
  "Starts sparse and mysterious (soft plucks, ticking hi-hat), a short tense build, then a clean uplifting drop with punchy but soft kick, " +
  "warm synth bass, airy pads and a catchy marimba-like pluck motif. Leaves room for speech in the mids. Ends on a confident resolved chord.";

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
writeFileSync(new URL(`public/explainer-bed.${ext}`, root), audio);
console.log(`public/explainer-bed.${ext}: ${(audio.length / 1e6).toFixed(2)} MB`, text.slice(0, 300));
