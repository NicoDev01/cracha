'use client'

export async function apiFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const response = await fetch(input, {
    ...init,
    credentials: 'same-origin',
    cache: 'no-store',
  })
  if (response.status === 401) {
    window.dispatchEvent(new Event('cracha:auth-expired'))
  }
  return response
}
