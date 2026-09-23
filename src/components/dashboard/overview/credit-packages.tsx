import { Check } from 'lucide-react'

import { cn } from '@/lib/utils'

export interface PackageOption {
  id: string
  credits: number
  priceCents: number
  label: string
}

const euro = new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' })
const number = new Intl.NumberFormat('de-DE')

export function formatEuro(cents: number): string {
  return euro.format(cents / 100)
}

/** Whole answers a balance still pays for; never negative. */
export function questionsFor(balance: number, costPerAnswer: number): number {
  return costPerAnswer > 0 ? Math.max(0, Math.floor(balance / costPerAnswer)) : 0
}

/** Fewer than ten answers left is when the overview starts pointing at a top-up. */
export function isLowBalance(balance: number, costPerAnswer: number): boolean {
  return balance < costPerAnswer * 10
}

/**
 * Asks the server for a Stripe Checkout URL for one package. The terms were
 * accepted in the dialog before this can be called, hence `acceptTerms: true`.
 */
export async function requestCheckout(packageId: string): Promise<string> {
  const response = await fetch('/api/stripe/checkout', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ package: packageId, acceptTerms: true }),
  })
  const result = await response.json() as { url?: string; error?: string }
  if (!response.ok || !result.url) throw new Error(result.error ?? 'Stripe antwortete nicht.')
  return result.url
}

/**
 * The package choice inside the top-up dialog. One radio group instead of three
 * buy buttons: choosing a size and paying are two decisions, and the terms
 * checkbox sits between them.
 */
export function PackageOptions({
  packages,
  selected,
  onSelect,
  costs,
  disabled = false,
}: {
  packages: readonly PackageOption[]
  selected: string | null
  onSelect: (id: string) => void
  costs: { page: number; chatMessage: number }
  disabled?: boolean
}) {
  return (
    <div role="radiogroup" aria-label="Paket wählen" className="grid gap-2">
      {packages.map((pack) => {
        const checked = pack.id === selected
        return (
          <button
            key={pack.id}
            type="button"
            role="radio"
            aria-checked={checked}
            disabled={disabled}
            onClick={() => onSelect(pack.id)}
            className={cn(
              'flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-60',
              checked
                ? 'border-brand-500 bg-brand-50 ring-1 ring-brand-500/20 dark:bg-brand-500/10'
                : 'border-gray-200 hover:border-gray-300 dark:border-gray-700 dark:hover:border-gray-600',
            )}
          >
            <span
              aria-hidden="true"
              className={cn(
                'flex size-5 shrink-0 items-center justify-center rounded-full border',
                checked ? 'border-brand-500 bg-brand-500 text-white' : 'border-gray-300 dark:border-gray-600',
              )}
            >
              {checked && <Check className="size-3" />}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-semibold text-gray-900 dark:text-white">
                {number.format(pack.credits)} Credits
                <span className="ml-2 text-xs font-normal text-gray-500 dark:text-gray-400">{pack.label}</span>
              </span>
              <span className="mt-0.5 block text-xs text-gray-500 dark:text-gray-400">
                {`≈ ${number.format(questionsFor(pack.credits, costs.chatMessage))} Fragen oder ${number.format(Math.floor(pack.credits / Math.max(1, costs.page)))} Seiten`}
              </span>
            </span>
            <span className="shrink-0 text-sm font-semibold tabular-nums text-gray-900 dark:text-white">
              {formatEuro(pack.priceCents)}
            </span>
          </button>
        )
      })}
    </div>
  )
}
