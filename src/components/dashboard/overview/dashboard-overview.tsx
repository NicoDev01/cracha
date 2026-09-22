'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { AlertTriangle, ArrowRight, Loader2, MessageSquare, Plus, RefreshCw } from 'lucide-react'

import { StatusBadge } from '@/components/dashboard/common/StatusBadge'
import { CreditCard } from '@/components/dashboard/overview/credit-card'
import { Button } from '@/components/ui/button'
import {
  byLastCrawl,
  databaseName,
  databaseStatus,
  formatDate,
  formatNumber,
  hostname,
  pageCount,
  sourceUrl,
} from '@/lib/databases'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/stores/auth-store'
import { getDatabases, useChatStore } from '@/stores/chat-store'
import type { Database } from '@/types/chat'

const VISIBLE_DATABASES = 5

function Notice({ href, tone, children }: {
  href: string
  tone: 'error' | 'info'
  children: React.ReactNode
}) {
  return (
    <Link
      href={href}
      className={cn(
        'flex items-center gap-2 rounded-xl border px-3 py-2 text-sm transition-colors',
        tone === 'error'
          ? 'border-error-200 bg-error-50 text-error-700 hover:bg-error-100 dark:border-error-800 dark:bg-error-500/10 dark:text-error-300'
          : 'border-brand-200 bg-brand-50 text-brand-700 hover:bg-brand-100 dark:border-brand-800 dark:bg-brand-500/10 dark:text-brand-300',
      )}
    >
      {tone === 'error' ? <AlertTriangle className="size-4 shrink-0" /> : <Loader2 className="size-4 shrink-0 animate-spin" />}
      <span className="min-w-0 flex-1">{children}</span>
      <ArrowRight className="size-4 shrink-0" />
    </Link>
  )
}

