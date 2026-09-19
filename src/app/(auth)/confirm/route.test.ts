import { beforeEach, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'
const auth = vi.hoisted(() => ({ verifyOtp: vi.fn(), exchangeCodeForSession: vi.fn() }))
vi.mock('@/lib/supabase/server', () => ({ createClient: async () => ({ auth }) }))
import { GET } from './route'
beforeEach(() => {
  vi.resetAllMocks()
  auth.verifyOtp.mockResolvedValue({ error: null })
  auth.exchangeCodeForSession.mockResolvedValue({ error: null })
})
it('exchanges a recovery code and goes to the password page', async () => {
  const response = await GET(new NextRequest('https://cracha-app.com/confirm?code=test&next=/reset-password/new-password'))
  expect(auth.exchangeCodeForSession).toHaveBeenCalledExactlyOnceWith('test')
  expect(response.headers.get('location')).toBe('https://cracha-app.com/reset-password/new-password')
})
it('does not trust an injected forwarded host or external next value', async () => {
  const response = await GET(new NextRequest('https://cracha-app.com/confirm?token_hash=test&type=signup&next=//evil.example', { headers: { 'x-forwarded-host': 'evil.example' } }))
  expect(response.headers.get('location')).toBe('https://cracha-app.com/dashboard')
})
it('rejects unsupported token types', async () => {
  const response = await GET(new NextRequest('https://cracha-app.com/confirm?token_hash=test&type=invalid'))
  expect(auth.verifyOtp).not.toHaveBeenCalled()
  expect(response.headers.get('location')).toBe('https://cracha-app.com/auth-code-error')
})
it('shows the error page on expired confirmation', async () => {
  auth.verifyOtp.mockResolvedValue({ error: { message: 'expired' } })
  const response = await GET(new NextRequest('https://cracha-app.com/confirm?token_hash=test&type=signup'))
  expect(response.headers.get('location')).toBe('https://cracha-app.com/auth-code-error')
})
