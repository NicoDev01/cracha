import type { ChatResponse } from '@/types/chat'

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
 */
export function formatModel(model: string): string {
  return model.replace(/(^|\s)(@?[\w.-]+\/)+/g, '$1')
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
    formatModel(metadata.model_used),
    timing,
    sourceCount > 0 ? `${sourceCount} ${sourceCount === 1 ? 'Quelle' : 'Quellen'}` : null,
  ].filter((part): part is string => part !== null)
}

/**
 * A failed primary model is not a detail. Its standby writes noticeably weaker
 * answers — shorter enumerations above all — so the reader has to be able to
 * tell the two apart, and a grey run-on line does not do that.
 */
export const FALLBACK_NOTICE = 'Ersatzmodell — das primäre Modell war nicht erreichbar'
