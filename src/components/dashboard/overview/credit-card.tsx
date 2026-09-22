'use client'

import { useCallback, useEffect, useState } from 'react'
import { Coins, Loader2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

import { useCredits } from '@/hooks/use-credits'
import { PURCHASE_CONSENT_TEXT } from '@/lib/purchase-consent'

const euro = new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' })

export function CreditCard() {
  const { credits, packages, entries, loading, error: loadError, refresh } = useCredits()
  const [paymentStatus, setPaymentStatus] = useState(() => {
    if (typeof window === 'undefined') return ''
    const params = new URLSearchParams(window.location.search)
    return params.get('guthaben') === 'abgebrochen'
      ? 'Kauf abgebrochen. Es wurden keine neuen Credits gutgeschrieben.'
      : ''
  })
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [acceptedTerms, setAcceptedTerms] = useState(false)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const session = params.get('session_id')
    if (!session) return
    let cancelled = false
    let timer: ReturnType<typeof setTimeout> | undefined
    let attempts = 0
    const reconcile = async () => {
      setPaymentStatus('Zahlung wird geprüft. Bitte kaufe nicht erneut, während die Bestätigung aussteht.')
      try {
        const response = await fetch(`/api/stripe/checkout?session_id=${encodeURIComponent(session)}`, { signal: AbortSignal.timeout(15_000), cache: 'no-store' })
        const result = await response.json() as { status?: string; error?: string }
        if (cancelled) return
        if (!response.ok) throw new Error(result.error || 'Zahlungsstatus nicht verfügbar.')
        if (result.status === 'paid') {
          setPaymentStatus('Zahlung bestätigt. Dein Guthaben wurde aktualisiert.')
          window.dispatchEvent(new Event('cracha:credits-changed'))
          params.delete('session_id'); params.delete('guthaben')
          window.history.replaceState(null, '', `${window.location.pathname}${params.size ? `?${params}` : ''}#guthaben`)
          return
        }
      } catch {
        if (cancelled) return
      }
      if (++attempts < 10) timer = setTimeout(() => void reconcile(), 3000)
      else setPaymentStatus('Die Zahlungsbestätigung steht noch aus. Lade die Seite später erneut oder kontaktiere den Support. Bitte kaufe nicht noch einmal.')
    }
    void reconcile()
    return () => { cancelled = true; if (timer) clearTimeout(timer) }
  }, [])

  const buy = useCallback(async (packageId: string) => {
    setBusy(packageId)
    setError(null)
    try {
      const response = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ package: packageId, acceptTerms: true }),
      })
      const result = await response.json() as { url?: string; error?: string }
      if (!response.ok || !result.url) throw new Error(result.error ?? 'Stripe antwortete nicht.')
      window.location.href = result.url
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Kauf konnte nicht gestartet werden.')
      setBusy(null)
    }
  }, [])

  if (!credits) return <section id="guthaben" aria-label="Guthaben" className="text-sm">
    <p role="status">{loading ? 'Guthaben wird geladen…' : loadError || 'Guthaben ist gerade nicht verfügbar.'}</p>
    {!loading && <Button variant="outline" onClick={() => void refresh()}>Erneut laden</Button>}
  </section>

  const questions = Math.max(0, Math.floor(credits.balance / credits.costs.chatMessage))
  const low = credits.balance < credits.costs.chatMessage * 10

  return (
    <section id="guthaben" aria-label="Guthaben" className="scroll-mt-28">
      {(credits.blocked || credits.balance < 0) && <p role="alert" className="mb-4 text-sm text-error-600">{credits.blocked ? 'Dein Guthaben ist wegen einer offenen Zahlungsprüfung gesperrt. Bitte kontaktiere den Support.' : 'Nach einer Zahlungsrückbuchung besteht ein Fehlbetrag. Eine Aufladung gleicht ihn zuerst aus.'}</p>}
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
        <div>
          <h2 className="flex items-center gap-2 text-sm font-semibold text-gray-800 dark:text-white/90">
            <Coins className="size-4 text-amber-500" />
            CraCha Guthaben
          </h2>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-2xl font-bold tabular-nums text-gray-900 dark:text-white">
              {credits.balance.toLocaleString('de-DE')}
            </span>
            <span className="text-xs text-gray-500 dark:text-gray-400">
              Credits ({questions.toLocaleString('de-DE')} Fragen möglich)
            </span>
          </div>
          {low && (
            <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">
              Dein Guthaben geht zur Neige. Lade jetzt auf, um CraCha weiter zu nutzen.
            </p>
          )}
          {credits.reserved > 0 && (
            <p className="mt-1 text-xs text-gray-500">
              {credits.reserved.toLocaleString('de-DE')} Credits für laufende Website-Einlesungen reserviert.
            </p>
          )}
        </div>

        <div className="flex flex-col items-start sm:items-end gap-2.5">
          <div className="flex flex-wrap gap-2">
            {packages.map((pack) => (
              <Button
                key={pack.id}
                size="sm"
                variant="outline"
                rounded="full"
                disabled={busy !== null || !acceptedTerms}
                onClick={() => void buy(pack.id)}
                title={!acceptedTerms ? 'Bitte bestätige zuerst die Bedingungen und den sofortigen Beginn' : undefined}
                className={cn(
                  'h-9 gap-2',
                  pack.id === 'S' && acceptedTerms && 'border-brand-500 bg-brand-500 !text-white hover:bg-brand-600',
                )}
              >
                {busy === pack.id && <Loader2 className="size-4 animate-spin" />}
                {pack.credits.toLocaleString('de-DE')} für {euro.format(pack.priceCents / 100)}
              </Button>
            ))}
          </div>
          <label className="flex items-start gap-2 max-w-md text-sm text-gray-500 dark:text-gray-400 cursor-pointer sm:text-right select-none">
            <input
              type="checkbox"
              checked={acceptedTerms}
              onChange={(e) => setAcceptedTerms(e.target.checked)}
              className="mt-0.5 rounded border-gray-300 text-brand-600 focus:ring-brand-500"
            />
            <span>
              Ich akzeptiere die <a href="/nutzungsbedingungen" target="_blank" rel="noopener noreferrer" className="underline">Nutzungsbedingungen</a>. {PURCHASE_CONSENT_TEXT} <a href="/widerrufsbelehrung" target="_blank" rel="noopener noreferrer" className="underline">Widerrufsbelehrung lesen</a>.
            </span>
          </label>
        </div>
      </div>

      <p className="mt-3 text-xs text-gray-500">{credits.costs.page} Credit je indexierter Seite · {credits.costs.chatMessage} Credits je Chat-Antwort · Einmalkauf, kein Abo. Preise inklusive ggf. anfallender Umsatzsteuer.</p>
      {paymentStatus && <p role="status" className="mt-3 rounded-xl border p-3 text-sm">{paymentStatus}</p>}
      {loadError && <p role="alert" className="mt-3 text-sm text-red-600">{loadError} <button className="underline" onClick={() => void refresh()}>Aktualisieren</button></p>}
      <details className="mt-5 rounded-xl border border-gray-200 p-4 dark:border-gray-800">
        <summary className="cursor-pointer text-sm font-medium">Letzte Buchungen ({entries.length})</summary>
        {entries.length === 0 ? <p className="mt-3 text-sm text-gray-500">Noch keine Buchungen.</p> : <div className="mt-3 overflow-x-auto"><table className="w-full text-left text-sm">
          <thead><tr><th className="py-2">Datum</th><th>Vorgang</th><th className="text-right">Credits</th></tr></thead>
          <tbody>{entries.map((entry, index) => <tr key={`${entry.created_at}-${index}`} className="border-t border-gray-100 dark:border-gray-800">
            <td className="whitespace-nowrap py-2 pr-4">{new Date(entry.created_at).toLocaleString('de-DE')}</td>
            <td className="pr-4">{({ welcome: 'Startguthaben', purchase: 'Kauf', chat: 'Chat', crawl: 'Website einlesen', refund: 'Erstattung', adjustment: 'Korrektur' } as Record<string, string>)[entry.kind] ?? entry.kind}</td>
            <td className="text-right tabular-nums">{entry.amount > 0 ? '+' : ''}{entry.amount}</td>
          </tr>)}</tbody>
        </table></div>}
      </details>
      {error && (
        <p className="mt-3 rounded-xl border border-error-200 bg-error-50 px-3 py-2 text-sm text-error-700 dark:border-error-800 dark:bg-error-500/10 dark:text-error-300">
          {error}
        </p>
      )}
    </section>
  )
}
