/**
 * Checks a Google AI Studio key from the browser and lists the Gemini models it
 * can use. The request goes straight to Google (the API allows cross-origin
 * calls), so the key is verified without passing through our server, and the
 * model list is what this key can actually reach instead of names we guessed.
 */

import type { Locale } from '@/i18n/routing'

export interface GeminiModelOption {
  id: string
  label: string
}

export type KeyCheck =
  | { ok: true; models: GeminiModelOption[] }
  | { ok: false; message: string; keyRejected: boolean }

/** Offered before a key was checked, and first in the list after. */
export const PREFERRED_GEMINI_MODELS: GeminiModelOption[] = [
  { id: 'gemini-3.8-flash', label: 'Gemini 3.8 Flash (empfohlen)' },
  { id: 'gemini-3.7-flash', label: 'Gemini 3.7 Flash' },
  { id: 'gemini-3.5-flash-lite', label: 'Gemini 3.5 Flash-Lite (schnell, günstig)' },
]

const PREFERRED_LABELS_EN: Record<string, string> = {
  'gemini-3.8-flash': 'Gemini 3.8 Flash (recommended)',
  'gemini-3.5-flash-lite': 'Gemini 3.5 Flash-Lite (fast, low cost)',
}

/** The preferred models with labels in the page language. */
export function preferredGeminiModels(locale: Locale): GeminiModelOption[] {
  return locale === 'en'
    ? PREFERRED_GEMINI_MODELS.map((model) => ({ ...model, label: PREFERRED_LABELS_EN[model.id] ?? model.label }))
    : PREFERRED_GEMINI_MODELS
}

const KEY_MESSAGES = {
  de: {
    unreachable: 'Google ist gerade nicht erreichbar. Prüfe deine Verbindung oder einen Werbeblocker.',
    noTextModel: 'Der Key ist gültig, aber Google bietet ihm kein Gemini-Textmodell an.',
    unknownKey: 'Google kennt diesen Key nicht. Prüfe, ob er vollständig kopiert wurde.',
    forbidden: 'Der Key darf die Gemini API nicht nutzen.',
    region: 'Google lässt die Gemini API für diesen Key hier nicht zu (Region oder Abrechnung).',
    quota: 'Das Kontingent dieses Keys ist gerade erschöpft.',
    other: (status: number) => `Google meldet einen Fehler (${status}).`,
  },
  en: {
    unreachable: 'Google can’t be reached right now. Check your connection or an ad blocker.',
    noTextModel: 'The key is valid, but Google offers it no Gemini text model.',
    unknownKey: 'Google doesn’t recognize this key. Check that it was copied completely.',
    forbidden: 'This key isn’t allowed to use the Gemini API.',
    region: 'Google doesn’t allow the Gemini API for this key here (region or billing).',
    quota: 'This key’s quota is used up right now.',
    other: (status: number) => `Google reports an error (${status}).`,
  },
} as const

/** Models that cannot write a text answer: images, speech, embeddings, agents. */
const NOT_A_TEXT_MODEL = /(image|tts|audio|live|embedding|transcribe|robotics|computer-use|native|omni|veo|lyria|deep-research|antigravity|translate)/i

interface GoogleModel {
  name?: string
  displayName?: string
  supportedGenerationMethods?: string[]
}

export function textModels(models: GoogleModel[], locale: Locale = 'de'): GeminiModelOption[] {
  const available = models
    .filter((model) => typeof model.name === 'string' && model.name.startsWith('models/gemini-'))
    .filter((model) => model.supportedGenerationMethods?.includes('generateContent'))
    .map((model) => ({ id: model.name!.slice('models/'.length), label: model.displayName || model.name!.slice('models/'.length) }))
    .filter((model) => !NOT_A_TEXT_MODEL.test(model.id))
  const preferred = preferredGeminiModels(locale).filter((option) => available.some((model) => model.id === option.id))
  const rest = available
    .filter((model) => !preferred.some((option) => option.id === model.id))
    // Stable releases before previews, newer versions first.
    .sort((left, right) => Number(/preview|exp/i.test(left.id)) - Number(/preview|exp/i.test(right.id))
      || right.id.localeCompare(left.id, 'en', { numeric: true }))
  return [...preferred, ...rest]
}

export async function checkGeminiKey(key: string, signal?: AbortSignal, locale: Locale = 'de'): Promise<KeyCheck> {
  const text = KEY_MESSAGES[locale]
  let response: Response
  try {
    response = await fetch('https://generativelanguage.googleapis.com/v1beta/models?pageSize=1000', {
      headers: { 'x-goog-api-key': key },
      signal,
    })
  } catch {
    return { ok: false, keyRejected: false, message: text.unreachable }
  }
  const body = await response.json().catch(() => ({})) as {
    models?: GoogleModel[]
    error?: { message?: string; status?: string; details?: Array<{ reason?: string }> }
  }
  if (response.ok) {
    const models = textModels(body.models ?? [], locale)
    return models.length
      ? { ok: true, models }
      : { ok: false, keyRejected: false, message: text.noTextModel }
  }
  const reason = body.error?.details?.find((detail) => detail.reason)?.reason
  const google = body.error?.message ? ` Google: ${body.error.message}` : ''
  if (reason === 'API_KEY_INVALID') {
    return { ok: false, keyRejected: true, message: text.unknownKey }
  }
  if (response.status === 403) {
    return { ok: false, keyRejected: true, message: `${text.forbidden}${google}` }
  }
  if (body.error?.status === 'FAILED_PRECONDITION') {
    return { ok: false, keyRejected: true, message: `${text.region}${google}` }
  }
  if (response.status === 429) {
    return { ok: false, keyRejected: false, message: `${text.quota}${google}` }
  }
  return { ok: false, keyRejected: false, message: `${text.other(response.status)}${google}` }
}
