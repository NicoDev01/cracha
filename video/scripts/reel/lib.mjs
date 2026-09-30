// Shared helpers for the reel's audio scripts: OpenRouter key, WAV in and out.
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";

export const root = new URL("../../", import.meta.url);
export const at = (p) => new URL(p, root);

export const key =
  process.env.OPENROUTER_API_KEY ??
  readFileSync(new URL("../.env.local", root), "utf8")
    .match(/^OPENROUTER_API_KEY=(.*)$/m)?.[1]
    .trim()
    .replace(/^"|"$/g, "");

export const SR = 48000;

/** Any audio file → mono Float32Array at `rate` (ffmpeg decodes). */
export function readMono(path, rate = SR) {
  const raw = execFileSync("ffmpeg", ["-v", "error", "-i", path, "-ac", "1", "-ar", String(rate), "-f", "f32le", "-"], {
    maxBuffer: 1 << 30,
  });
  return new Float32Array(raw.buffer.slice(raw.byteOffset, raw.byteOffset + raw.length));
}

/** Channels of Float32Array → 16-bit PCM WAV. */
export function writeWav(path, channels, rate = SR) {
  const n = channels[0].length;
  const c = channels.length;
  const data = Buffer.alloc(n * c * 2);
  for (let i = 0; i < n; i++)
    for (let k = 0; k < c; k++) {
      const v = Math.max(-1, Math.min(1, channels[k][i]));
      data.writeInt16LE(Math.round(v * 32767), (i * c + k) * 2);
    }
  const head = Buffer.alloc(44);
  head.write("RIFF", 0);
  head.writeUInt32LE(36 + data.length, 4);
  head.write("WAVEfmt ", 8);
  head.writeUInt32LE(16, 16);
  head.writeUInt16LE(1, 20);
  head.writeUInt16LE(c, 22);
  head.writeUInt32LE(rate, 24);
  head.writeUInt32LE(rate * c * 2, 28);
  head.writeUInt16LE(c * 2, 32);
  head.writeUInt16LE(16, 34);
  head.write("data", 36);
  head.writeUInt32LE(data.length, 40);
  writeFileSync(path, Buffer.concat([head, data]));
}

/** RMS level in dB per `ms` window. */
export function envelope(x, rate, ms = 5) {
  const hop = Math.round((rate * ms) / 1000);
  const env = [];
  for (let i = 0; i + hop <= x.length; i += hop) {
    let s = 0;
    for (let j = 0; j < hop; j++) s += x[i + j] ** 2;
    env.push(20 * Math.log10(Math.sqrt(s / hop) + 1e-7));
  }
  return env;
}

/** Asks an audio model for a verbatim transcript and a short verdict. */
export async function transcribe(path, prompt) {
  const data = readFileSync(path).toString("base64");
  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "google/gemini-3.8-flash",
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: prompt },
            { type: "input_audio", input_audio: { data, format: path.toString().endsWith(".mp3") ? "mp3" : "wav" } },
          ],
        },
      ],
    }),
  });
  const json = await res.json();
  return json.choices?.[0]?.message?.content?.trim() ?? JSON.stringify(json).slice(0, 400);
}
