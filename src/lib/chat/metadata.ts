import type { ChatResponse } from '@/types/chat'

type Metadata = ChatResponse['metadata']

export function formatDuration(ms: number): string {
  return ms >= 1_000
    ? `${new Intl.NumberFormat('de-DE', { maximumFractionDigits: 1 }).format(ms / 1_000)} s`
    : `${Math.round(ms)} ms`
}

/**
 * Model ids arrive as routing paths — `google/gemini-3.5-flash`, `@cf/meta/llama-3.3-70b`
 * — and pick up the marker the server appends when the primary model failed. The
 * route is noise the reader cannot act on; that the answer came from the standby
 * model is not, because its answers read differently. The raw id stays in the
 * tooltip for anyone debugging.
 */
export function formatModel(model: string): string {
  return model
    .replace(/\(fallback:[^)]*\)/g, '(Ersatzmodell)')
    .replace(/(^|\s)(@?[\w.-]+\/)+/g, '$1')
}

/**
 * The line under an answer: which model wrote it, how long it took, how much was
 * searched. Empty while a request is still in flight, since a half-measured
 * duration would be worse than none.
 */
export function answerMetaParts(metadata: Metadata | undefined, sourceCount: number): string[] {
  if (!metadata || metadata.query_time <= 0) return []
  return [
    formatModel(metadata.model_used),
    metadata.retrieval_time
      ? `${formatDuration(metadata.query_time)} (davon ${formatDuration(metadata.retrieval_time)} Suche)`
      : formatDuration(metadata.query_time),
    sourceCount > 0 ? `${sourceCount} ${sourceCount === 1 ? 'Quelle' : 'Quellen'}` : null,
  ].filter((part): part is string => part !== null)
}
