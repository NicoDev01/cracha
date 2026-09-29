import { describe, expect, it } from 'vitest'

import { cleanTitle, groupByDatabase, provisionalTitle } from './history'

describe('chat titles', () => {
  it('uses the first line of the question until a title is generated', () => {
    expect(provisionalTitle('  Was kostet das?\nUnd wann?')).toBe('Was kostet das?')
    expect(provisionalTitle('')).toBe('Neuer Chat')
    const long = provisionalTitle('Welche Voraussetzungen gelten für die Anmeldung zum Wintersemester an der Hochschule?')
    expect(long.length).toBeLessThanOrEqual(72)
    expect(long).toMatch(/ …$/)
  })
  it('reduces a model reply to one plain line', () => {
    expect(cleanTitle('Titel: "Preise der Pakete".\nWeitere Erklärung')).toBe('Preise der Pakete')
    expect(cleanTitle('**Anmeldung** Wintersemester')).toBe('Anmeldung Wintersemester')
    expect(cleanTitle('„Öffnungszeiten“')).toBe('Öffnungszeiten')
    expect(cleanTitle('<b>x</b>')).toBe('x')
    expect(cleanTitle('   ')).toBe('')
    expect(cleanTitle('a'.repeat(300)).length).toBeLessThanOrEqual(100)
  })
})

describe('grouping by knowledge base', () => {
  const chat = (id: string, databaseId: string, updatedAt: string) => ({ id, databaseId, title: id, createdAt: updatedAt, updatedAt })
  it('puts the most recently used base first and its newest chat first', () => {
    const groups = groupByDatabase([
      chat('a1', 'A', '2026-09-28T10:00:00+00:00'),
      chat('b1', 'B', '2026-09-29T09:00:00.000Z'),
      chat('a2', 'A', '2026-09-29T08:00:00+00:00'),
      chat('b2', 'B', '2026-09-27T10:00:00+00:00'),
    ])
    expect(groups.map((group) => group.databaseId)).toEqual(['B', 'A'])
    expect(groups[0].chats.map((item) => item.id)).toEqual(['b1', 'b2'])
    expect(groups[1].chats.map((item) => item.id)).toEqual(['a2', 'a1'])
  })
})
