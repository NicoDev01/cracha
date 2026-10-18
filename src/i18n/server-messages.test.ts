import { describe, expect, it } from 'vitest'

import { tr } from './server-messages'

describe('tr', () => {
  it('leaves German as it is', () => {
    expect(tr('de', 'Wissensbasis nicht gefunden.')).toBe('Wissensbasis nicht gefunden.')
  })

  it('translates exact and composed messages', () => {
    expect(tr('en', 'Wissensbasis nicht gefunden.')).toBe('Knowledge base not found.')
    expect(tr('en', 'Die Antwort konnte nicht erzeugt werden. Credits wurden erstattet.')).toBe('The answer could not be generated. Credits were refunded.')
    expect(tr('en', 'Von der Website abgelehnt (HTTP 418)')).toBe('Refused by the website (HTTP 418)')
    expect(tr('en', 'example.com war nicht erreichbar. Prüfe die Adresse und versuche es erneut.')).toBe('example.com was unreachable. Check the address and try again.')
    expect(tr('en', 'Dein Guthaben reicht nicht: 1.250 Credits verfügbar. Benötigt werden 2.000. Lade Guthaben auf, um weiterzumachen.'))
      .toBe('Your balance isn’t enough: 1,250 credits available. 2,000 needed. Top up to continue.')
  })

  it('keeps an unknown message rather than inventing one', () => {
    expect(tr('en', 'Something only the worker knows')).toBe('Something only the worker knows')
  })
})
