'use client'

import { useState } from 'react'
import { Link, useAppLocale } from "@/i18n/navigation";

const copy = {
  de: {
    saved: 'Dein Name wurde gespeichert.',
    saveFailed: 'Speichern fehlgeschlagen. Bitte versuche es erneut.',
    email: 'E-Mail:',
    name: 'Name (optional)',
    saving: 'Wird gespeichert…',
    save: 'Speichern',
    password: 'Passwort zurücksetzen oder vergeben',
    google: 'Bei Anmeldung über Google verwaltest du dein Google-Passwort bei Google.',
    title: 'Mein Konto',
    subtitle: 'Profil, Zugang und Hilfe an einem Ort.',
    data: 'Guthaben & Daten',
    balance: 'Guthaben, Credit-Pakete und Buchungen ansehen',
    chats: 'Deine Chats werden in deinem Konto gespeichert. Du kannst sie im Chat als Markdown exportieren oder löschen.',
    toChat: 'Zum Chat und Export',
    help: 'Hilfe',
    support: 'Support kontaktieren',
    copyOfData: 'Für eine Kopie deiner Daten schreibe uns von deiner Konto-E-Mail-Adresse.',
    delete: 'Konto löschen',
    deleteText: 'Löscht dein Konto mit allen Wissensbasen, deinem Verlauf und deinem restlichen Guthaben sofort und endgültig. Gesetzlich aufzubewahrende Zahlungsbelege bleiben ohne Bezug zu deinem Konto erhalten.',
  },
  en: {
    saved: 'Your name has been saved.',
    saveFailed: 'Saving failed. Please try again.',
    email: 'Email:',
    name: 'Name (optional)',
    saving: 'Saving…',
    save: 'Save',
    password: 'Reset or set a password',
    google: 'If you sign in with Google, you manage your Google password with Google.',
    title: 'My account',
    subtitle: 'Profile, access and help in one place.',
    data: 'Balance & data',
    balance: 'See balance, credit packs and transactions',
    chats: 'Your chats are stored in your account. You can export them as Markdown or delete them in the chat.',
    toChat: 'Go to chat and export',
    help: 'Help',
    support: 'Contact support',
    copyOfData: 'For a copy of your data, email us from your account’s email address.',
    delete: 'Delete account',
    deleteText: 'Deletes your account with all knowledge bases, your history and your remaining balance immediately and permanently. Payment records that must be kept by law remain, without any link to your account.',
  },
} as const
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useAuthStore } from '@/stores/auth-store'
import { createClient } from '@/lib/supabase/client'
import { siteConfig } from '@/config/site'
import { DeleteAccountDialog } from '@/components/dashboard/account/delete-account-dialog'
import { finishAccountDeletion } from '@/lib/account/finish-account-deletion'

function AccountForm({ user }: { user: ReturnType<typeof useAuthStore.getState>['user'] }) {
  const t = copy[useAppLocale()]
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
      setNotice(t.saved)
    } catch {
      setNotice(t.saveFailed)
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={save} className="space-y-4 rounded-2xl border border-gray-200 p-6 dark:border-gray-800">
      <p className="break-all text-sm">{t.email} {user?.email}</p>
      <label htmlFor="account-name" className="block text-sm font-medium">{t.name}</label>
      <Input
        id="account-name"
        value={name ?? user?.name ?? ''}
        onChange={event => setName(event.target.value)}
        maxLength={100}
        autoComplete="name"
      />
      <Button type="submit" disabled={busy || !user}>
        {busy ? t.saving : t.save}
      </Button>
      {notice && <p role="status" className="text-sm">{notice}</p>}
      <Link href="/reset-password" className="block text-sm underline">{t.password}</Link>
      <p className="text-xs text-gray-500">{t.google}</p>
    </form>
  )
}

export default function AccountPage() {
  const user = useAuthStore(state => state.user)
  const t = copy[useAppLocale()]

  return (
    <div className="mx-auto max-w-2xl space-y-8 text-gray-800 dark:text-gray-200">
      <div>
        <h1 className="text-2xl font-semibold">{t.title}</h1>
        <p className="mt-2 text-sm text-gray-500">{t.subtitle}</p>
      </div>

      <AccountForm key={user?.id ?? 'anon'} user={user} />

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">{t.data}</h2>
        <Link href="/dashboard#guthaben" className="block underline">{t.balance}</Link>
        <p className="text-sm">{t.chats}</p>
        <Link href="/dashboard/chat" className="inline-block underline">{t.toChat}</Link>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">{t.help}</h2>
        <a href={`mailto:${siteConfig.mailSupport}`} className="block underline">{t.support}</a>
        <p className="text-sm">{t.copyOfData}</p>
      </section>

      <section className="space-y-3 rounded-2xl border border-error-600/40 p-6">
        <h2 className="text-lg font-semibold">{t.delete}</h2>
        <p className="text-sm">{t.deleteText}</p>
        <DeleteAccountDialog onDeleted={finishAccountDeletion} />
      </section>
    </div>
  )
}
