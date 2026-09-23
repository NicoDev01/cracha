'use client'

import { useAuthStore } from '@/stores/auth-store'
import { useChatStore } from '@/stores/chat-store'
import { useCrawlStore } from '@/stores/crawl-store'

export const ACCOUNT_DELETED_URL = '/?konto=geloescht'

/**
 * After the server deleted the account: nothing of it may stay in this
 * browser. Chat histories, crawl history and the selected knowledge base live
 * in zustand's localStorage entries, the session in Supabase's cookies. The
 * stores are emptied first so no pending write puts the data back, then their
 * storage is removed, then the session.
 */
export async function finishAccountDeletion(): Promise<void> {
  useChatStore.getState().claimFor(null)
  useCrawlStore.getState().claimFor('')
  useChatStore.persist.clearStorage()
  useCrawlStore.persist.clearStorage()
  useAuthStore.persist.clearStorage()
  await useAuthStore.getState().logout()
  // A full navigation, so no in-memory state of the old session survives.
  window.location.replace(ACCOUNT_DELETED_URL)
}
