'use client'

import { usePathname, useSearchParams } from 'next/navigation'
import { X } from 'lucide-react'

/**
 * Where account deletion lands: `/?konto=geloescht`. Mounted in the root
 * layout so the start page itself stays untouched; renders nothing elsewhere.
 */
export function AccountDeletedNotice() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  if (pathname !== '/' || searchParams.get('konto') !== 'geloescht') return null

  // Next keeps useSearchParams in sync with history.replaceState, which also
  // keeps a reload from showing the notice again.
  const dismiss = () => window.history.replaceState(null, '', '/')

  return (
    <div
      role="status"
      className="fixed inset-x-4 top-4 z-[100] mx-auto flex max-w-lg items-start gap-3 rounded-xl bg-emerald-700 px-4 py-3 text-sm text-white shadow-lg"
    >
      <p className="flex-1">Dein Konto wurde gelöscht. Danke, dass du CraCha genutzt hast.</p>
      <button type="button" onClick={dismiss} aria-label="Hinweis schließen" className="shrink-0 rounded p-0.5 hover:bg-white/15">
        <X className="size-4" />
      </button>
    </div>
  )
}
