/**
 * Compares answer models on the real answer pipeline — system prompt, stream
 * reader, list grounding, citation attribution, number re-citation — against
 * live pages of three kinds of knowledge base: a company website, a technical
 * documentation and a wiki. Retrieval is not part of it: the model does not
 * change what retrieval returns, only what is written from it.
 *
 * Skipped unless OPENROUTER_API_KEY is set, so CI never spends money on it:
 *
 *   OPENROUTER_API_KEY=... npx vitest run scripts/model-eval.test.ts
 *
 * Writes every answer with its scores to evals/results/models-<time>.md.
 */
import { mkdirSync, writeFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

import {
  citationAnchors,
  reciteNumbers,
  streamGroundedAnswer,
  type ContextBlock,
} from '../src/lib/server/generation'

const KEY = process.env.OPENROUTER_API_KEY
const MODELS = (process.env.EVAL_MODELS ?? 'deepseek/deepseek-v4.1-flash,openai/gpt-6-luna,qwen/qwen3.8-flash,google/gemini-2.5-flash-lite,meta-llama/llama-4-scout')
  .split(',').map((model) => model.trim()).filter(Boolean)
const REASONING = process.env.EVAL_REASONING ?? 'low'

/** USD per million tokens, input / output, OpenRouter list prices of 28.09.2026 at the hosts we allow. */
const PRICES: Record<string, [number, number]> = {
  'deepseek/deepseek-v4.1-flash': [0.14, 0.42],
  'openai/gpt-6-luna': [0.10, 0.50],
  'qwen/qwen3.8-flash': [0.15, 0.47],
  'google/gemini-2.5-flash-lite': [0.10, 0.40],
  'meta-llama/llama-4-scout': [0.10, 0.30],
}

async function page(url: string): Promise<string> {
  const html = await (await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 CraChaEval' } })).text()
  return html
    .replace(/<(script|style|nav|footer|header|noscript|svg)[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<h([1-3])[^>]*>/gi, (_, level: string) => `\n${'#'.repeat(Number(level))} `)
    .replace(/<li[^>]*>/gi, '\n- ')
    .replace(/<\/(p|div|h[1-6]|li|tr|section|article)>|<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .split('\n').map((line) => line.replace(/[ \t]+/g, ' ').trim()).filter(Boolean)
    .join('\n')
}

interface Case {
  name: string
  question: string
  pages: Array<{ url: string; title: string; collection?: boolean; maxCharacters?: number }>
  /** Facts the answer must contain, each a pattern. */
  expect?: RegExp[]
  /** The sources do not answer this; the answer must say so. */
  unanswerable?: boolean
  /** Items every one of which a complete list must name. */
  items?: string[]
}

const TEAM = ['Christiane Niebuhr-Redder', 'Mark Hapke Reichardt', 'Alena Scholz', 'Kathleen Marx-Colonius', 'Dirk Borchers', 'Volker Redder', 'Astrid Hassenbach', 'Stefan Hartmann', 'Juliane Wippler', 'August Judel', 'Jessica Breier', 'Marco Nölker', 'Frank Hilling', 'Roswitha Galetzkie', 'Petra Goth', 'Mirko Horstmann', 'Stephan Müller', 'Marian Weirich', 'Nicole Haider', 'Ernest Jewczyn', 'Stefan Wien', 'Anna Voitenko', 'Alexander Konermann', 'Klaus Becker', 'Henrik Wolff', 'Johannes Gecer', 'Maria Emilia Montalvo Abad', 'Anastasiia Zhdanova', 'Amir Ali Fakhrabadi', 'Ben Mahrenholz', 'Tanwir Mahdi', 'Fabian Holler']

const CASES: Case[] = [
  {
    name: 'website · team list',
    question: 'Wer ist alles im Team von Webmen?',
    pages: [
      { url: 'https://www.webmen.de/agentur-bremen/team', title: 'Unser Team', collection: true },
      { url: 'https://www.webmen.de/', title: 'Full-Service-Digitalagentur in Bremen', maxCharacters: 8_000 },
    ],
    items: TEAM,
  },
  {
    name: 'website · figures',
    question: 'Wie viele Kunden betreut Webmen und seit wann gibt es die Agentur?',
    pages: [
      { url: 'https://www.webmen.de/', title: 'Full-Service-Digitalagentur in Bremen', maxCharacters: 10_000 },
      { url: 'https://www.webmen.de/online-marketing/strategie-workshops', title: 'Online Marketing Workshops & Schulungen', maxCharacters: 5_000 },
    ],
    expect: [/400/, /1996/],
  },
  {
    name: 'website · not in sources',
    question: 'Was kostet ein Online-Shop bei Webmen genau?',
    pages: [
      { url: 'https://www.webmen.de/', title: 'Full-Service-Digitalagentur in Bremen', maxCharacters: 8_000 },
      { url: 'https://www.webmen.de/online-marketing/strategie-workshops', title: 'Online Marketing Workshops & Schulungen', maxCharacters: 4_000 },
    ],
    unanswerable: true,
  },
  {
    name: 'docs · how-to',
    question: 'Wie spiele ich mit three.js eine Animation ab und blende sie in eine andere über?',
    pages: [
      { url: 'https://threejs.org/docs/pages/AnimationMixer.html', title: 'AnimationMixer - Three.js Docs' },
      { url: 'https://threejs.org/docs/pages/AnimationAction.html', title: 'AnimationAction - Three.js Docs', maxCharacters: 9_000 },
      { url: 'https://threejs.org/docs/pages/AnimationClip.html', title: 'AnimationClip - Three.js Docs', maxCharacters: 5_000 },
    ],
    expect: [/clipAction/, /play\(\)/, /crossFade(To|From)/],
  },
  {
    name: 'docs · english question',
    question: 'What does PropertyBinding.sanitizeNodeName do?',
    pages: [{ url: 'https://threejs.org/docs/pages/PropertyBinding.html', title: 'PropertyBinding - Three.js Docs' }],
    expect: [/sanitizeNodeName/, /parseTrackName/],
  },
  {
    name: 'wiki · facts',
    question: 'Wann wurde die Universität Bremen gegründet und wie viele Studierende hat sie?',
    pages: [{ url: 'https://de.wikipedia.org/api/rest_v1/page/html/Universit%C3%A4t_Bremen', title: 'Universität Bremen – Wikipedia', maxCharacters: 12_000 }],
    expect: [/1971/],
  },
]

interface Score {
  ok: boolean
  seconds: number
  firstTokenSeconds: number
  costPer1000: number
  coverage: number
  wrongNumbers: number
  badMarkers: number
  foreignScript: boolean
  facts: string
  text: string
  usedModel: string
}

const FACTUAL_LINE = /\p{L}{3}.*\p{L}{3}/u

function score(text: string, blocks: ContextBlock[], test: Case): Omit<Score, 'ok' | 'seconds' | 'firstTokenSeconds' | 'costPer1000' | 'usedModel' | 'text'> {
  const lines = text.split('\n').map((line) => line.trim()).filter((line) => line && !/^#/.test(line) && !/^\|?\s*-{3}/.test(line))
  const factual = lines.filter((line) => FACTUAL_LINE.test(line) && line.replace(/^([-*+]|\d+[.)])\s+/u, '').length >= 20 && !line.endsWith(':'))
  const cited = factual.filter((line) => /\[\d+/.test(line))
  const numbers = new Set(blocks.map((block) => block.n))
  const markers = [...text.matchAll(/\[(\d+)\]/g)].map((match) => Number(match[1]))
  let wrongNumbers = 0
  for (const line of cited) {
    const figures = line.replace(/\[\d+(?:,\s*\d+)*\]/g, '').replace(/^\s*\d+[.)]\s+/u, '').match(/\d{2,}/g) ?? []
    const citedBlocks = [...line.matchAll(/\[(\d+)\]/g)].map((match) => blocks.find((block) => block.n === Number(match[1]))).filter(Boolean) as ContextBlock[]
    if (figures.some((figure) => !citedBlocks.some((block) => block.text.includes(figure)))) wrongNumbers += 1
  }
  const found = test.items ? test.items.filter((item) => text.includes(item)).length : 0
  const facts = test.items
    ? `${found}/${test.items.length} Namen${/\beinige\b/i.test(text) ? ', sagt "einige"' : ''}`
    : test.unanswerable
      ? (/(nicht|keine)\b.{0,80}(angegeben|genannt|enthalten|finden|Information|Angabe|Preis)/i.test(text) ? 'sagt ehrlich: nicht belegt' : 'ERFINDET oder weicht aus')
      : `${(test.expect ?? []).filter((pattern) => pattern.test(text)).length}/${test.expect?.length ?? 0} Fakten`
  return {
    coverage: factual.length ? cited.length / factual.length : 1,
    wrongNumbers,
    badMarkers: markers.filter((n) => !numbers.has(n)).length,
    foreignScript: /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Cyrillic}\p{Script=Arabic}]/u.test(text),
    facts,
  }
}

async function contextFor(test: Case): Promise<{ context: string; blocks: ContextBlock[] }> {
  const blocks: ContextBlock[] = []
  for (const [index, source] of test.pages.entries()) {
    const text = (await page(source.url)).slice(0, source.maxCharacters ?? 30_000)
    blocks.push({ n: index + 1, title: source.title, url: source.url, text, ...(source.collection ? { collection: true, authoritative: true } : {}) })
  }
  const context = blocks.map((block) => `[${block.n}] ${block.title}\nURL: ${block.url}${block.collection ? '\nsource_type: collection_page_complete' : ''}\n${block.text}`).join('\n\n---\n\n')
  return { context, blocks }
}

async function run(model: string, test: Case, context: string, blocks: ContextBlock[]): Promise<Score> {
  const started = Date.now()
  let firstToken = 0
  let answer = ''
  let usedModel = model
  try {
    const result = await streamGroundedAnswer({ model, question: test.question, history: [], context, blocks, openRouterKey: KEY, reasoning: REASONING })
    usedModel = result.usedModel
    for await (const delta of result.text) {
      if (!firstToken) firstToken = Date.now()
      answer += delta
    }
  } catch (error) {
    return { ok: false, seconds: (Date.now() - started) / 1000, firstTokenSeconds: 0, costPer1000: 0, coverage: 0, wrongNumbers: 0, badMarkers: 0, foreignScript: false, facts: `Fehler: ${error instanceof Error ? error.message : String(error)}`, text: '', usedModel }
  }
  const final = reciteNumbers(answer, blocks)
  citationAnchors(final, blocks)
  const [input, output] = PRICES[model] ?? [0, 0]
  // About 3.5 characters per token for German and English prose.
  const cost = ((context.length + 9_000) / 3.5 / 1e6) * input + (final.length / 3.5 / 1e6) * output
  return {
    ok: usedModel === model,
    seconds: (Date.now() - started) / 1000,
    firstTokenSeconds: firstToken ? (firstToken - started) / 1000 : 0,
    costPer1000: cost * 1000,
    usedModel,
    text: final,
    ...score(final, blocks, test),
  }
}

describe.skipIf(!KEY)('answer models on the real pipeline', () => {
  it('scores every model on every case', async () => {
    const report: string[] = [`# Modellvergleich ${new Date().toISOString()}`, '', `Reasoning: ${REASONING}`, '']
    const rows: string[] = ['| Fall | Modell | ok | Zeit s (1. Token) | $/1000 | belegt | falsche Zahlen | Fakten |', '|---|---|---|---|---|---|---|---|']
    const totals = new Map<string, { coverage: number; seconds: number; cost: number; failures: number; wrong: number }>()
    for (const test of CASES) {
      const { context, blocks } = await contextFor(test)
      const results = await Promise.all(MODELS.map((model) => run(model, test, context, blocks)))
      results.forEach((result, index) => {
        const model = MODELS[index]
        const total = totals.get(model) ?? { coverage: 0, seconds: 0, cost: 0, failures: 0, wrong: 0 }
        total.coverage += result.coverage / CASES.length
        total.seconds += result.seconds / CASES.length
        total.cost += result.costPer1000 / CASES.length
        total.failures += result.ok ? 0 : 1
        total.wrong += result.wrongNumbers + result.badMarkers
        totals.set(model, total)
        rows.push(`| ${test.name} | ${model} | ${result.ok ? '✓' : `✗ ${result.usedModel}`} | ${result.seconds.toFixed(1)} (${result.firstTokenSeconds.toFixed(1)}) | ${result.costPer1000.toFixed(2)} | ${Math.round(result.coverage * 100)} % | ${result.wrongNumbers + result.badMarkers} | ${result.facts}${result.foreignScript ? ', FREMDSCHRIFT' : ''} |`)
        report.push(`## ${test.name} · ${model}`, '', `> ${test.question}`, '', result.text || '(keine Antwort)', '')
      })
    }
    const summary = ['| Modell | Ø belegt | Ø Zeit s | Ø $/1000 | Fehlschläge | falsche Zahlen/Marker |', '|---|---|---|---|---|---|',
      ...[...totals.entries()].map(([model, total]) => `| ${model} | ${Math.round(total.coverage * 100)} % | ${total.seconds.toFixed(1)} | ${total.cost.toFixed(2)} | ${total.failures} | ${total.wrong} |`)]
    mkdirSync('evals/results', { recursive: true })
    const file = `evals/results/models-${new Date().toISOString().replace(/[:.]/g, '-')}.md`
    writeFileSync(file, [...summary, '', ...rows, '', ...report].join('\n'))
    console.log([...summary, '', ...rows, '', `Antworten: ${file}`].join('\n'))
    expect(totals.size).toBe(MODELS.length)
  }, 600_000)
})
