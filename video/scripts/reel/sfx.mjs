// Synthesizes whooshes, clicks, key taps and pops from the times in src/reel/cues.json,
// without any audio files, then mixes them with the voice and the music.
// Usage: node scripts/reel/sfx.mjs  →  public/reel/sfx.wav, public/reel/mix.wav
import { execFileSync } from "node:child_process";
import { readFileSync, unlinkSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { SR, at, envelope, readMono, writeWav } from "./lib.mjs";

const cues = JSON.parse(readFileSync(at("src/reel/cues.json")));
const { t, m, duration } = cues;
const N = Math.ceil(duration * SR);
const L = new Float32Array(N);
const R = new Float32Array(N);

let seed = 11;
const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647) * 2 - 1;

function svf() {
  let ic1 = 0,
    ic2 = 0;
  return (x, fc, q = 0.7) => {
    const g = Math.tan((Math.PI * Math.min(fc, SR * 0.45)) / SR);
    const k = 1 / q;
    const a1 = 1 / (1 + g * (g + k));
    const v3 = x - ic2;
    const v1 = a1 * ic1 + g * a1 * v3;
    const v2 = ic2 + g * v1;
    ic1 = 2 * v1 - ic1;
    ic2 = 2 * v2 - ic2;
    return { lp: v2, bp: v1, hp: x - k * v1 - v2 };
  };
}

/** Renders `len` seconds of fn(x, i) at `time`, panned -1…1. */
function put(time, len, fn, pan = 0) {
  const s = Math.round(time * SR);
  const gl = Math.cos(((pan + 1) * Math.PI) / 4) * Math.SQRT2;
  const gr = Math.sin(((pan + 1) * Math.PI) / 4) * Math.SQRT2;
  for (let i = 0; i < len * SR; i++) {
    const v = fn(i / SR, i);
    if (s + i >= 0 && s + i < N) {
      L[s + i] += v * gl;
      R[s + i] += v * gr;
    }
  }
}

const click = (time, g = 1) => {
  const f = svf();
  put(time, 0.05, (x) => {
    const n = f(rnd(), 3500, 1.5).bp * Math.exp(-x * 400) * 0.9;
    const tone = Math.sin(2 * Math.PI * 2100 * x) * Math.exp(-x * 120) * 0.25;
    return (n + tone) * g;
  });
};

const key = (time, g = 1) => {
  const f = svf();
  const fc = 2200 + 1400 * Math.abs(rnd());
  const gain = (0.5 + 0.35 * Math.abs(rnd())) * g;
  put(time, 0.04, (x) => f(rnd(), fc, 2).bp * Math.exp(-x * 170) * gain, rnd() * 0.3);
};

const pop = (time, g = 1, from = 420, to = 980) => {
  let ph = 0;
  put(time, 0.12, (x) => {
    ph += (2 * Math.PI * (from + (to - from) * Math.min(1, x / 0.05))) / SR;
    return Math.sin(ph) * Math.exp(-x * 38) * (x < 0.003 ? x / 0.003 : 1) * 0.45 * g;
  });
};

const tick = (time, g = 1, hz = 1800) =>
  put(time, 0.05, (x) => Math.sin(2 * Math.PI * hz * x) * Math.exp(-x * 110) * 0.22 * g, rnd() * 0.6);

/** Air moving past: band-passed noise with a bell envelope and a filter sweep. */
const whoosh = (time, len = 0.4, g = 1, up = true, pan = 0) => {
  const fl = svf();
  put(
    time - len * 0.55,
    len,
    (x) => {
      const p = x / len;
      const bell = Math.sin(Math.PI * p) ** 2;
      const fc = up ? 350 * 9 ** p : 3200 * (1 / 9) ** p;
      return fl(rnd(), fc, 1.3).bp * bell * 0.55 * g;
    },
    pan,
  );
};

const thud = (time) => {
  [0, 0.12].forEach((d, k) => {
    let ph = 0;
    put(time + d, 0.18, (x) => {
      ph += (2 * Math.PI * (k ? 262 : 330)) / SR;
      return Math.sin(ph) * Math.exp(-x * 22) * 0.3;
    });
  });
};

const marker = (from, to) => {
  const f = svf();
  put(from, to - from, (x) => {
    const p = x / (to - from);
    return f(rnd(), 1800 + 1500 * p, 0.9).bp * Math.sin(Math.PI * p) * 0.22;
  });
};

const sparkle = (time) => {
  for (let k = 0; k < 9; k++) {
    const hz = 2400 + 2600 * Math.abs(rnd());
    const d = Math.abs(rnd()) * 0.5;
    put(time + d, 0.2, (x) => Math.sin(2 * Math.PI * hz * x) * Math.exp(-x * 30) * 0.1, rnd());
  }
};

const typing = ([from, to], chars) => {
  for (let k = 0; k < chars; k++) key(from + ((to - from) * k) / Math.max(1, chars - 1) + rnd() * 0.012);
};

