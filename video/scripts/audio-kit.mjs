// Shared audio building blocks for the ad soundtracks: decoding, placing clips,
// ducking music under a voice, synthesised foley, and writing 16-bit WAVs.
import { execFileSync } from "node:child_process";
import { writeFileSync } from "node:fs";

export const SR = 48000;
export const pub = (f) => new URL(`../public/${f}`, import.meta.url).pathname.replace(/^\/([A-Z]:)/, "$1");

/** Decodes an audio file to two float channels at 48 kHz. */
export const decode = (file) => {
  const raw = execFileSync("ffmpeg", ["-v", "error", "-i", pub(file), "-ac", "2", "-ar", String(SR), "-f", "f32le", "-"], { maxBuffer: 1 << 30 });
  const x = new Float32Array(raw.buffer, raw.byteOffset, raw.length / 4);
  const n = x.length / 2;
  const L = new Float32Array(n);
  const R = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    L[i] = x[2 * i];
    R[i] = x[2 * i + 1];
  }
  return { L, R, n };
};

export const track = (N) => ({ L: new Float32Array(N), R: new Float32Array(N), n: N });

export const writeWav = (file, { L, R, n: N }, gain = 1) => {
  const data = Buffer.alloc(44 + N * 4);
  data.write("RIFF", 0);
  data.writeUInt32LE(36 + N * 4, 4);
  data.write("WAVEfmt ", 8);
  data.writeUInt32LE(16, 16);
  data.writeUInt16LE(1, 20);
  data.writeUInt16LE(2, 22);
  data.writeUInt32LE(SR, 24);
  data.writeUInt32LE(SR * 4, 28);
  data.writeUInt16LE(4, 32);
  data.writeUInt16LE(16, 34);
  data.write("data", 36);
  data.writeUInt32LE(N * 4, 40);
  for (let i = 0; i < N; i++) {
    data.writeInt16LE(Math.round(Math.tanh(L[i] * gain) * 32767), 44 + i * 4);
    data.writeInt16LE(Math.round(Math.tanh(R[i] * gain) * 32767), 46 + i * 4);
  }
  writeFileSync(pub(file), data);
};

/** Copies [from, to) of a source to `at`, with short fades so the cuts do not click. */
export const place = (dst, src, at, from, to, gain = 1, fade = 0.012) => {
  const a = Math.round(from * SR);
  const len = Math.round((to - from) * SR);
  const o = Math.round(at * SR);
  const f = Math.round(fade * SR);
  for (let k = 0; k < len; k++) {
    const i = o + k;
    const j = a + k;
    if (i < 0 || i >= dst.n || j >= src.n) continue;
    const env = Math.min(1, k / f, (len - k) / f) * gain;
    dst.L[i] += src.L[j] * env;
    dst.R[i] += src.R[j] * env;
  }
};

/** Lays the voice clips at their cues and cuts the music parts on bar lines. */
export const voiceAndMusic = (K, N) => {
  const vo = decode(K.vo.file);
  const voice = track(N);
  for (const c of K.vo.clips) place(voice, vo, c.at, c.src[0], c.src[1], 1, 0.02);
  const src = decode(K.music.file);
  const music = track(N);
  for (const p of K.music.parts) place(music, src, p.at, p.from, p.to, 1, 0.01);
  return { voice, music };
};

/** Ducks the music wherever the voice speaks (about −5 dB) and fades it out from `fadeOut`. */
export const duck = (music, clips, fadeOut, N) => {
  const speaking = new Float32Array(N);
  for (const c of clips) {
    const a = Math.round((c.at - 0.08) * SR);
    const b = Math.round((c.at + c.src[1] - c.src[0] + 0.05) * SR);
    for (let i = Math.max(0, a); i < Math.min(N, b); i++) speaking[i] = 1;
  }
  let g = 0;
  const att = 1 - Math.exp(-1 / (0.06 * SR));
  const rel = 1 - Math.exp(-1 / (0.35 * SR));
  const fadeOutAt = Math.round(fadeOut * SR);
  for (let i = 0; i < N; i++) {
    g += (speaking[i] - g) * (speaking[i] > g ? att : rel);
    const d = 1 - 0.45 * g;
    const fo = i > fadeOutAt ? Math.max(0, 1 - (i - fadeOutAt) / (N - fadeOutAt)) : 1;
    music.L[i] *= 0.7 * d * fo;
    music.R[i] *= 0.7 * d * fo;
  }
};

