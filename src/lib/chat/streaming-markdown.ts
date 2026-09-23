import remend from 'remend'

/**
 * Markdown that is still being written is broken in predictable ways: an
 * opened `**` makes the rest of the answer bold until it closes, a table row
 * shows as pipes, a half-typed `[1` shows as text before it becomes a source
 * marker. `remend` closes what is open; the unfinished marker is held back
 * until its bracket arrives.
 */
export function streamingMarkdown(content: string): string {
  return remend(content.replace(/\s*\[\d*(?:\s*,\s*\d*)*$/u, ''), { linkMode: 'text-only' })
}
