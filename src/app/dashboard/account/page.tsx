'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useAuthStore } from '@/stores/auth-store'
import { createClient } from '@/lib/supabase/client'
import { siteConfig } from '@/config/site'
import { DeleteAccountDialog } from '@/components/dashboard/account/delete-account-dialog'
import { finishAccountDeletion } from '@/lib/account/finish-account-deletion'

function AccountForm({ user }: { user: ReturnType<typeof useAuthStore.getState>['user'] }) {
  const [name, setName] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState('')

  const save = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!user) return
    setBusy(true)
    setNotice('')
    try {
      const value = (name ?? user.name).trim()
      const { error } = await createClient().auth.updateUser({ data: { name: value } })
      if (error) throw error
      const current = useAuthStore.getState().user
      if (current?.id === user.id) useAuthStore.setState({ user: { ...current, name: value } })
      setNotice('Dein Name wurde gespeichert.')
    } catch {
      setNotice('Speichern fehlgeschlagen. Bitte versuche es erneut.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={save} className="space-y-4 rounded-2xl border border-gray-200 p-6 dark:border-gray-800">
      <p className="break-all text-sm">E-Mail: {user?.email}</p>
      <label htmlFor="account-name" className="block text-sm font-medium">Name (optional)</label>
      <Input
        id="account-name"
        value={name ?? user?.name ?? ''}
        onChange={event => setName(event.target.value)}
        maxLength={100}
        autoComplete="name"
      />
      <Button type="submit" disabled={busy || !user}>
        {busy ? 'Wird gespeichert…' : 'Speichern'}
      </Button>
      {notice && <p role="status" className="text-sm">{notice}</p>}
      <Link href="/reset-password" className="block text-sm underline">Passwort zurücksetzen oder vergeben</Link>
      <p className="text-xs text-gray-500">Bei Anmeldung über Google verwaltest du dein Google-Passwort bei Google.</p>
    </form>
  )
}

export default function AccountPage() {
  const user = useAuthStore(state => state.user)

  return (
    <div className="mx-auto max-w-2xl space-y-8 text-gray-800 dark:text-gray-200">
      <div>
        <h1 className="text-2xl font-semibold">Mein Konto</h1>
        <p className="mt-2 text-sm text-gray-500">Profil, Zugang und Hilfe an einem Ort.</p>
      </div>

      <AccountForm key={user?.id ?? 'anon'} user={user} />

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Guthaben & Daten</h2>
        <Link href="/dashboard#guthaben" className="block underline">Guthaben, Credit-Pakete und Buchungen ansehen</Link>
        <p className="text-sm">Deine Chatverläufe liegen in diesem Browser. Du kannst sie im Chat als Markdown exportieren oder löschen. Eine Synchronisierung mit anderen Geräten findet nicht statt.</p>
        <Link href="/dashboard/chat" className="inline-block underline">Zum Chat und Export</Link>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Hilfe</h2>
        <a href={`mailto:${siteConfig.mailSupport}`} className="block underline">Support kontaktieren</a>
        <p className="text-sm">Für eine Kopie deiner Daten schreibe uns von deiner Konto-E-Mail-Adresse.</p>
      </section>

      <section className="space-y-3 rounded-2xl border border-error-600/40 p-6">
        <h2 className="text-lg font-semibold">Konto löschen</h2>
        <p className="text-sm">Löscht dein Konto mit allen Wissensbasen, deinem Verlauf und deinem restlichen Guthaben sofort und endgültig. Gesetzlich aufzubewahrende Zahlungsbelege bleiben ohne Bezug zu deinem Konto erhalten.</p>
        <DeleteAccountDialog onDeleted={finishAccountDeletion} />
      </section>
    </div>
  )
}
