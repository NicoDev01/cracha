/**
 * Checks a Google AI Studio key from the browser and lists the Gemini models it
 * can use. The request goes straight to Google (the API allows cross-origin
 * calls), so the key is verified without passing through our server, and the
 * model list is what this key can actually reach instead of names we guessed.
 */

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

/** Models that cannot write a text answer: images, speech, embeddings, agents. */
const NOT_A_TEXT_MODEL = /(image|tts|audio|live|embedding|transcribe|robotics|computer-use|native|omni|veo|lyria|deep-research|antigravity|translate)/i

interface GoogleModel {
  name?: string
  displayName?: string
  supportedGenerationMethods?: string[]
}

export function textModels(models: GoogleModel[]): GeminiModelOption[] {
  const available = models
    .filter((model) => typeof model.name === 'string' && model.name.startsWith('models/gemini-'))
    .filter((model) => model.supportedGenerationMethods?.includes('generateContent'))
    .map((model) => ({ id: model.name!.slice('models/'.length), label: model.displayName || model.name!.slice('models/'.length) }))
    .filter((model) => !NOT_A_TEXT_MODEL.test(model.id))
  const preferred = PREFERRED_GEMINI_MODELS.filter((option) => available.some((model) => model.id === option.id))
  const rest = available
    .filter((model) => !preferred.some((option) => option.id === model.id))
    // Stable releases before previews, newer versions first.
    .sort((left, right) => Number(/preview|exp/i.test(left.id)) - Number(/preview|exp/i.test(right.id))
      || right.id.localeCompare(left.id, 'en', { numeric: true }))
  return [...preferred, ...rest]
}

export async function checkGeminiKey(key: string, signal?: AbortSignal): Promise<KeyCheck> {
  let response: Response
  try {
    response = await fetch('https://generativelanguage.googleapis.com/v1beta/models?pageSize=1000', {
      headers: { 'x-goog-api-key': key },
      signal,
    })
  } catch {
    return { ok: false, keyRejected: false, message: 'Google ist gerade nicht erreichbar. Prüfe deine Verbindung oder einen Werbeblocker.' }
  }
  const body = await response.json().catch(() => ({})) as {
    models?: GoogleModel[]
    error?: { message?: string; status?: string; details?: Array<{ reason?: string }> }
  }
  if (response.ok) {
    const models = textModels(body.models ?? [])
    return models.length
      ? { ok: true, models }
      : { ok: false, keyRejected: false, message: 'Der Key ist gültig, aber Google bietet ihm kein Gemini-Textmodell an.' }
  }
  const reason = body.error?.details?.find((detail) => detail.reason)?.reason
  const google = body.error?.message ? ` Google: ${body.error.message}` : ''
  if (reason === 'API_KEY_INVALID') {
    return { ok: false, keyRejected: true, message: 'Google kennt diesen Key nicht. Prüfe, ob er vollständig kopiert wurde.' }
  }
  if (response.status === 403) {
    return { ok: false, keyRejected: true, message: `Der Key darf die Gemini API nicht nutzen.${google}` }
  }
  if (body.error?.status === 'FAILED_PRECONDITION') {
    return { ok: false, keyRejected: true, message: `Google lässt die Gemini API für diesen Key hier nicht zu (Region oder Abrechnung).${google}` }
  }
  if (response.status === 429) {
    return { ok: false, keyRejected: false, message: `Das Kontingent dieses Keys ist gerade erschöpft.${google}` }
  }
  return { ok: false, keyRejected: false, message: `Google meldet einen Fehler (${response.status}).${google}` }
}
