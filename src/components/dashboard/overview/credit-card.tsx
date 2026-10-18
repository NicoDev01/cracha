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
import { PURCHASE_CONSENT } from '@/lib/purchase-consent'
import { intlLocale } from '@/i18n/copy'
import { Link, useAppLocale } from '@/i18n/navigation'
import { currentLocale } from '@/i18n/client-locale'

import { isLowBalance, PackageOptions, questionsFor, requestCheckout } from './credit-packages'

const LEDGER_LABELS: Record<'de' | 'en', Record<string, string>> = {
  de: { welcome: 'Startguthaben', purchase: 'Kauf', chat: 'Chat', crawl: 'Crawl', refund: 'Erstattung', adjustment: 'Korrektur' },
  en: { welcome: 'Free credits', purchase: 'Purchase', chat: 'Chat', crawl: 'Crawl', refund: 'Refund', adjustment: 'Adjustment' },
}

const copy = {
  de: {
    cancelled: 'Kauf abgebrochen. Es wurden keine neuen Credits gutgeschrieben.',
    checking: 'Zahlung wird geprüft. Bitte kaufe nicht erneut, während die Bestätigung aussteht.',
    statusUnavailable: 'Zahlungsstatus nicht verfügbar.',
    confirmed: 'Zahlung bestätigt. Dein Guthaben wurde aktualisiert.',
    pending: 'Die Zahlungsbestätigung steht noch aus. Lade die Seite später erneut oder kontaktiere den Support. Bitte kaufe nicht noch einmal.',
    buyFailed: 'Kauf konnte nicht gestartet werden.',
    balance: 'Guthaben',
    loading: 'Guthaben wird geladen …',
    unavailable: 'Guthaben ist gerade nicht verfügbar.',
    reload: 'Erneut laden',
    blocked: 'Dein Guthaben ist wegen einer offenen Zahlungsprüfung gesperrt. Bitte kontaktiere den Support.',
    negative: 'Nach einer Zahlungsrückbuchung besteht ein Fehlbetrag. Eine Aufladung gleicht ihn zuerst aus.',
    questions: (count: string, one: boolean) => `≈ ${count} ${one ? 'Frage' : 'Fragen'}`,
    low: 'Dein Guthaben geht zur Neige. Lade auf, um weiter Fragen zu stellen und Websites einzulesen.',
    reserved: (count: string) => `${count} Credits für laufende Einlesevorgänge reserviert.`,
    topUp: 'Credits aufladen',
    refresh: 'Aktualisieren',
    entries: (count: number) => `Letzte Buchungen (${count})`,
    noEntries: 'Noch keine Buchungen.',
    date: 'Datum',
    kind: 'Vorgang',
    costs: (page: number, answer: number) => `${page} Credit je eingelesener Seite, ${answer} Credits je Antwort. Einmalkauf, kein Abo.`,
    accept: 'Ich akzeptiere die',
    terms: 'Nutzungsbedingungen',
    readWithdrawal: 'Widerrufsbelehrung lesen',
    vat: 'Preise inklusive ggf. anfallender Umsatzsteuer.',
    confirmFirst: 'Bitte bestätige zuerst die Bedingungen und den sofortigen Beginn',
    pay: 'Weiter zur Zahlung',
  },
  en: {
    cancelled: 'Purchase cancelled. No new credits were added.',
    checking: 'Checking the payment. Please don’t buy again while the confirmation is pending.',
    statusUnavailable: 'Payment status unavailable.',
    confirmed: 'Payment confirmed. Your balance has been updated.',
    pending: 'The payment confirmation is still pending. Reload the page later or contact support. Please don’t buy again.',
    buyFailed: 'The purchase could not be started.',
    balance: 'Balance',
    loading: 'Loading balance …',
    unavailable: 'Your balance is unavailable right now.',
    reload: 'Reload',
    blocked: 'Your balance is locked because of an open payment review. Please contact support.',
    negative: 'A payment chargeback left a negative balance. A top-up settles it first.',
    questions: (count: string, one: boolean) => `≈ ${count} ${one ? 'question' : 'questions'}`,
    low: 'Your balance is running low. Top up to keep asking questions and reading websites.',
    reserved: (count: string) => `${count} credits reserved for running crawls.`,
    topUp: 'Top up credits',
    refresh: 'Refresh',
    entries: (count: number) => `Recent transactions (${count})`,
    noEntries: 'No transactions yet.',
    date: 'Date',
    kind: 'Type',
    costs: (page: number, answer: number) => `${page} credit per page read, ${answer} credits per answer. One-time purchase, no subscription.`,
    accept: 'I accept the',
    terms: 'terms of use',
    readWithdrawal: 'Read the withdrawal policy',
    vat: 'Prices include any applicable VAT.',
    confirmFirst: 'Please confirm the terms and the immediate start first',
    pay: 'Continue to payment',
  },
} as const

