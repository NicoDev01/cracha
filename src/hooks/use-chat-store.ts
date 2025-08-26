'use client'

import { useChatStore } from '@/stores/chat-store'

// Vereinfachter Hook ohne Persistierung (verhindert Hydration-Probleme)
export function useHydratedChatStore() {
    return useChatStore()
}