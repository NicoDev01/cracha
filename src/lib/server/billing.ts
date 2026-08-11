import 'server-only'

import { createClient as createSupabaseClient, type SupabaseClient } from '@supabase/supabase-js'

import { getWorkerEnv } from './cloudflare'
import { customerId, isPayingStatus, periodEnd, type StripeSubscription } from './stripe'

/**
 * Stripe calls the webhook, not the user, so there is no session to act on
 * behalf of — and `user_plans` grants nobody write access on purpose, because
 * an account that could write its own row could give itself the paid plan. The
 * service role is the only way in, and it exists only inside this file.
 */
export function billingAdmin(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = getWorkerEnv().SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('Abrechnung ist nicht konfiguriert.')
  return createSupabaseClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

/**
 * Which CraCha account a subscription belongs to. The metadata written when the
 * checkout was opened is the answer in every normal case; the customer id is
 * the fallback for a subscription changed in the Stripe dashboard, where no
 * metadata is set.
 */
export async function accountFor(
  admin: SupabaseClient,
  subscription: StripeSubscription,
): Promise<string | null> {
  const fromMetadata = subscription.metadata?.supabase_user_id
  if (typeof fromMetadata === 'string' && fromMetadata) return fromMetadata

  const customer = customerId(subscription.customer)
  if (!customer) return null
  const { data } = await admin
    .from('user_plans')
    .select('user_id')
    .eq('stripe_customer_id', customer)
    .maybeSingle()
  return (data?.user_id as string | undefined) ?? null
}

/**
 * Writes what Stripe currently says. A subscription that is past due, unpaid or
 * cancelled lands on the free plan — and current_period_end goes with it, so
 * the account falls back on its own even if a later webhook never arrives.
 *
 * The chat counter is deliberately not touched: what a free account already
 * spent stays spent, so cancelling and resubscribing is not a way to reset it.
 */
export async function applySubscription(
  admin: SupabaseClient,
  userId: string,
  subscription: StripeSubscription,
): Promise<void> {
  const paying = isPayingStatus(subscription.status)
  const { error } = await admin.from('user_plans').upsert({
    user_id: userId,
    plan: paying ? 'pro' : 'free',
    stripe_customer_id: customerId(subscription.customer),
    stripe_subscription_id: subscription.id,
    current_period_end: paying ? periodEnd(subscription) : null,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'user_id' })

  if (error) throw new Error(`Tarif konnte nicht geschrieben werden: ${error.message}`)
}

/** The Stripe customer this account already has, if it has been to checkout. */
export async function existingCustomer(
  admin: SupabaseClient,
  userId: string,
): Promise<string | null> {
  const { data } = await admin
    .from('user_plans')
    .select('stripe_customer_id')
    .eq('user_id', userId)
    .maybeSingle()
  return (data?.stripe_customer_id as string | null | undefined) ?? null
}