export function DashboardOverview() {
  const router = useRouter()
  const { user } = useAuthStore()
  const selectDatabase = useChatStore((state) => state.selectDatabase)
  const [databases, setDatabases] = useState<Database[]>([])
  const [isLoading, setIsLoading] = useState(() => Boolean(user))
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async (showLoading = true) => {
    if (!user) {
      return
    }
    try {
      const data = await getDatabases()
      setDatabases(data)
      setError(null)
    } catch (loadError) {
      // A dropped background poll keeps the last known list on screen.
      if (!showLoading) return
      setError(loadError instanceof Error ? loadError.message : 'Wissensbasen konnten nicht geladen werden.')
      setDatabases([])
    } finally {
      if (showLoading) setIsLoading(false)
    }
  }, [user])

  useEffect(() => {
    let active = true
    if (!user) return
    getDatabases()
      .then((data) => {
        if (active) {
          setDatabases(data)
          setError(null)
        }
      })
      .catch((loadError) => {
        if (active) {
          setError(loadError instanceof Error ? loadError.message : 'Wissensbasen konnten nicht geladen werden.')
          setDatabases([])
        }
      })
      .finally(() => {
        if (active) {
          setIsLoading(false)
        }
      })
    return () => {
      active = false
    }
  }, [user])

  const isCrawling = databases.some((database) => databaseStatus(database) === 'crawling')

  useEffect(() => {
    if (!isCrawling) return
    const timer = window.setInterval(() => void load(false), 10_000)
    return () => window.clearInterval(timer)
  }, [isCrawling, load])

  const crawling = databases.filter((database) => databaseStatus(database) === 'crawling').length
  const failed = databases.filter((database) => databaseStatus(database) === 'failed').length
  const recent = useMemo(() => [...databases].sort(byLastCrawl).slice(0, VISIBLE_DATABASES), [databases])

  const openInChat = (database: Database) => {
    selectDatabase(database.id)
    router.push('/dashboard/chat')
  }

  return (
    <div className="space-y-4">
      {/*
        The page answers three questions in order: what do I have (the credit
        hero below), what do I do next (the pill CTA here, always reachable,
        also inside the empty state), and what needs attention (the notices
        and the low-balance hint). The greeting replaces the old "Übersicht"
        label — a returning user and a brand-new account should not read the
        same headline.
      */}
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-xl font-semibold text-gray-800 dark:text-white/90">
          {databases.length > 0 ? 'Willkommen zurück' : 'Willkommen zu CraCha'}
        </h1>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => void load()}
            disabled={isLoading}
            aria-label="Aktualisieren"
            title="Aktualisieren"
            className="size-9 shrink-0 rounded-full text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            <RefreshCw className={cn('size-4', isLoading && 'animate-spin')} />
          </Button>
          <Button
            asChild
            size="sm"
            rounded="full"
            className="h-10 gap-1.5 bg-brand-500 px-5 !text-white shadow-sm hover:bg-brand-600"
          >
            <Link href="/dashboard/crawl">
              <Plus className="size-4" />
              Neuen Crawl starten
            </Link>
          </Button>
        </div>
      </div>

      {error && (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-error-200 bg-error-50 px-4 py-3 text-sm text-error-700 dark:border-error-800 dark:bg-error-500/10 dark:text-error-300">
          <span>{error}</span>
          <Button variant="ghost" size="sm" onClick={() => void load()} className="shrink-0">Erneut versuchen</Button>
        </div>
      )}

      {/*
        What do I have? One number, big and first — the balance. Everything
        else the old card explained (what a credit buys, the ledger) moved out;
        the two units it is spent on are visible where they are spent.
      */}
      <CreditCard />

      {!error && !isLoading && databases.length === 0 ? (
        <div className="flex flex-col items-center rounded-2xl border border-gray-200 bg-white px-6 py-16 text-center dark:border-gray-800 dark:bg-white/[0.03]">
          <h2 className="text-base font-semibold text-gray-900 dark:text-white">Deine erste Antwort in drei Schritten</h2>
          <ol className="mt-4 max-w-lg space-y-2 text-left text-sm leading-6 text-gray-600 dark:text-gray-300">
            <li>1. Wähle eine öffentliche Website und starte mit bis zu 20 Seiten.</li>
            <li>Warte, bis die Wissensbasis bereit ist, und öffne sie über „Fragen“.</li>
            <li>Stelle eine konkrete Frage und prüfe die verlinkten Quellen.</li>
          </ol>
          <Link href="/website-mit-ki-durchsuchen" className="mt-4 text-sm text-brand-600 underline dark:text-brand-400">Anleitung mit Beispielfragen lesen</Link>
          <Button asChild className="mt-5 h-10 gap-1.5 rounded-full bg-brand-500 px-5 !text-white shadow-sm hover:bg-brand-600">
            <Link href="/dashboard/crawl"><Plus className="size-4" />Neuen Crawl starten</Link>
          </Button>
        </div>
      ) : !error && (
        <>
          {(crawling > 0 || failed > 0) && (
            <div className="grid gap-2 sm:grid-cols-2">
              {crawling > 0 && (
                <Notice href="/dashboard/crawl" tone="info">
                  {crawling === 1 ? 'Ein Crawl läuft gerade' : `${crawling} Crawls laufen gerade`}
                </Notice>
              )}
              {failed > 0 && (
                <Notice href="/dashboard/data" tone="error">
                  {failed === 1 ? 'Eine Wissensbasis ist fehlgeschlagen' : `${failed} Wissensbasen sind fehlgeschlagen`}
                </Notice>
              )}
            </div>
          )}

          <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
            <header className="flex items-center justify-between gap-3 border-b border-gray-100 px-4 py-3 dark:border-gray-800">
              <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Wissensbasen</h2>
              <Link
                href="/dashboard/data"
                className="text-xs font-medium text-brand-600 hover:text-brand-700 dark:text-brand-400"
              >
                Alle verwalten
              </Link>
            </header>

            {isLoading ? (
              <div className="flex items-center justify-center gap-2 px-4 py-12 text-sm text-gray-500">
                <Loader2 className="size-4 animate-spin" />
                Wissensbasen werden geladen
              </div>
            ) : (
              <ul className="divide-y divide-gray-100 dark:divide-gray-800">
                {recent.map((database) => {
                  const status = databaseStatus(database)
                  const url = sourceUrl(database)
                  return (
                    <li key={database.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="truncate font-medium text-gray-900 dark:text-white">
                            {databaseName(database)}
                          </span>
                          <StatusBadge status={status} />
                        </div>
                        <p className="mt-0.5 truncate text-xs text-gray-500 dark:text-gray-400">
                          {hostname(url)} · {formatNumber(pageCount(database))} Seiten · {formatDate(database.last_crawl)}
                        </p>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => openInChat(database)}
                        disabled={status !== 'active'}
                        className="h-9 shrink-0 gap-2 rounded-full px-4"
                        title={status === 'active' ? undefined : 'Diese Wissensbasis ist noch nicht durchsuchbar.'}
                      >
                        <MessageSquare className="size-4" />
                        Fragen
                      </Button>
                    </li>
                  )
                })}
              </ul>
            )}

            {!isLoading && databases.length > VISIBLE_DATABASES && (
              <p className="border-t border-gray-100 px-4 py-2.5 text-xs text-gray-400 dark:border-gray-800">
                {`${VISIBLE_DATABASES} von ${databases.length} Wissensbasen`}
              </p>
            )}
          </section>
        </>
      )}
    </div>
  )
}
