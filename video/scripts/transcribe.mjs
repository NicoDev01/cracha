// Transcribes audio files with an audio model via OpenRouter, to check that the
// voice says exactly the script (no stage directions, no English) and is easy to follow.
// Usage: node scripts/transcribe.mjs file.wav [file2.wav …]
import { readFileSync } from "node:fs";

const root = new URL("../", import.meta.url);
const key =
  process.env.OPENROUTER_API_KEY ??
  readFileSync(new URL("../.env.local", root), "utf8").match(/^OPENROUTER_API_KEY=(.*)$/m)?.[1].trim().replace(/^"|"$/g, "");

await Promise.all(
  process.argv.slice(2).map(async (file) => {
    const data = readFileSync(new URL(file, root)).toString("base64");
    const format = file.endsWith(".mp3") ? "mp3" : "wav";
    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3.8-flash",
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "Transkribiere diese deutsche Audioaufnahme wortgetreu, Satz für Satz mit ungefährer Startzeit in Sekunden. Danach: Bewerte in 2 Zeilen Verständlichkeit, Natürlichkeit, Energie und Aussprache auffälliger Wörter (z. B. Markennamen), und ob irgendetwas Englisch oder wie eine vorgelesene Regieanweisung klingt. Note 1–10.",
              },
              { type: "input_audio", input_audio: { data, format } },
            ],
          },
        ],
      }),
    });
    const json = await res.json();
    console.log(`=== ${file}\n${json.choices?.[0]?.message?.content?.trim() ?? JSON.stringify(json).slice(0, 300)}\n`);
  }),
);
