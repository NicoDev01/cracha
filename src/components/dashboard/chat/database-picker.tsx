'use client'

/*
 * What the empty chat shows when nothing is selected yet. This replaces a
 * paragraph asking the reader to pick a database from the dropdown up top —
 * nobody reads that on first contact, so the choice itself became the screen.
 * One ready knowledge base selects itself; zero of them offer the same CTA
 * as the overview.
 */

import { useCallback, useEffect, useState } from 'react'
import { Link, useAppLocale } from "@/i18n/navigation";
import { Globe, Loader2 } from 'lucide-react'

import { StatusBadge } from '@/components/dashboard/common/StatusBadge'
import { Button } from '@/components/ui/button'
import { useHydratedChatStore } from '@/hooks/use-chat-store'
import { databaseStatus, formatNumber, pageCount } from '@/lib/databases'
import { getDatabases } from '@/stores/chat-store'
import { useAuthStore } from '@/stores/auth-store'
import type { Database as DatabaseType } from '@/types/chat'

const copy = {
  de: { loadFailed: 'Wissensbasen konnten nicht geladen werden.', loading: 'Wissensbasen werden geladen', retry: 'Erneut versuchen', none: 'Noch keine Wissensbasis', crawl: 'Website crawlen', choose: 'Wähle eine Wissensbasis', notReady: 'Diese Wissensbasis ist noch nicht durchsuchbar.', pages: 'Seiten' },
  en: { loadFailed: 'Knowledge bases could not be loaded.', loading: 'Loading knowledge bases', retry: 'Try again', none: 'No knowledge base yet', crawl: 'Crawl a website', choose: 'Choose a knowledge base', notReady: 'This knowledge base isn’t searchable yet.', pages: 'pages' },
} as const

export function DatabasePicker() {
  const locale = useAppLocale()
  const t = copy[locale]
  const { user } = useAuthStore()
  const { selectDatabase } = useHydratedChatStore()
  // null means still loading; an array means loaded (possibly empty).
  const [databases, setDatabases] = useState<DatabaseType[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  const reload = useCallback(async () => {
    if (!user) return
    try {
      setDatabases(await getDatabases())
      setError(null)
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : t.loadFailed)
      setDatabases([])
    }
  }, [user, t.loadFailed])

  useEffect(() => {
    let cancelled = false
    void (async () => {
      if (!user) return
      try {
        const loaded = await getDatabases()
        if (!cancelled) {
          setDatabases(loaded)
          setError(null)
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : t.loadFailed)
          setDatabases([])
        }
      }
    })()
    return () => {
      cancelled = true
    }
  }, [user, t.loadFailed])

  // A single ready base is not a decision worth a screen — pick it and let
  // the user type. Everything else (zero, several, none ready) stays visible.
  useEffect(() => {
    if (!databases) return
    const ready = databases.filter((database) => databaseStatus(database) === 'active')
    if (ready.length === 1) selectDatabase(ready[0].id)
  }, [databases, selectDatabase])

  if (!databases) {
    return (
      <div className="flex items-center justify-center gap-2 py-16 text-sm text-gray-500 dark:text-gray-400">
        <Loader2 className="size-4 animate-spin" />
        {t.loading}
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center gap-3 py-16 text-center">
        <p className="max-w-xs text-sm text-gray-500 dark:text-gray-400">{error}</p>
        <Button variant="outline" size="sm" onClick={() => void reload()} className="rounded-full">
          {t.retry}
        </Button>
      </div>
    )
  }

  if (databases.length === 0) {
    return (
      <div className="flex w-full flex-col items-center rounded-2xl border border-gray-200 bg-white px-6 py-14 text-center dark:border-gray-800 dark:bg-white/[0.03]">
        <h2 className="text-base font-semibold text-gray-900 dark:text-white">{t.none}</h2>
        <Button asChild className="mt-5 h-10 gap-1.5 rounded-full bg-brand-500 px-5 !text-white shadow-sm hover:bg-brand-600">
          <Link href="/dashboard/crawl"><Globe className="size-4" />{t.crawl}</Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="w-full">
      <h2 className="text-center text-sm font-medium text-gray-500 dark:text-gray-400">
        {t.choose}
      </h2>
      <ul className="mt-4 divide-y divide-gray-100 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-theme-xs dark:divide-gray-800 dark:border-gray-800 dark:bg-white/[0.03]">
        {databases.map((database) => {
          const status = databaseStatus(database)
          const ready = status === 'active'
          return (
            <li key={database.id}>
              <button
                type="button"
                onClick={() => selectDatabase(database.id)}
                disabled={!ready}
                title={ready ? undefined : t.notReady}
                className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-brand-25 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:bg-transparent dark:hover:bg-brand-500/10"
              >
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-gray-900 dark:text-white">
                    {database.name}
                  </span>
                  <span className="mt-0.5 block text-xs text-gray-500 dark:text-gray-400">
                    {formatNumber(pageCount(database), locale)} {t.pages}
                  </span>
                </span>
                <StatusBadge status={status} />
              </button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