/**
 * The balance at a glance and one way to top it up. Choosing a package, the
 * legal confirmation and the checkout live in a dialog behind "Credits
 * aufladen", so the overview shows the number that matters instead of three
 * price buttons nobody could press before ticking a checkbox.
 */
export function CreditCard() {
  const locale = useAppLocale()
  const t = copy[locale]
  const number = (value: number) => value.toLocaleString(intlLocale(locale))
  const { credits, packages, entries, loading, error: loadError, refresh } = useCredits()
  const [paymentStatus, setPaymentStatus] = useState(() => {
    if (typeof window === 'undefined') return ''
    const params = new URLSearchParams(window.location.search)
    return params.get('guthaben') === 'abgebrochen'
      ? copy[currentLocale()].cancelled
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
      setPaymentStatus(copy[currentLocale()].checking)
      try {
        const response = await fetch(`/api/stripe/checkout?session_id=${encodeURIComponent(session)}`, { signal: AbortSignal.timeout(15_000), cache: 'no-store' })
        const result = await response.json() as { status?: string; error?: string }
        if (cancelled) return
        if (!response.ok) throw new Error(result.error || copy[currentLocale()].statusUnavailable)
        if (result.status === 'paid') {
          setPaymentStatus(copy[currentLocale()].confirmed)
          window.dispatchEvent(new Event('cracha:credits-changed'))
          params.delete('session_id'); params.delete('guthaben')
          window.history.replaceState(null, '', `${window.location.pathname}${params.size ? `?${params}` : ''}#guthaben`)
          return
        }
      } catch {
        if (cancelled) return
      }
      if (++attempts < 10) timer = setTimeout(() => void reconcile(), 3000)
      else setPaymentStatus(copy[currentLocale()].pending)
    }
    void reconcile()
    return () => { cancelled = true; if (timer) clearTimeout(timer) }
  }, [])

  const buy = useCallback(async (packageId: string) => {
    setBusy(packageId)
    setError(null)
    try {
      window.location.href = await requestCheckout(packageId, locale)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : t.buyFailed)
      setBusy(null)
    }
  }, [locale, t.buyFailed])

  const openDialog = () => {
    // The smallest package is the anchor the pricing is explained with.
    setSelected((current) => current ?? packages[0]?.id ?? null)
    setError(null)
    setDialogOpen(true)
  }

  if (!credits) {
    return (
      <section id="guthaben" aria-label={t.balance} className="flex scroll-mt-28 flex-wrap items-center justify-between gap-3 rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm dark:border-gray-800 dark:bg-white/[0.03]">
        <p role="status" className="text-gray-600 dark:text-gray-300">
          {loading ? t.loading : loadError || t.unavailable}
        </p>
        {!loading && <Button variant="outline" size="sm" onClick={() => void refresh()}>{t.reload}</Button>}
      </section>
    )
  }

  const questions = questionsFor(credits.balance, credits.costs.chatMessage)
  const low = isLowBalance(credits.balance, credits.costs.chatMessage)
  const selectedPackage = packages.find((pack) => pack.id === selected)

  return (
    <section id="guthaben" aria-label={t.balance} className="scroll-mt-28 rounded-2xl border border-gray-200 bg-white p-4 sm:p-5 dark:border-gray-800 dark:bg-white/[0.03]">
      {(credits.blocked || credits.balance < 0) && (
        <p role="alert" className="mb-3 text-sm text-error-600 dark:text-error-400">
          {credits.blocked
            ? t.blocked
            : t.negative}
        </p>
      )}

      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
        <div className="min-w-0">
          <h2 className="flex items-center gap-1.5 text-xs font-medium text-gray-500 dark:text-gray-400">
            <Coins className="size-3.5 text-amber-500" aria-hidden="true" />
            {t.balance}
          </h2>
          <p className="mt-0.5 flex flex-wrap items-baseline gap-x-2">
            <span className="text-2xl font-bold tabular-nums text-gray-900 dark:text-white">
              {number(credits.balance)}
            </span>
            <span className="text-sm text-gray-600 dark:text-gray-300">Credits</span>
            <span className="text-sm text-gray-500 dark:text-gray-400">
              {t.questions(number(questions), questions === 1)}
            </span>
          </p>
          {low && (
            <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">
              {t.low}
            </p>
          )}
          {credits.reserved > 0 && (
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              {t.reserved(number(credits.reserved))}
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
          {t.topUp}
        </Button>
      </div>

      {paymentStatus && <p role="status" className="mt-3 rounded-xl border border-gray-200 p-3 text-sm dark:border-gray-700">{paymentStatus}</p>}
      {loadError && <p role="alert" className="mt-3 text-sm text-error-600">{loadError} <button type="button" className="underline" onClick={() => void refresh()}>{t.refresh}</button></p>}

      <details className="group mt-3 border-t border-gray-100 pt-3 dark:border-gray-800">
        <summary className="cursor-pointer text-xs font-medium text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
          {t.entries(entries.length)}
        </summary>
        {entries.length === 0 ? <p className="mt-3 text-sm text-gray-500">{t.noEntries}</p> : (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-xs text-gray-500"><tr><th className="py-2 font-medium">{t.date}</th><th className="font-medium">{t.kind}</th><th className="text-right font-medium">Credits</th></tr></thead>
              <tbody>{entries.map((entry, index) => (
                <tr key={`${entry.created_at}-${index}`} className="border-t border-gray-100 dark:border-gray-800">
                  <td className="whitespace-nowrap py-2 pr-4">{new Date(entry.created_at).toLocaleString(intlLocale(locale))}</td>
                  <td className="pr-4">{LEDGER_LABELS[locale][entry.kind] ?? entry.kind}</td>
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
            <DialogTitle>{t.topUp}</DialogTitle>
            <DialogDescription>
              {t.costs(credits.costs.page, credits.costs.chatMessage)}
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
              {t.accept} <Link href="/nutzungsbedingungen" target="_blank" rel="noopener noreferrer" className="underline">{t.terms}</Link>. {PURCHASE_CONSENT[locale]} <Link href="/widerrufsbelehrung" target="_blank" rel="noopener noreferrer" className="underline">{t.readWithdrawal}</Link>.
            </span>
          </label>

          {error && (
            <p role="alert" className="rounded-xl border border-error-200 bg-error-50 px-3 py-2 text-sm text-error-700 dark:border-error-800 dark:bg-error-500/10 dark:text-error-300">
              {error}
            </p>
          )}

          <DialogFooter className="items-center gap-3 sm:justify-between">
            <p className="text-xs text-gray-500">{t.vat}</p>
            <Button
              type="button"
              disabled={!selectedPackage || !acceptedTerms || busy !== null}
              onClick={() => selectedPackage && void buy(selectedPackage.id)}
              title={!acceptedTerms ? t.confirmFirst : undefined}
              rounded="full"
              className="h-10 gap-2 bg-brand-500 px-5 !text-white hover:bg-brand-600"
            >
              {busy && <Loader2 className="size-4 animate-spin" />}
              {t.pay}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  )
}
