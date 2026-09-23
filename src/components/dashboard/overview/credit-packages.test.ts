import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { CREDIT_PACKAGES, CREDITS } from '@/lib/credit-tariff'

import { isLowBalance, PackageOptions, questionsFor, requestCheckout } from './credit-packages'

const costs = { page: CREDITS.perPage, chatMessage: CREDITS.perChatMessage }

describe('balance helpers', () => {
  it('counts whole answers and never goes negative', () => {
    expect(questionsFor(100, 5)).toBe(20)
    expect(questionsFor(9, 5)).toBe(1)
    expect(questionsFor(-40, 5)).toBe(0)
    expect(questionsFor(100, 0)).toBe(0)
  })

  it('flags a balance below ten answers as low', () => {
    expect(isLowBalance(49, 5)).toBe(true)
    expect(isLowBalance(50, 5)).toBe(false)
  })
})

describe('PackageOptions', () => {
  const render = (selected: string | null) => renderToStaticMarkup(createElement(PackageOptions, {
    packages: CREDIT_PACKAGES,
    selected,
    onSelect: () => {},
    costs,
  }))

  it('renders one radio per package with price and what it buys', () => {
    const html = render('S')
    expect(html.match(/role="radio"/g)).toHaveLength(CREDIT_PACKAGES.length)
    expect(html).toContain('1.250 Credits')
    expect(html).toContain('≈ 250 Fragen oder 1.250 Seiten')
    expect(html).toMatch(/10,00\s€/)
    expect(html).toMatch(/50,00\s€/)
  })

  it('marks exactly the selected package as checked', () => {
    const html = render('M')
    expect(html.match(/aria-checked="true"/g)).toHaveLength(1)
    const checked = html.slice(html.indexOf('aria-checked="true"'))
    expect(checked.slice(0, checked.indexOf('</button>'))).toContain('3.500 Credits')
  })
})

describe('requestCheckout', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('posts the package with accepted terms and returns the Stripe URL', async () => {
    const fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify({ url: 'https://checkout.stripe.com/x' }), { status: 200 }))
    vi.stubGlobal('fetch', fetch)
    await expect(requestCheckout('M')).resolves.toBe('https://checkout.stripe.com/x')
    expect(fetch).toHaveBeenCalledWith('/api/stripe/checkout', expect.objectContaining({ method: 'POST' }))
    expect(JSON.parse(fetch.mock.calls[0][1].body)).toEqual({ package: 'M', acceptTerms: true })
  })

  it('surfaces the server error instead of redirecting', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ error: 'Bitte bestätige die Bedingungen.' }), { status: 400 })))
    await expect(requestCheckout('S')).rejects.toThrow('Bitte bestätige die Bedingungen.')
  })
})
