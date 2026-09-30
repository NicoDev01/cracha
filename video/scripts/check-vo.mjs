// Transcribes the voice-over clips, to check that the voice says exactly the
// script and nothing else (no stage directions read aloud).
// Usage: node scripts/check-vo.mjs [lineId …]
import { readFileSync } from "node:fs";

const root = new URL("../", import.meta.url);
const key =
  process.env.OPENROUTER_API_KEY ??
  readFileSync(new URL("../.env.local", root), "utf8").match(/^OPENROUTER_API_KEY=(.*)$/m)?.[1].trim().replace(/^"|"$/g, "");
const meta = JSON.parse(readFileSync(new URL("src/explainer/vo.json", root)));
const ids = process.argv.slice(2).length ? process.argv.slice(2) : Object.keys(meta);

for (const id of ids) {
  const data = readFileSync(new URL(`public/vo/${id}.wav`, root)).toString("base64");
  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "google/gemini-3.8-flash",
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: "Transkribiere diese deutsche Audioaufnahme wortgetreu. Gib nur den gesprochenen Text aus. Beschreibe danach in einer Zeile nach '|' die Sprechweise (Tempo, Energie, Aussprache auffälliger Wörter)." },
            { type: "input_audio", input_audio: { data, format: "wav" } },
          ],
        },
      ],
    }),
  });
  const json = await res.json();
  console.log(`${id}: ${json.choices?.[0]?.message?.content?.trim() ?? JSON.stringify(json).slice(0, 300)}`);
}
