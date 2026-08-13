'use client'

import { useCallback, useEffect, useState } from 'react'
import { Coins, Database, FileText, Loader2, MessageSquare } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface CreditState {
  balance: number
  reserved: number
  databases: number
  maxDatabases: number
  costs: { page: number; chatMessage: number }
}

interface LedgerEntry {
  amount: number
  kind: string
  detail: string | null
  created_at: string
}

interface CreditPackage {
  id: string
  credits: number
  priceCents: number
  label: string
}

const KIND_LABEL: Record<string, string> = {
  welcome: 'Startguthaben',
  purchase: 'Aufgeladen',
  chat: 'Frage',
  crawl: 'Crawl',
  refund: 'Erstattung',
  adjustment: 'Korrektur',
}

const euro = new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' })
const day = new Intl.DateTimeFormat('de-DE', { day: '2-digit', month: '2-digit', year: '2-digit' })

/** What the balance still buys, in the two units anybody actually spends it on. */
function Buys({ icon: Icon, label, value }: { icon: typeof FileText; label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white px-4 py-4 dark:border-gray-800 dark:bg-white/[0.03]">
      <div className="flex items-center gap-2 text-xs font-medium text-gray-500 dark:text-gray-400">
        <Icon className="size-3.5" aria-hidden="true" />
        {label}
      </div>
      <p className="mt-1 text-2xl font-semibold tabular-nums text-gray-900 dark:text-white">
        {value.toLocaleString('de-DE')}
      </p>
    </div>
  )
}

export function CreditCard() {
  const [credits, setCredits] = useState<CreditState | null>(null)
  const [entries, setEntries] = useState<LedgerEntry[]>([])
  const [packages, setPackages] = useState<CreditPackage[]>([])
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    void (async () => {
      try {
        const response = await fetch('/api/credits')
        const result = await response.json() as {
          credits?: CreditState
          entries?: LedgerEntry[]
          packages?: CreditPackage[]
        }
        if (!response.ok || !result.credits) return
        setCredits(result.credits)
        setEntries(result.entries ?? [])
        setPackages(result.packages ?? [])
      } catch {
        // The overview is still useful without the balance panel, so a failure
        // here stays silent rather than pushing an error over the whole page.
      }
    })()
  }, [])

  const buy = useCallback(async (packageId: string) => {
    setBusy(packageId)
    setError(null)
    try {
      const response = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ package: packageId }),
      })
      const result = await response.json() as { url?: string; error?: string }
      if (!response.ok || !result.url) throw new Error(result.error ?? 'Stripe antwortete nicht.')
      window.location.href = result.url
    } catch (openError) {
      setError(openError instanceof Error ? openError.message : 'Das hat nicht geklappt.')
      setBusy(null)
    }
  }, [])

  if (!credits) return null

  const questions = Math.floor(credits.balance / credits.costs.chatMessage)
  const low = credits.balance < credits.costs.chatMessage * 10

  return (
    <section className="space-y-3" aria-label="Guthaben">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-sm font-semibold text-gray-800 dark:text-white/90">
            <Coins className="size-4 text-brand-500" aria-hidden="true" />
            Guthaben
          </h2>
          <p className={cn(
            'mt-1 text-3xl font-semibold tabular-nums',
            low ? 'text-warning-600 dark:text-warning-400' : 'text-gray-900 dark:text-white',
          )}>
            {credits.balance.toLocaleString('de-DE')}
            <span className="ml-2 text-sm font-normal text-gray-400">Credits</span>
          </p>
          {credits.reserved > 0 && (
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              {credits.reserved.toLocaleString('de-DE')} für einen laufenden Crawl zurückgelegt. Was er
              nicht braucht, kommt zurück.
            </p>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          {packages.map((pack) => (
            <Button
              key={pack.id}
              size="sm"
              variant={pack.id === 'S' ? 'default' : 'outline'}
              rounded="full"
              disabled={busy !== null}
              onClick={() => void buy(pack.id)}
              className="h-9 gap-2"
            >
              {busy === pack.id && <Loader2 className="size-4 animate-spin" />}
              {pack.credits.toLocaleString('de-DE')} für {euro.format(pack.priceCents / 100)}
            </Button>
          ))}
        </div>
      </div>

      {error && (
        <p className="rounded-xl border border-error-200 bg-error-50 px-3 py-2 text-sm text-error-700 dark:border-error-800 dark:bg-error-500/10 dark:text-error-300">
          {error}
        </p>
      )}

      <div className="grid gap-3 sm:grid-cols-3">
        <Buys icon={FileText} label="Seiten einlesen" value={credits.balance} />
        <Buys icon={MessageSquare} label="Fragen stellen" value={questions} />
        <Buys icon={Database} label={`Wissensbasen von ${credits.maxDatabases}`} value={credits.databases} />
      </div>

      <p className="text-xs leading-5 text-gray-500 dark:text-gray-400">
        Eine eingelesene Seite kostet {credits.costs.page} Credit, eine Frage {credits.costs.chatMessage}.
        Ein Crawl legt sein Seitenlimit vorher zurück und rechnet danach ab — findet er weniger Seiten,
        bekommst du die Differenz sofort wieder gutgeschrieben. Guthaben verfällt nicht.
      </p>

      {entries.length > 0 && (
        <details className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
          <summary className="cursor-pointer px-4 py-3 text-xs font-medium text-gray-600 dark:text-gray-300">
            Letzte Buchungen
          </summary>
          <ul className="border-t border-gray-100 px-4 py-2 dark:border-gray-800">
            {entries.map((entry) => (
              <li
                key={`${entry.kind}-${entry.created_at}-${entry.amount}`}
                className="flex items-center justify-between gap-3 py-1.5 text-xs"
              >
                <span className="truncate text-gray-600 dark:text-gray-300">
                  {KIND_LABEL[entry.kind] ?? entry.kind}
                  {entry.detail && <span className="text-gray-400"> · {entry.detail}</span>}
                </span>
                <span className="shrink-0 tabular-nums text-gray-400">
                  {day.format(new Date(entry.created_at))}
                </span>
                <span className={cn(
                  'w-16 shrink-0 text-right font-medium tabular-nums',
                  entry.amount > 0 ? 'text-success-600 dark:text-success-400' : 'text-gray-700 dark:text-gray-200',
                )}>
                  {entry.amount > 0 ? '+' : ''}{entry.amount.toLocaleString('de-DE')}
                </span>
              </li>
            ))}
          </ul>
        </details>
      )}
    </section>
  )
}
