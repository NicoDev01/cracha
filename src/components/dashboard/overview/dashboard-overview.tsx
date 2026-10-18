'use client'

import { Link, useAppLocale } from "@/i18n/navigation";

const copy = {
  de: {
    loadFailed: 'Wissensbasen konnten nicht geladen werden.',
    overview: 'Übersicht',
    crawl: 'Website crawlen',
    retry: 'Erneut versuchen',
    crawling: (count: number) => (count === 1 ? 'Eine Website wird gerade eingelesen' : `${count} Websites werden gerade eingelesen`),
    failed: (count: number) => (count === 1 ? 'Eine Wissensbasis ist fehlgeschlagen' : `${count} Wissensbasen sind fehlgeschlagen`),
    yours: 'Deine Wissensbasen',
    refreshLabel: 'Wissensbasen aktualisieren',
    refresh: 'Aktualisieren',
    manage: 'Alle verwalten',
    loading: 'Wissensbasen werden geladen',
    pages: 'Seiten',
    ask: 'Fragen',
    notReady: 'Diese Wissensbasis ist noch nicht durchsuchbar.',
    count: (shown: number, total: number) => `${shown} von ${total} Wissensbasen`,
  },
  en: {
    loadFailed: 'Knowledge bases could not be loaded.',
    overview: 'Overview',
    crawl: 'Crawl a website',
    retry: 'Try again',
    crawling: (count: number) => (count === 1 ? 'One website is being read' : `${count} websites are being read`),
    failed: (count: number) => (count === 1 ? 'One knowledge base failed' : `${count} knowledge bases failed`),
    yours: 'Your knowledge bases',
    refreshLabel: 'Refresh knowledge bases',
    refresh: 'Refresh',
    manage: 'Manage all',
    loading: 'Loading knowledge bases',
    pages: 'pages',
    ask: 'Ask',
    notReady: 'This knowledge base isn’t searchable yet.',
    count: (shown: number, total: number) => `${shown} of ${total} knowledge bases`,
  },
} as const
import { useCallback, useEffect, useMemo, useState } from 'react'
import { AlertTriangle, ArrowRight, Globe, Loader2, MessagesSquare, RefreshCw } from 'lucide-react'

import { StatusBadge } from '@/components/dashboard/common/StatusBadge'
import { CreditCard } from '@/components/dashboard/overview/credit-card'
import { FirstSteps, primaryCta } from '@/components/dashboard/overview/first-steps'
import { Button } from '@/components/ui/button'
import {
  byLastCrawl,
  chatHref,
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
import { getDatabases } from '@/stores/chat-store'
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
  const { user } = useAuthStore()
  const locale = useAppLocale()
  const t = copy[locale]
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
      setError(loadError instanceof Error ? loadError.message : t.loadFailed)
      setDatabases([])
    } finally {
      if (showLoading) setIsLoading(false)
    }
  }, [user, t.loadFailed])

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
          setError(loadError instanceof Error ? loadError.message : t.loadFailed)
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
  }, [user, t.loadFailed])

  const isCrawling = databases.some((database) => databaseStatus(database) === 'crawling')

  useEffect(() => {
    if (!isCrawling) return
    const timer = window.setInterval(() => void load(false), 10_000)
    return () => window.clearInterval(timer)
  }, [isCrawling, load])

  const crawling = databases.filter((database) => databaseStatus(database) === 'crawling').length
  const failed = databases.filter((database) => databaseStatus(database) === 'failed').length
  const recent = useMemo(() => [...databases].sort(byLastCrawl).slice(0, VISIBLE_DATABASES), [databases])
  const isEmpty = !error && !isLoading && databases.length === 0

  return (
    <div className="space-y-5">
      {/*
        What the page is for, in order: how much can I still do (balance, one
        top-up button), what do I have (the knowledge bases, each one click away
        from a question), and what needs attention (running or failed imports).
        A brand-new account sees the three steps instead of an empty list.
      */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold text-gray-800 dark:text-white/90">{t.overview}</h1>
        {!isEmpty && (
          <Button asChild size="sm" rounded="full" className={primaryCta}>
            <Link href="/dashboard/crawl" prefetch={false}>
              <Globe className="size-4" />
              {t.crawl}
            </Link>
          </Button>
        )}
      </div>

      <CreditCard />

      {error && (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-error-200 bg-error-50 px-4 py-3 text-sm text-error-700 dark:border-error-800 dark:bg-error-500/10 dark:text-error-300">
          <span>{error}</span>
          <Button variant="ghost" size="sm" onClick={() => void load()} className="shrink-0">{t.retry}</Button>
        </div>
      )}

      {isEmpty ? <FirstSteps locale={locale} /> : !error && (
        <>
          {(crawling > 0 || failed > 0) && (
            <div className="grid gap-2 sm:grid-cols-2">
              {crawling > 0 && (
                <Notice href="/dashboard/crawl" tone="info">
                  {t.crawling(crawling)}
                </Notice>
              )}
              {failed > 0 && (
                <Notice href="/dashboard/data" tone="error">
                  {t.failed(failed)}
                </Notice>
              )}
            </div>
          )}

          <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]" aria-labelledby="overview-databases">
            <header className="flex items-center justify-between gap-3 border-b border-gray-100 px-4 py-3 dark:border-gray-800">
              <h2 id="overview-databases" className="text-sm font-semibold text-gray-900 dark:text-white">{t.yours}</h2>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => void load()}
                  disabled={isLoading}
                  aria-label={t.refreshLabel}
                  title={t.refresh}
                  className="size-8 shrink-0 rounded-full text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                >
                  <RefreshCw className={cn('size-4', isLoading && 'animate-spin')} />
                </Button>
                <Link
                  href="/dashboard/data"
                  prefetch={false}
                  className="text-xs font-medium text-brand-600 hover:text-brand-700 dark:text-brand-400"
                >
                  {t.manage}
                </Link>
              </div>
            </header>

            {isLoading ? (
              <div className="flex items-center justify-center gap-2 px-4 py-12 text-sm text-gray-500">
                <Loader2 className="size-4 animate-spin" />
                {t.loading}
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
                          {hostname(url)} · {formatNumber(pageCount(database), locale)} {t.pages} · {formatDate(database.last_crawl, locale)}
                        </p>
                      </div>
                      {status === 'active' ? (
                        <Button asChild variant="outline" size="sm" className="h-9 shrink-0 gap-2 rounded-full px-4">
                          <Link href={chatHref(database.id)} prefetch={false}>
                            <MessagesSquare className="size-4" />
                            {t.ask}
                          </Link>
                        </Button>
                      ) : (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled
                          className="h-9 shrink-0 gap-2 rounded-full px-4"
                          title={t.notReady}
                        >
                          <MessagesSquare className="size-4" />
                          {t.ask}
                        </Button>
                      )}
                    </li>
                  )
                })}
              </ul>
            )}

            {!isLoading && databases.length > VISIBLE_DATABASES && (
              <p className="border-t border-gray-100 px-4 py-2.5 text-xs text-gray-400 dark:border-gray-800">
                {t.count(VISIBLE_DATABASES, databases.length)}
              </p>
            )}
          </section>
        </>
      )}
    </div>
  )
}
