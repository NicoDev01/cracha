// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { act, cleanup, renderHook, waitFor } from '@testing-library/react'

vi.mock('@/stores/auth-store', () => ({
  useAuthStore: (select: (state: { user: { id: string } }) => unknown) => select({ user: { id: 'user-1' } }),
}))
const { useCredits } = await import('./use-credits')

const fetchMock = vi.fn()
const body = {
  credits: { balance: 61, reserved: 0, databases: 1, maxDatabases: 25, costs: { page: 1, chatMessage: 5 } },
  entries: [],
  packages: [],
}

beforeEach(() => {
  fetchMock.mockReset()
  fetchMock.mockImplementation(async () => new Response(JSON.stringify(body), { status: 200 }))
  vi.stubGlobal('fetch', fetchMock)
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

it('loads the balance once for every component that shows it', async () => {
  const header = renderHook(() => useCredits())
  const card = renderHook(() => useCredits())
  const form = renderHook(() => useCredits())

  await waitFor(() => expect(form.result.current.credits?.balance).toBe(61))
  expect(header.result.current.credits?.balance).toBe(61)
  expect(card.result.current.credits?.balance).toBe(61)
  expect(fetchMock).toHaveBeenCalledTimes(1)
})

it('loads once more, not once per component, after a change', async () => {
  renderHook(() => useCredits())
  renderHook(() => useCredits())
  await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1))

  act(() => { window.dispatchEvent(new Event('cracha:credits-changed')) })

  await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2))
  await new Promise((resolve) => setTimeout(resolve, 20))
  expect(fetchMock).toHaveBeenCalledTimes(2)
})
