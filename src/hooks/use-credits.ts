'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useAuthStore } from '@/stores/auth-store'

export interface CreditState {
  blocked?: boolean
  balance: number
  reserved: number
  databases: number
  maxDatabases: number
  costs: { page: number; chatMessage: number }
}
export interface CreditEntry { amount: number; kind: string; detail: string | null; created_at: string }
export interface CreditPackage { id: string; credits: number; priceCents: number; label: string }
interface CreditData { credits: CreditState; entries: CreditEntry[]; packages: CreditPackage[] }

/** No browser-persisted balance: every account receives fresh server data. */
export function useCredits() {
  const owner = useAuthStore(state => state.user?.id)
  const ownerRef = useRef(owner)
  const request = useRef(0)
  const [data, setData] = useState<{ owner: string; value: CreditData } | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    ownerRef.current = owner
  }, [owner])

  const refresh = useCallback(async () => {
    const sequence = ++request.current
    if (!owner) { setData(null); setLoading(false); setError(null); return }
    setLoading(true)
    setError(null)
    try {
      const response = await fetch('/api/credits', { cache: 'no-store', signal: AbortSignal.timeout(15_000) })
      const result = await response.json() as CreditData & { error?: string }
      if (!response.ok || !result.credits) throw new Error(result.error || 'Guthaben konnte nicht geladen werden.')
      if (ownerRef.current === owner && request.current === sequence) {
        setData({ owner, value: result }); setError(null)
      }
    } catch (cause) {
      if (ownerRef.current === owner && request.current === sequence) setError(cause instanceof Error ? cause.message : 'Guthaben konnte nicht geladen werden.')
    } finally {
      if (ownerRef.current === owner && request.current === sequence) setLoading(false)
    }
  }, [owner])
  useEffect(() => {
    if (!owner) return
    let active = true
    const sequence = ++request.current

    fetch('/api/credits', { cache: 'no-store', signal: AbortSignal.timeout(15_000) })
      .then(async (response) => {
        const result = await response.json() as CreditData & { error?: string }
        if (!response.ok || !result.credits) throw new Error(result.error || 'Guthaben konnte nicht geladen werden.')
        if (active && ownerRef.current === owner && request.current === sequence) {
          setData({ owner, value: result })
          setError(null)
        }
      })
      .catch((cause) => {
        if (active && ownerRef.current === owner && request.current === sequence) {
          setError(cause instanceof Error ? cause.message : 'Guthaben konnte nicht geladen werden.')
        }
      })
      .finally(() => {
        if (active && ownerRef.current === owner && request.current === sequence) {
          setLoading(false)
        }
      })

    const reload = () => { void refresh() }
    window.addEventListener('cracha:credits-changed', reload)
    window.addEventListener('focus', reload)
    return () => {
      active = false
      window.removeEventListener('cracha:credits-changed', reload)
      window.removeEventListener('focus', reload)
    }
  }, [owner, refresh])
  const current = owner && data && data.owner === owner ? data.value : null
  return {
    credits: current?.credits ?? null,
    entries: current?.entries ?? [],
    packages: current?.packages ?? [],
    loading: owner ? loading : false,
    error: owner ? error : null,
    refresh,
  }
}
