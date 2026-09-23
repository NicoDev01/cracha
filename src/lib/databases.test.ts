import { describe, expect, it } from 'vitest'

import { chatHref, databaseFromChatQuery } from './databases'

describe('chat preselection link', () => {
  it('round-trips a knowledge base id through the chat URL', () => {
    const href = chatHref('produkt doku-1a2b3c4d')
    expect(href).toBe('/dashboard/chat?wissensbasis=produkt%20doku-1a2b3c4d')
    expect(databaseFromChatQuery(href.slice(href.indexOf('?')))).toBe('produkt doku-1a2b3c4d')
  })

  it('links to the plain chat without an id', () => {
    expect(chatHref()).toBe('/dashboard/chat')
    expect(chatHref('')).toBe('/dashboard/chat')
  })

  it('ignores a missing, blank or oversized parameter', () => {
    expect(databaseFromChatQuery('')).toBeNull()
    expect(databaseFromChatQuery('?wissensbasis=')).toBeNull()
    expect(databaseFromChatQuery('?wissensbasis=%20%20')).toBeNull()
    expect(databaseFromChatQuery(`?wissensbasis=${'a'.repeat(201)}`)).toBeNull()
    expect(databaseFromChatQuery('?andere=1')).toBeNull()
  })
})
