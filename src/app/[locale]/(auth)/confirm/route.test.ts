import { beforeEach, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'
const auth = vi.hoisted(() => ({ verifyOtp: vi.fn(), exchangeCodeForSession: vi.fn() }))
vi.mock('@/lib/supabase/server', () => ({ createClient: async () => ({ auth }) }))
import { GET } from './route'
const de = { params: Promise.resolve({ locale: 'de' }) }
const en = { params: Promise.resolve({ locale: 'en' }) }
beforeEach(() => {
  vi.resetAllMocks()
  auth.verifyOtp.mockResolvedValue({ error: null })
  auth.exchangeCodeForSession.mockResolvedValue({ error: null })
})
it('exchanges a recovery code and goes to the password page', async () => {
  const response = await GET(new NextRequest('https://cracha-app.com/confirm?code=test&next=/reset-password/new-password'), de)
  expect(auth.exchangeCodeForSession).toHaveBeenCalledExactlyOnceWith('test')
  expect(response.headers.get('location')).toBe('https://cracha-app.com/reset-password/new-password')
})
it('does not trust an injected forwarded host or external next value', async () => {
  const response = await GET(new NextRequest('https://cracha-app.com/confirm?token_hash=test&type=signup&next=//evil.example', { headers: { 'x-forwarded-host': 'evil.example' } }), de)
  expect(response.headers.get('location')).toBe('https://cracha-app.com/dashboard')
})
it('rejects unsupported token types', async () => {
  const response = await GET(new NextRequest('https://cracha-app.com/confirm?token_hash=test&type=invalid'), de)
  expect(auth.verifyOtp).not.toHaveBeenCalled()
  expect(response.headers.get('location')).toBe('https://cracha-app.com/auth-code-error')
})
it('shows the error page on expired confirmation', async () => {
  auth.verifyOtp.mockResolvedValue({ error: { message: 'expired' } })
  const response = await GET(new NextRequest('https://cracha-app.com/confirm?token_hash=test&type=signup'), de)
  expect(response.headers.get('location')).toBe('https://cracha-app.com/auth-code-error')
})
it('verifies the token hash from the mail templates and keeps next', async () => {
  const response = await GET(new NextRequest('https://cracha-app.com/confirm?token_hash=pkce_test&type=recovery&next=/reset-password/new-password'), de)
  expect(auth.verifyOtp).toHaveBeenCalledExactlyOnceWith({ type: 'recovery', token_hash: 'pkce_test' })
  expect(response.headers.get('location')).toBe('https://cracha-app.com/reset-password/new-password')
})
it('keeps an English visitor in English after confirming', async () => {
  const response = await GET(new NextRequest('https://cracha-app.com/en/confirm?token_hash=test&type=signup&next=/dashboard'), en)
  expect(response.headers.get('location')).toBe('https://cracha-app.com/en/dashboard')
  auth.verifyOtp.mockResolvedValue({ error: { message: 'expired' } })
  const failed = await GET(new NextRequest('https://cracha-app.com/en/confirm?token_hash=test&type=signup'), en)
  expect(failed.headers.get('location')).toBe('https://cracha-app.com/en/auth-code-error')
})
