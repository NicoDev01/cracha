import { describe, expect, it } from 'vitest'

import { CREDIT_PACKAGES } from '@/lib/credit-tariff'
import { landingFaq } from '@/lib/marketing/faq'
import { faqPageJsonLd, serializeJsonLd, softwareApplicationJsonLd } from '@/lib/marketing/structured-data'

describe('structured data', () => {
  it('offers exactly the credit packs of the tariff', () => {
    expect(softwareApplicationJsonLd.offers).toHaveLength(CREDIT_PACKAGES.length)
    expect(softwareApplicationJsonLd.offers.map((offer) => [offer.price, offer.priceCurrency])).toEqual([
      ['10.00', 'EUR'],
      ['25.00', 'EUR'],
      ['50.00', 'EUR'],
    ])
  })

  it('builds the FAQPage from the same items the page renders', () => {
    const faq = faqPageJsonLd(landingFaq)
    expect(faq.mainEntity).toHaveLength(landingFaq.length)
    expect(faq.mainEntity[0]).toEqual({
      '@type': 'Question',
      name: landingFaq[0].question,
      acceptedAnswer: { '@type': 'Answer', text: landingFaq[0].answer },
    })
  })

  it('states the price in one FAQ answer', () => {
    const cost = landingFaq.filter((item) => item.answer.includes('kein Abo'))
    expect(cost).toHaveLength(1)
    expect(cost[0].answer).toContain('100 Start-Credits gratis')
    expect(cost[0].answer).toMatch(/ab 10\s€/)
  })

  it('cannot close the script tag it is embedded in', () => {
    const payload = { text: '</script><script>alert(1)</script>' }
    const html = serializeJsonLd(payload)
    expect(html).not.toContain('</script>')
    expect(JSON.parse(html)).toEqual(payload)
  })
})
