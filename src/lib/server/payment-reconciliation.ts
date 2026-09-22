import 'server-only'
import { creditsAdmin, findPackage, rememberCustomer } from './credits'
import { getWorkerEnv } from './cloudflare'
import { customerId, stripeGet } from './stripe'

interface CheckoutSession {
  id: string
  mode: string
  payment_status: string
  currency: string
  amount_total: number
  payment_intent: string | null
  customer?: string | { id: string }
  metadata?: Record<string, string>
}
interface Charge {
  id: string
  paid: boolean
  amount: number
  amount_refunded: number
  currency: string
  dispute?: string | { status: string } | null
}

/** Fetch the latest Stripe state even for delayed or out-of-order events. */
export async function reconcileCheckout(sessionId: string, ownerId?: string): Promise<'paid' | 'pending'> {
  const observed = new Date().toISOString()
  const session = await stripeGet<CheckoutSession>(`/checkout/sessions/${encodeURIComponent(sessionId)}`)
  const userId = session.metadata?.supabase_user_id
  if (ownerId && ownerId !== userId) throw new Error('Checkout nicht gefunden.')
  const pack = findPackage(session.metadata?.package)
  if (!userId || !pack || session.mode !== 'payment') throw new Error('Ungültige Checkout-Zuordnung.')
  const free = session.payment_status === 'no_payment_required' && session.amount_total === 0
  if (session.payment_status !== 'paid' && !free) return 'pending'
  if ((!session.payment_intent && !free) || session.currency !== 'eur' || !Number.isSafeInteger(session.amount_total) || session.amount_total < 0) throw new Error('Ungültige Zahlung.')
  const lines = await stripeGet<{ data: Array<{ quantity: number; price: { id: string; currency: string; unit_amount: number } }> }>(`/checkout/sessions/${encodeURIComponent(sessionId)}/line_items?limit=2`)
  const line = lines.data[0]
  if (lines.data.length !== 1 || line.quantity !== 1 || line.price.id !== getWorkerEnv()[pack.priceEnvKey] || line.price.currency !== 'eur' || line.price.unit_amount !== pack.priceCents) throw new Error('Paketpreis stimmt nicht mit dem Tarif überein.')
  const intent = free ? null : await stripeGet<{ latest_charge: Charge | null }>(`/payment_intents/${encodeURIComponent(session.payment_intent!)}?expand[]=latest_charge.dispute`)
  const charge: Charge | null = free ? { id: session.id, paid: true, amount: 0, amount_refunded: 0, currency: 'eur' } : intent!.latest_charge
  if (!charge?.paid || charge.amount !== session.amount_total || charge.currency !== 'eur') throw new Error('Zahlung nicht bestätigt.')
  if (typeof charge.dispute === 'string') throw new Error('Zahlungsprüfung unvollständig.')
  const { error } = await creditsAdmin().rpc('reconcile_payment', {
    p_session: session.id, p_user: userId, p_intent: session.payment_intent ?? `free:${session.id}`,
    p_credits: pack.credits, p_amount: session.amount_total, p_refunded: charge.amount_refunded,
    p_dispute_state: charge.dispute?.status ?? null, p_observed: observed,
    p_consent: { version: session.metadata?.terms_version, accepted_at: session.metadata?.accepted_at, immediate_start: session.metadata?.immediate_start === 'true', text: session.metadata?.consent_text },
  })
  if (error) throw new Error('Zahlung konnte nicht verbucht werden.')
  const customer = customerId(session.customer)
  if (customer) await rememberCustomer(userId, customer)
  return 'paid'
}

export async function reconcilePaymentIntent(intent: string): Promise<void> {
  const result = await stripeGet<{ data: Array<{ id: string; metadata?: Record<string, string> }> }>(`/checkout/sessions?payment_intent=${encodeURIComponent(intent)}&limit=2`)
  // Other products in the same Stripe account are outside this ledger.
  for (const session of result.data) {
    if (session.metadata?.supabase_user_id && session.metadata?.package) await reconcileCheckout(session.id)
  }
}
