'use client'

import { useCallback, useEffect, useState } from 'react'
import { Database, FileText, Loader2, MessageSquare, Sparkles } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface Usage {
  plan: 'free' | 'pro'
  limits: { databases: number; pages: number; chatMessages: number | null }
  databases: number
  pages: number
  chatMessages: number
}

/**
 * A bar rather than a bare number, because "38 von 100" is a fact and a
 * three-quarters-full bar is a warning. Above 90 percent it turns red, so the
 * limit is noticed before it is hit rather than at the moment a crawl is
 * refused.
 */
function Meter({ icon: Icon, label, used, limit }: {
  icon: typeof Database
  label: string
  used: number
  limit: number | null
}) {
  const share = limit === null ? 0 : Math.min(100, Math.round((used / limit) * 100))
  const tone = limit === null
    ? 'bg-brand-500'
    : share >= 100 ? 'bg-error-500' : share >= 90 ? 'bg-warning-500' : 'bg-brand-500'

  return (
    <div className="rounded-2xl border border-gray-200 bg-white px-4 py-4 dark:border-gray-800 dark:bg-white/[0.03]">
      <div className="flex items-center gap-2 text-xs font-medium text-gray-500 dark:text-gray-400">
        <Icon className="size-3.5" aria-hidden="true" />
        {label}
      </div>
      <p className="mt-1 text-2xl font-semibold tabular-nums text-gray-900 dark:text-white">
        {used.toLocaleString('de-DE')}
        <span className="ml-1 text-sm font-normal text-gray-400">
          {limit === null ? 'ohne Begrenzung' : `von ${limit.toLocaleString('de-DE')}`}
        </span>
      </p>
      {limit !== null && (
        <div
          className="mt-3 h-1.5 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800"
          role="progressbar"
          aria-valuenow={used}
          aria-valuemin={0}
          aria-valuemax={limit}
          aria-label={label}
        >
          <div className={cn('h-full rounded-full transition-all', tone)} style={{ width: `${share}%` }} />
        </div>
      )}
    </div>
  )
}

export function PlanCard() {
  const [usage, setUsage] = useState<Usage | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    void (async () => {
      try {
        const response = await fetch('/api/usage')
        const result = await response.json() as { usage?: Usage }
        if (response.ok && result.usage) setUsage(result.usage)
      } catch {
        // The overview is still useful without the quota panel, so a failure
        // here stays silent rather than pushing an error over the whole page.
      }
    })()
  }, [])

  /** Both buttons do the same thing: ask the server for a Stripe URL and go. */
  const openStripe = useCallback(async (path: string) => {
    setBusy(true)
    setError(null)
    try {
      const response = await fetch(path, { method: 'POST' })
      const result = await response.json() as { url?: string; error?: string }
      if (!response.ok || !result.url) throw new Error(result.error ?? 'Stripe antwortete nicht.')
      window.location.href = result.url
    } catch (openError) {
      setError(openError instanceof Error ? openError.message : 'Das hat nicht geklappt.')
      setBusy(false)
    }
  }, [])

  if (!usage) return null
  const pro = usage.plan === 'pro'

  return (
    <section className="space-y-3" aria-label="Tarif und Kontingent">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-gray-800 dark:text-white/90">
          Tarif
          <span className={cn(
            'rounded-full px-2 py-0.5 text-xs font-medium',
            pro
              ? 'bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-300'
              : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300',
          )}>
            {pro ? 'CraCha Pro' : 'Kostenlos'}
          </span>
        </h2>

        <Button
          size="sm"
          variant={pro ? 'outline' : 'default'}
          rounded="full"
          disabled={busy}
          onClick={() => void openStripe(pro ? '/api/stripe/portal' : '/api/stripe/checkout')}
          className="h-9 gap-2"
        >
          {busy ? <Loader2 className="size-4 animate-spin" /> : !pro && <Sparkles className="size-4" />}
          {pro ? 'Abo verwalten' : 'Auf Pro upgraden — 10 €/Monat'}
        </Button>
      </div>

      {error && (
        <p className="rounded-xl border border-error-200 bg-error-50 px-3 py-2 text-sm text-error-700 dark:border-error-800 dark:bg-error-500/10 dark:text-error-300">
          {error}
        </p>
      )}

      <div className="grid gap-3 sm:grid-cols-3">
        <Meter icon={Database} label="Wissensbasen" used={usage.databases} limit={usage.limits.databases} />
        <Meter icon={FileText} label="Eingelesene Seiten" used={usage.pages} limit={usage.limits.pages} />
        <Meter icon={MessageSquare} label="Chat-Nachrichten" used={usage.chatMessages} limit={usage.limits.chatMessages} />
      </div>

      {!pro && (
        <p className="text-xs leading-5 text-gray-500 dark:text-gray-400">
          Seiten werden dauerhaft gezählt: Löschen einer Wissensbasis gibt das
          Kontingent nicht wieder frei, weil das Einlesen bereits stattgefunden
          hat. Mit Pro sind es 100 Wissensbasen, 1.000 Seiten und Chat ohne
          Begrenzung.
        </p>
      )}
    </section>
  )
}