// ---- the sheet ----
const PAGES = cues.pages;
// Tabs piling up: a click and three soft pops per "klickst".
t.tabs.forEach((c) => {
  click(c);
  [0, 0.09, 0.18].forEach((d, k) => pop(c + d, 0.55, 500 + k * 120, 900 + k * 150));
});
whoosh(t.nichts + 0.3, 0.6, 0.8, false);
pop(t.nichtsOut + 0.1, 0.4, 900, 500);

pop(m.drop, 0.9);
whoosh(t.field + 0.2, 0.4, 0.6);
typing(t.type, cues.text.domain.length);
click(t.submit);
pop(t.submit + 0.06, 0.9);
whoosh(t.hub + 0.25, 0.45, 0.7);
// Pages pop in the order they appear (their slots are shuffled round the ring).
for (let k = 0; k < PAGES; k++) {
  const at = t.pages[0] + ((t.pages[1] - t.pages[0]) * ((k * 5) % PAGES)) / (PAGES - 1);
  whoosh(at + 0.12, 0.22, 0.25, true, Math.cos(-Math.PI / 2 + (k / PAGES) * Math.PI * 2));
  pop(at + 0.15, 0.45, 600 + ((k * 5) % PAGES) * 40, 1100 + ((k * 5) % PAGES) * 50);
}
whoosh(t.gather[0] + 0.1, 0.9, 0.7, false);
for (let k = 0; k < PAGES; k++) tick(t.gather[0] + ((t.gather[1] - t.gather[0]) * k) / (PAGES - 1), 0.7, 2400 - k * 50);
pop(t.kb, 1.1);
whoosh(t.askField + 0.25, 0.45, 0.7);
typing(t.typeQ, cues.text.question.length);
click(t.send);
whoosh(t.qUp + 0.25, 0.4, 0.6);
for (let x = t.answer[0]; x < t.answer[1]; x += 0.09) tick(x, 0.25, 2600);
pop(t.cite, 0.9);
pop(t.sourceChip + 0.05, 0.6);
click(t.sourceClick);
whoosh(t.sourceOpen + 0.3, 0.55, 0.8);
marker(t.mark[0], t.mark[1]);
whoosh(t.sourceOut + 0.25, 0.5, 0.7, false);
pop(cues.vo.find((v) => v.id === "brand").at + 0.59, 1);
whoosh(t.endLogo + 0.2, 0.45, 0.5);
pop(t.url, 0.8);
click(t.ctaClick);
sparkle(t.ctaClick + 0.03);

writeWav(at("public/reel/sfx.wav"), [L, R]);

// ---- mix: voice on its cues, music ducked under the voice, effects on top ----
const music = [0, 1].map((ch) => {
  const raw = execFileSync(
    "ffmpeg",
    ["-v", "error", "-i", fileURLToPath(at("public/reel/music.wav")), "-af", `pan=mono|c0=c${ch}`, "-ar", String(SR), "-f", "f32le", "-"],
    { maxBuffer: 1 << 30 },
  );
  return new Float32Array(raw.buffer.slice(raw.byteOffset, raw.byteOffset + raw.length));
});
const voice = new Float32Array(N);
for (const { id, at: start } of cues.vo) {
  const x = readMono(fileURLToPath(at(`public/reel/vo/${id}.wav`)));
  const s = Math.round(start * SR);
  for (let i = 0; i < x.length && s + i < N; i++) voice[s + i] += x[i];
}
// Duck: −6 dB while the voice speaks, 40 ms in, 300 ms out.
const env = envelope(voice, SR, 10);
const speaking = env.map((v) => v > -45);
const duck = new Float32Array(N);
let g = 1;
const hop = SR / 100;
for (let i = 0; i < N; i++) {
  const target = speaking[Math.min(speaking.length - 1, Math.floor(i / hop))] ? 0.5 : 1;
  const rate = target < g ? 1 / (0.04 * SR) : 1 / (0.3 * SR);
  g += Math.sign(target - g) * Math.min(Math.abs(target - g), rate);
  duck[i] = g;
}
const outL = new Float32Array(N);
const outR = new Float32Array(N);
for (let i = 0; i < N; i++) {
  const m = 0.42 * duck[i];
  outL[i] = voice[i] * 0.9 + (music[0][i] ?? 0) * m + L[i] * 0.75;
  outR[i] = voice[i] * 0.9 + (music[1][i] ?? 0) * m + R[i] * 0.75;
}
const raw = fileURLToPath(at("public/reel/mix-raw.wav"));
writeWav(raw, [outL, outR]);
execFileSync("ffmpeg", ["-v", "error", "-y", "-i", raw, "-af", "loudnorm=I=-14:TP=-1:LRA=9", "-ar", String(SR), fileURLToPath(at("public/reel/mix.wav"))]);
unlinkSync(raw);
console.log("public/reel/sfx.wav, public/reel/mix.wav");
