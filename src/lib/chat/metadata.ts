import type { ChatResponse, FallbackReason } from '@/types/chat'

type Metadata = ChatResponse['metadata']

export function formatDuration(ms: number): string {
  return ms >= 1_000
    ? `${new Intl.NumberFormat('de-DE', { maximumFractionDigits: 1 }).format(ms / 1_000)} s`
    : `${Math.round(ms)} ms`
}

/**
 * Model ids arrive as routing paths — `google/gemini-3.5-flash-lite`,
 * `@cf/meta/llama-3.3-70b`. The route is noise the reader cannot act on, so only
 * the model name survives. The raw id stays in the tooltip for debugging.
 *
 * The search backend used to be appended here and stripped again by name. It is
 * not composed into the label any more, because a formatter that has to know a
 * product name only removes the spellings it was told about — and the one it
 * was not told about, a standalone label with nothing to strip it from, is what
 * a reader saw whenever a question found no relevant sources.
 */
export function formatModel(model: string): string {
  const name = model.replace(/(^|\s)(@?[\w.-]+\/)+/g, '$1')
  // "llama-4-scout-17b-16e-instruct" is an id, not a name a reader knows.
  const llama = /^llama-(\d+(?:\.\d+)?)-(scout|maverick|\d+b)(?![a-z])/i.exec(name)
  if (llama) {
    const variant = /^\d+b$/i.test(llama[2]) ? llama[2].toUpperCase() : `${llama[2][0].toUpperCase()}${llama[2].slice(1)}`
    return `Llama ${llama[1]} ${variant}`
  }
  const gemini = /^gemini-(\d+(?:\.\d+)?)-([a-z-]+)$/i.exec(name)
  if (gemini) {
    const variant = gemini[2]
      .replace(/flash-lite/i, 'Flash-Lite')
      .split('-')
      .map((part) => (part === 'Flash-Lite' ? part : `${part[0].toUpperCase()}${part.slice(1)}`))
      .join(' ')
      .replace('Flash Lite', 'Flash-Lite')
    return `Gemini ${gemini[1]} ${variant}`
  }
  return name
}

/**
 * The line under an answer: which model wrote it, how long it took, how much was
 * searched. Empty while a request is still in flight, since a half-measured
 * duration would be worse than none.
 */
export function answerMetaParts(metadata: Metadata | undefined, sourceCount: number): string[] {
  if (!metadata || metadata.query_time <= 0) return []
  const total = formatDuration(metadata.query_time)
  // A cached search returns in milliseconds. Reporting that as search time would
  // suggest the retrieval got faster, when it simply did not run.
  const timing = metadata.retrieval_cached
    ? `${total} (Suche zwischengespeichert)`
    : metadata.retrieval_time
      ? `${total} (davon ${formatDuration(metadata.retrieval_time)} Suche)`
      : total
  return [
    // Empty when no model ran, which is the case for a question that found
    // nothing to answer from. A blank part would render as a stray separator.
    formatModel(metadata.model_used),
    timing,
    sourceCount > 0 ? `${sourceCount} ${sourceCount === 1 ? 'Quelle' : 'Quellen'}` : null,
  ].filter((part): part is string => Boolean(part))
}

/**
 * The platform model is the default, so an answer from it is not a fallback.
 * The notice only appears when the reader's own Gemini key was supposed to
 * answer and did not, and it says why, because each cause asks for something
 * different: a new key, another model name, or waiting for the quota.
 */
const FALLBACK_NOTICES: Record<FallbackReason, string> = {
  byok_rejected: 'Dein API-Key wurde abgelehnt – das Standardmodell hat geantwortet',
  byok_model: 'Das gewählte Gemini-Modell gibt es nicht – das Standardmodell hat geantwortet',
  byok_quota: 'Das Kontingent deines API-Keys ist erschöpft – das Standardmodell hat geantwortet',
  byok_region: 'Google lässt deinen Key hier nicht zu (Region oder Abrechnung) – das Standardmodell hat geantwortet',
  byok_request: 'Google hat die Anfrage abgelehnt – das Standardmodell hat geantwortet',
  byok_unavailable: 'Gemini war nicht erreichbar – das Standardmodell hat geantwortet',
  primary_unavailable: 'Ersatzmodell – das primäre Modell war nicht erreichbar',
}

export function fallbackNotice(reason: FallbackReason | undefined): string {
  return FALLBACK_NOTICES[reason ?? 'byok_unavailable'] ?? FALLBACK_NOTICES.byok_unavailable
}

/**
 * The chosen Gemini model was overloaded and another one on the same key
 * answered. Not a fallback to our model, but the reader picked a model and
 * should know it was not the one that wrote this.
 */
export function substituteNotice(metadata: Metadata | undefined): string | null {
  if (!metadata?.requested_model || metadata.fallback) return null
  return `${formatModel(metadata.requested_model)} war ausgelastet – ${formatModel(metadata.model_used)} hat geantwortet`
}
