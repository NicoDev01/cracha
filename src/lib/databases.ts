import type { Database } from '@/types/chat'

export const STATUS_LABELS = {
  active: 'Aktiv',
  crawling: 'Crawling',
  pending: 'Ausstehend',
  failed: 'Fehler',
  inactive: 'Inaktiv',
} as const

export type DatabaseStatus = keyof typeof STATUS_LABELS

/**
 * The registry writes `pending | crawling | active | failed`, but older records
 * and the client type also carry `error` and `inactive`. Everything unknown is
 * treated as pending rather than rendered as a blank badge.
 */
export function databaseStatus(database: Pick<Database, 'status'>): DatabaseStatus {
  if (database.status === 'error') return 'failed'
  return database.status && database.status in STATUS_LABELS
    ? (database.status as DatabaseStatus)
    : 'pending'
}

/** Falls back to the generated id with its random suffix stripped. */
export function databaseName(database: Pick<Database, 'id' | 'name'>): string {
  const name = database.name?.trim()
  if (name && name !== database.id) return name
  return database.id
    .replace(/-[a-f0-9]{8}$/i, '')
    .replace(/[-_]+/g, ' ')
    .trim() || database.id
}

export function sourceUrl(database: Pick<Database, 'source_url' | 'url'>): string {
  return database.source_url || database.url || ''
}

export function hostname(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return url || '–'
  }
}

export function pageCount(database: Pick<Database, 'pages_count' | 'document_count'>): number {
  return database.pages_count ?? database.document_count ?? 0
}

function toDate(value?: string | Date | null): Date | null {
  if (!value) return null
  const date = value instanceof Date ? value : new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

/** Compact form for tight rows: `6. Aug. 2026`. */
export function formatDate(value?: string | Date | null): string {
  const date = toDate(value)
  return date ? new Intl.DateTimeFormat('de-DE', { dateStyle: 'medium' }).format(date) : '–'
}

/** Full form for the management table, where the exact time matters. */
export function formatDateTime(value?: string | Date | null): string {
  const date = toDate(value)
  return date
    ? new Intl.DateTimeFormat('de-DE', { dateStyle: 'medium', timeStyle: 'short' }).format(date)
    : '–'
}

export function formatNumber(value?: number): string {
  return new Intl.NumberFormat('de-DE').format(value ?? 0)
}

/** Newest crawl first; never-crawled bases sink to the bottom. */
export function byLastCrawl(left: Database, right: Database): number {
  const time = (value?: string | Date | null) => (value ? new Date(value).getTime() || 0 : 0)
  return time(right.last_crawl) - time(left.last_crawl)
}
