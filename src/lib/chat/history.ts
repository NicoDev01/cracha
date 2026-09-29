import type { ChatSummary } from '@/types/chat'

export const MAX_TITLE_LENGTH = 100

/** The first line of the question, cut at a word, until a title is generated. */
export function provisionalTitle(question: string): string {
  const line = question.trim().split('\n')[0].replace(/\s+/g, ' ').trim()
  if (line.length <= 70) return line || 'Neuer Chat'
  const cut = line.slice(0, 70)
  const space = cut.lastIndexOf(' ')
  return `${(space > 40 ? cut.slice(0, space) : cut).trimEnd()} …`
}

/**
 * One line of plain text: a model likes to wrap its title in quotes, a label
 * or Markdown, and a renamed title may arrive with a pasted line break.
 * Empty means there is no usable title.
 */
export function cleanTitle(raw: string): string {
  const line = raw
    .replace(/<\/?[^>]+>/g, '')
    .split('\n').map((part) => part.trim()).find(Boolean) ?? ''
  const title = line
    .replace(/^(titel|title)\s*:\s*/i, '')
    .replace(/[*_#`]/g, '')
    .replace(/[.:;,]+$/, '')
    .replace(/^["'„“”«»‚‘’]+|["'„“”«»‚‘’]+$/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/[.:;,]+$/, '')
  if (title.length <= MAX_TITLE_LENGTH) return title
  return `${title.slice(0, MAX_TITLE_LENGTH - 2).trimEnd()} …`
}

export interface ChatGroup {
  databaseId: string
  chats: ChatSummary[]
}

/**
 * Conversations under the knowledge base they asked, the most recently used
 * base first and the most recent conversation first within it.
 */
export function groupByDatabase(chats: ChatSummary[]): ChatGroup[] {
  // Parsed, not compared as text: PostgreSQL writes "+00:00", the browser "Z".
  const sorted = [...chats].sort((left, right) => Date.parse(right.updatedAt) - Date.parse(left.updatedAt))
  const groups = new Map<string, ChatSummary[]>()
  for (const chat of sorted) {
    const group = groups.get(chat.databaseId)
    if (group) group.push(chat)
    else groups.set(chat.databaseId, [chat])
  }
  return [...groups].map(([databaseId, grouped]) => ({ databaseId, chats: grouped }))
}
