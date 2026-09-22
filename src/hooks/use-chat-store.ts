'use client'

import { useEffect } from 'react'
import { useChatStore } from '@/stores/chat-store'
import { useAuthStore } from '@/stores/auth-store'
import { useMounted } from '@/hooks/use-mounted'

useAuthStore.subscribe(state => {
  if (state.isInitialized) useChatStore.getState().claimFor(state.user?.id ?? null)
})

/**
 * Hydrated hook for Next.js SSR compatibility.
 * Returns empty initial state during SSR / first render to avoid hydration mismatch,
 * then activates persisted local storage state immediately on mount.
 */
export function useHydratedChatStore() {
  const store = useChatStore()
  const owner = useAuthStore(state => state.user?.id ?? null)
  const initialized = useAuthStore(state => state.isInitialized)
  const hydrated = useMounted()

  useEffect(() => {
    if (initialized) store.claimFor(owner)
  }, [initialized, owner, store])

  if (!hydrated || !initialized || owner !== store.ownerId) {
    return {
      ...store,
      messages: [],
      conversations: {},
      selectedDatabase: null,
      isLoading: false,
      isStreaming: false,
      byokApiKey: null,
      byokModel: null,
    }
  }

  return store
}
