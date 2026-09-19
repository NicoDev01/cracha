import { expect, it } from 'vitest'
import { safeAuthNext } from './redirect'

it.each([null, '', 'https://evil.example', '//evil.example', '/\\evil.example', 'javascript:alert(1)', '/a/..//evil.example', '/\nevil.example'])('rejects unsafe auth destination %j', (value) => {
  expect(safeAuthNext(value)).toBe('/dashboard')
})
it.each(['/dashboard', '/dashboard/chat?database=one', '/reset-password/new-password', '/dashboard#help'])('preserves local auth destination %s', (value) => {
  expect(safeAuthNext(value)).toBe(value)
})
