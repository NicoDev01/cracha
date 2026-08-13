import 'server-only'

import { getWorkerEnv } from './cloudflare'

/**
 * Stripe's REST API is form-encoded HTTP, and webhook signatures are an HMAC
 * the Workers runtime can compute itself. That is the whole surface this app
 * needs, so it is written out here rather than pulled in as a dependency — the
 * official SDK is a large addition to a Worker bundle for three endpoints.
 */
const API = 'https://api.stripe.com/v1'

/**
 * Pinned deliberately. Without it Stripe answers with whatever version the
 * account happens to be on, so a dashboard-side upgrade could change the shape
 * of what this code reads without a single line here changing.
 */
const API_VERSION = '2026-07-29.dahlia'

/** A replay from last week is still correctly signed. Age is what rejects it. */
const SIGNATURE_TOLERANCE_MS = 5 * 60 * 1_000

function encodeInto(value: unknown, key: string, out: string[]): void {
  if (value === undefined || value === null) return
  if (Array.isArray(value)) {
    value.forEach((item, index) => encodeInto(item, `${key}[${index}]`, out))
    return
  }
  if (typeof value === 'object') {
    for (const [name, item] of Object.entries(value)) encodeInto(item, `${key}[${name}]`, out)
    return
  }
  out.push(`${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`)
}

/** Stripe expects nesting as `line_items[0][price]`, not as JSON. */
export function stripeForm(params: Record<string, unknown>): string {
  const out: string[] = []
  for (const [key, value] of Object.entries(params)) encodeInto(value, key, out)
  return out.join('&')
}

export async function stripePost<T>(path: string, params: Record<string, unknown>): Promise<T> {
  const key = getWorkerEnv().STRIPE_API_KEY
  if (!key) throw new Error('Stripe ist nicht konfiguriert.')

  const response = await fetch(`${API}${path}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/x-www-form-urlencoded',
      'Stripe-Version': API_VERSION,
    },
    body: stripeForm(params),
  })
  const result = (await response.json().catch(() => ({}))) as { error?: { message?: string } }
  if (!response.ok) {
    // Stripe's own message names the field it disliked, which is worth keeping
    // in the log; the caller decides what the user gets to see.
    throw new Error(result.error?.message ?? `Stripe antwortete mit ${response.status}.`)
  }
  return result as T
}

function timingSafeEqual(left: string, right: string): boolean {
  if (left.length !== right.length) return false
  let difference = 0
  for (let index = 0; index < left.length; index += 1) {
    difference |= left.charCodeAt(index) ^ right.charCodeAt(index)
  }
  return difference === 0
}

/**
 * Anyone can post to a webhook URL. Without this check the endpoint is a form
 * for handing out the paid plan, so it is the one place where being strict
 * matters more than being forgiving.
 *
 * All v1 signatures in the header are tried, not just the first: during a
 * signing-secret rotation Stripe sends one per active secret.
 */
export async function verifyStripeSignature(
  payload: string,
  header: string | null,
  secret: string | undefined,
  now = Date.now(),
): Promise<boolean> {
  if (!header || !secret) return false

  let timestamp = Number.NaN
  const signatures: string[] = []
  for (const part of header.split(',')) {
    const separator = part.indexOf('=')
    if (separator < 0) continue
    const name = part.slice(0, separator).trim()
    const value = part.slice(separator + 1).trim()
    if (name === 't') timestamp = Number(value)
    else if (name === 'v1') signatures.push(value)
  }
  if (!Number.isFinite(timestamp) || signatures.length === 0) return false
  if (Math.abs(now - timestamp * 1_000) > SIGNATURE_TOLERANCE_MS) return false

  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const digest = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(`${timestamp}.${payload}`))
  const expected = [...new Uint8Array(digest)]
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')

  return signatures.some((signature) => timingSafeEqual(expected, signature))
}

/**
 * Stripe returns a customer either as an id or as the expanded object,
 * depending on the endpoint and on whether anything asked for it to be
 * expanded. Both shapes reduce to the same id here.
 */
export function customerId(customer: string | { id?: string } | null | undefined): string | null {
  if (typeof customer === 'string') return customer || null
  return customer?.id ?? null
}
