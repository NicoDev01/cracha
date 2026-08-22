'use client'

import { useCallback, useEffect, useState } from 'react'
import { Coins, Loader2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface CreditState {
  balance: number
  reserved: number
  databases: number
  maxDatabases: number
  costs: { page: number; chatMessage: number }
}

interface CreditPackage {
  id: string
  credits: number
  priceCents: number
  label: string
}

const euro = new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' })

export function CreditCard() {
  const [credits, setCredits] = useState<CreditState | null>(null)
  const [packages, setPackages] = useState<CreditPackage[]>([])
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    void (async () => {
      try {
        const response = await fetch('/api/credits')
        const result = await response.json() as {
          credits?: CreditState
          packages?: CreditPackage[]
        }
        if (!response.ok || !result.credits) return
        setCredits(result.credits)
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
    <section aria-label="Guthaben">
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
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
          {low && (
            <p className="mt-1 text-xs text-warning-600 dark:text-warning-400">
              Das reicht noch für etwa {questions} {questions === 1 ? 'Frage' : 'Fragen'} — Zeit aufzuladen.
            </p>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          {packages.map((pack) => (
            <Button
              key={pack.id}
              size="sm"
              variant="outline"
              rounded="full"
              disabled={busy !== null}
              onClick={() => void buy(pack.id)}
              className={cn(
                'h-9 gap-2',
                // bg-primary does not exist in this dashboard theme, so the
                // highlighted package gets its color explicitly.
                pack.id === 'S' && 'border-brand-500 bg-brand-500 !text-white hover:bg-brand-600',
              )}
            >
              {busy === pack.id && <Loader2 className="size-4 animate-spin" />}
              {pack.credits.toLocaleString('de-DE')} für {euro.format(pack.priceCents / 100)}
            </Button>
          ))}
        </div>
      </div>

      {error && (
        <p className="mt-3 rounded-xl border border-error-200 bg-error-50 px-3 py-2 text-sm text-error-700 dark:border-error-800 dark:bg-error-500/10 dark:text-error-300">
          {error}
        </p>
      )}
    </section>
  )
}
