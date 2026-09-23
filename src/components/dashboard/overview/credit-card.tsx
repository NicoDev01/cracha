'use client'

import { useCallback, useEffect, useState } from 'react'
import { Coins, Loader2, Plus } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useCredits } from '@/hooks/use-credits'
import { PURCHASE_CONSENT_TEXT } from '@/lib/purchase-consent'

import { isLowBalance, PackageOptions, questionsFor, requestCheckout } from './credit-packages'

const LEDGER_LABELS: Record<string, string> = {
  welcome: 'Startguthaben',
  purchase: 'Kauf',
  chat: 'Chat',
  crawl: 'Website einlesen',
  refund: 'Erstattung',
  adjustment: 'Korrektur',
}

/**
 * The balance at a glance and one way to top it up. Choosing a package, the
 * legal confirmation and the checkout live in a dialog behind "Credits
 * aufladen", so the overview shows the number that matters instead of three
 * price buttons nobody could press before ticking a checkbox.
 */
export function CreditCard() {
  const { credits, packages, entries, loading, error: loadError, refresh } = useCredits()
  const [paymentStatus, setPaymentStatus] = useState(() => {
    if (typeof window === 'undefined') return ''
    const params = new URLSearchParams(window.location.search)
    return params.get('guthaben') === 'abgebrochen'
      ? 'Kauf abgebrochen. Es wurden keine neuen Credits gutgeschrieben.'
      : ''
  })
  const [dialogOpen, setDialogOpen] = useState(false)
  const [selected, setSelected] = useState<string | null>(null)
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
      window.location.href = await requestCheckout(packageId)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Kauf konnte nicht gestartet werden.')
      setBusy(null)
    }
  }, [])

  const openDialog = () => {
    // The smallest package is the anchor the pricing is explained with.
    setSelected((current) => current ?? packages[0]?.id ?? null)
    setError(null)
    setDialogOpen(true)
  }

  if (!credits) {
    return (
      <section id="guthaben" aria-label="Guthaben" className="flex scroll-mt-28 flex-wrap items-center justify-between gap-3 rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm dark:border-gray-800 dark:bg-white/[0.03]">
        <p role="status" className="text-gray-600 dark:text-gray-300">
          {loading ? 'Guthaben wird geladen …' : loadError || 'Guthaben ist gerade nicht verfügbar.'}
        </p>
        {!loading && <Button variant="outline" size="sm" onClick={() => void refresh()}>Erneut laden</Button>}
      </section>
    )
  }

  const questions = questionsFor(credits.balance, credits.costs.chatMessage)
  const low = isLowBalance(credits.balance, credits.costs.chatMessage)
  const selectedPackage = packages.find((pack) => pack.id === selected)

  return (
    <section id="guthaben" aria-label="Guthaben" className="scroll-mt-28 rounded-2xl border border-gray-200 bg-white p-4 sm:p-5 dark:border-gray-800 dark:bg-white/[0.03]">
      {(credits.blocked || credits.balance < 0) && (
        <p role="alert" className="mb-3 text-sm text-error-600 dark:text-error-400">
          {credits.blocked
            ? 'Dein Guthaben ist wegen einer offenen Zahlungsprüfung gesperrt. Bitte kontaktiere den Support.'
            : 'Nach einer Zahlungsrückbuchung besteht ein Fehlbetrag. Eine Aufladung gleicht ihn zuerst aus.'}
        </p>
      )}

      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
        <div className="min-w-0">
          <h2 className="flex items-center gap-1.5 text-xs font-medium text-gray-500 dark:text-gray-400">
            <Coins className="size-3.5 text-amber-500" aria-hidden="true" />
            Guthaben
          </h2>
          <p className="mt-0.5 flex flex-wrap items-baseline gap-x-2">
            <span className="text-2xl font-bold tabular-nums text-gray-900 dark:text-white">
              {credits.balance.toLocaleString('de-DE')}
            </span>
            <span className="text-sm text-gray-600 dark:text-gray-300">Credits</span>
            <span className="text-sm text-gray-500 dark:text-gray-400">
              ≈ {questions.toLocaleString('de-DE')} {questions === 1 ? 'Frage' : 'Fragen'}
            </span>
          </p>
          {low && (
            <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">
              Dein Guthaben geht zur Neige. Lade auf, um weiter Fragen zu stellen und Websites einzulesen.
            </p>
          )}
          {credits.reserved > 0 && (
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              {credits.reserved.toLocaleString('de-DE')} Credits für laufende Einlesevorgänge reserviert.
            </p>
          )}
        </div>

        <Button
          type="button"
          onClick={openDialog}
          disabled={packages.length === 0}
          rounded="full"
          className="h-10 gap-1.5 bg-brand-500 px-5 !text-white shadow-sm hover:bg-brand-600"
        >
          <Plus className="size-4" />
          Credits aufladen
        </Button>
      </div>

      {paymentStatus && <p role="status" className="mt-3 rounded-xl border border-gray-200 p-3 text-sm dark:border-gray-700">{paymentStatus}</p>}
      {loadError && <p role="alert" className="mt-3 text-sm text-error-600">{loadError} <button type="button" className="underline" onClick={() => void refresh()}>Aktualisieren</button></p>}

      <details className="group mt-3 border-t border-gray-100 pt-3 dark:border-gray-800">
        <summary className="cursor-pointer text-xs font-medium text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
          Letzte Buchungen ({entries.length})
        </summary>
        {entries.length === 0 ? <p className="mt-3 text-sm text-gray-500">Noch keine Buchungen.</p> : (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-xs text-gray-500"><tr><th className="py-2 font-medium">Datum</th><th className="font-medium">Vorgang</th><th className="text-right font-medium">Credits</th></tr></thead>
              <tbody>{entries.map((entry, index) => (
                <tr key={`${entry.created_at}-${index}`} className="border-t border-gray-100 dark:border-gray-800">
                  <td className="whitespace-nowrap py-2 pr-4">{new Date(entry.created_at).toLocaleString('de-DE')}</td>
                  <td className="pr-4">{LEDGER_LABELS[entry.kind] ?? entry.kind}</td>
                  <td className="text-right tabular-nums">{entry.amount > 0 ? '+' : ''}{entry.amount}</td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        )}
      </details>

      <Dialog open={dialogOpen} onOpenChange={(open) => { if (!busy) setDialogOpen(open) }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Credits aufladen</DialogTitle>
            <DialogDescription>
              {credits.costs.page} Credit je eingelesener Seite, {credits.costs.chatMessage} Credits je Antwort. Einmalkauf, kein Abo.
            </DialogDescription>
          </DialogHeader>

          <PackageOptions
            packages={packages}
            selected={selected}
            onSelect={setSelected}
            costs={credits.costs}
            disabled={busy !== null}
          />

          <label className="flex cursor-pointer select-none items-start gap-2 text-xs leading-5 text-gray-600 dark:text-gray-400">
            <input
              type="checkbox"
              checked={acceptedTerms}
              onChange={(e) => setAcceptedTerms(e.target.checked)}
              disabled={busy !== null}
              className="mt-0.5 rounded border-gray-300 text-brand-600 focus:ring-brand-500"
            />
            <span>
              Ich akzeptiere die <a href="/nutzungsbedingungen" target="_blank" rel="noopener noreferrer" className="underline">Nutzungsbedingungen</a>. {PURCHASE_CONSENT_TEXT} <a href="/widerrufsbelehrung" target="_blank" rel="noopener noreferrer" className="underline">Widerrufsbelehrung lesen</a>.
            </span>
          </label>

          {error && (
            <p role="alert" className="rounded-xl border border-error-200 bg-error-50 px-3 py-2 text-sm text-error-700 dark:border-error-800 dark:bg-error-500/10 dark:text-error-300">
              {error}
            </p>
          )}

          <DialogFooter className="items-center gap-3 sm:justify-between">
            <p className="text-xs text-gray-500">Preise inklusive ggf. anfallender Umsatzsteuer.</p>
            <Button
              type="button"
              disabled={!selectedPackage || !acceptedTerms || busy !== null}
              onClick={() => selectedPackage && void buy(selectedPackage.id)}
              title={!acceptedTerms ? 'Bitte bestätige zuerst die Bedingungen und den sofortigen Beginn' : undefined}
              rounded="full"
              className="h-10 gap-2 bg-brand-500 px-5 !text-white hover:bg-brand-600"
            >
              {busy && <Loader2 className="size-4 animate-spin" />}
              Weiter zur Zahlung
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  )
}
