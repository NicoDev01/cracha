'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { AlertTriangle, ArrowRight, Globe, Loader2, MessageSquare, RefreshCw } from 'lucide-react'

import { StatusBadge } from '@/components/dashboard/common/StatusBadge'
import { PlanCard } from '@/components/dashboard/overview/plan-card'
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
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async (showLoading = true) => {
    if (!user) {
      setDatabases([])
      setIsLoading(false)
      return
    }
    try {
      if (showLoading) setIsLoading(true)
      setDatabases(await getDatabases())
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
    void load()
  }, [load])

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
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-xl font-semibold text-gray-800 dark:text-white/90">Übersicht</h1>
        <Button
          variant="outline"
          size="sm"
          onClick={() => void load()}
          disabled={isLoading}
          className="h-9 gap-2 rounded-xl"
        >
          <RefreshCw className={cn('size-4', isLoading && 'animate-spin')} />
          Aktualisieren
        </Button>
      </div>

      {error && (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-error-200 bg-error-50 px-4 py-3 text-sm text-error-700 dark:border-error-800 dark:bg-error-500/10 dark:text-error-300">
          <span>{error}</span>
          <Button variant="ghost" size="sm" onClick={() => void load()} className="shrink-0">Erneut versuchen</Button>
        </div>
      )}

      {/*
        This replaces a row that counted knowledge bases and pages without
        saying how many were allowed. The same two numbers are here, now next to
        the ceiling they are approaching — and outside the empty-state branch,
        because a new account benefits most from seeing what it may use.
      */}
      <PlanCard />

      {!error && !isLoading && databases.length === 0 ? (
        <div className="flex flex-col items-center rounded-2xl border border-gray-200 bg-white px-6 py-14 text-center dark:border-gray-800 dark:bg-white/[0.03]">
          <div className="flex size-12 items-center justify-center rounded-2xl bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400">
            <Globe className="size-6" />
          </div>
          <h2 className="mt-4 text-base font-semibold text-gray-900 dark:text-white">Noch keine Wissensbasis</h2>
          <p className="mt-1 max-w-sm text-sm text-gray-500 dark:text-gray-400">
            Crawle eine Website, um Inhalte zu indexieren. Danach kannst du Fragen dazu stellen.
          </p>
          <Button asChild className="mt-5 gap-2 rounded-xl bg-brand-500 !text-white hover:bg-brand-600">
            <Link href="/dashboard/crawl"><Globe className="size-4" />Website crawlen</Link>
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
                        className="h-9 shrink-0 gap-2 rounded-xl"
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