/** Synthesised foley on a track of N samples: whooshes, clicks, keys, pops, thuds, chimes, booms. */
export const foley = (N) => {
  const S = track(N);
  let seed = 7;
  const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647) * 2 - 1;
  function put(t, dur, fn, gain = 1, pan = 0) {
    const s = Math.round(t * SR);
    const n = Math.round(dur * SR);
    const gl = gain * Math.cos(((pan + 1) * Math.PI) / 4);
    const gr = gain * Math.sin(((pan + 1) * Math.PI) / 4);
    for (let k = 0; k < n; k++) {
      const i = s + k;
      if (i < 0 || i >= N) continue;
      const v = fn(k / SR, k);
      S.L[i] += v * gl;
      S.R[i] += v * gr;
    }
  }
  /** Bandpassed noise sweeping from f0 to f1; `t` is where it peaks. */
  function whoosh(t, dur, f0, f1, gain, peak = 0.7, pan = 0) {
    let low = 0;
    let band = 0;
    put(t - dur * peak, dur, (x) => {
      const p = x / dur;
      const f = f0 * Math.pow(f1 / f0, p);
      const q = 2 * Math.sin((Math.PI * Math.min(f, 9000)) / SR);
      const high = rand() - low - 0.6 * band;
      band += q * high;
      low += q * band;
      const env = p < peak ? Math.pow(p / peak, 2) : Math.pow(1 - (p - peak) / (1 - peak), 1.6);
      return band * env;
    }, gain, pan);
  }
  function click(t, gain = 0.5) {
    put(t, 0.05, (x) => (Math.sin(2 * Math.PI * 2300 * x) * 0.6 + rand() * 0.4) * Math.exp(-x * 130), gain);
    put(t, 0.08, (x) => Math.sin(2 * Math.PI * 480 * x) * Math.exp(-x * 60), gain * 0.6);
  }
  function key(t, gain = 0.12) {
    const f = 1800 + rand() * 500;
    put(t, 0.03, (x) => (rand() * 0.7 + Math.sin(2 * Math.PI * f * x) * 0.3) * Math.exp(-x * 240), gain * (0.8 + rand() * 0.3), rand() * 0.25);
    put(t, 0.05, (x) => Math.sin(2 * Math.PI * 220 * x) * Math.exp(-x * 90), gain * 0.5);
  }
  function pop(t, f = 700, gain = 0.3, pan = 0) {
    put(t, 0.14, (x) => Math.sin(2 * Math.PI * f * x * (1 + 1.2 * Math.exp(-x * 40))) * Math.exp(-x * 30), gain, pan);
  }
  function thud(t, gain = 0.5) {
    put(t, 0.3, (x) => Math.sin(2 * Math.PI * (60 + 90 * Math.exp(-x * 30)) * x) * Math.exp(-x * 12), gain);
    put(t, 0.02, () => rand(), gain * 0.2);
  }
  function chime(t, notes, gain = 0.08, gap = 0.07) {
    notes.forEach((f, i) => put(t + i * gap, 0.9, (x) => (Math.sin(2 * Math.PI * f * x) + 0.3 * Math.sin(4 * Math.PI * f * x)) * Math.exp(-x * 5), gain));
  }
  function boom(t, gain = 0.6) {
    put(t, 1.8, (x) => Math.sin(2 * Math.PI * (36 + 70 * Math.exp(-x * 9)) * x) * Math.exp(-x * 2.2), gain);
    put(t, 0.3, (x) => rand() * Math.exp(-x * 16), gain * 0.25);
  }
  const typeOver = (text, a, b, gain) => {
    for (let c = 0; c < text.length; c++) key(a + ((c + 0.3) / text.length) * (b - a) + rand() * 0.01, gain);
  };
  /** Writes the foley normalised to a 0.7 peak. */
  const write = (file) => {
    let peak = 0;
    for (let i = 0; i < N; i++) peak = Math.max(peak, Math.abs(S.L[i]), Math.abs(S.R[i]));
    writeWav(file, S, Math.min(1, 0.7 / peak));
  };
  return { whoosh, click, key, pop, thud, chime, boom, typeOver, write };
};
