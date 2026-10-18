'use client'

import { useState } from 'react'
import { Loader2 } from 'lucide-react'

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ACCOUNT_DELETION_PHRASES, isAccountDeletionConfirmed } from '@/lib/account-deletion'
import { useAppLocale } from '@/i18n/navigation'

const copy = {
  de: {
    failed: 'Kontolöschung fehlgeschlagen. Dein Konto wurde nicht gelöscht. Bitte versuche es erneut.',
    offline: 'Keine Verbindung. Dein Konto wurde möglicherweise nicht gelöscht. Bitte versuche es erneut.',
    trigger: 'Konto löschen',
    title: 'Konto endgültig löschen?',
    intro: 'Diese Aktion kann nicht rückgängig gemacht werden. Dauerhaft gelöscht werden:',
    items: [
      'alle deine Wissensbasen mit ihren indexierten Inhalten',
      'laufende Crawls, die dafür abgebrochen werden',
      'alle deine Chats',
      'dein Crawl-Verlauf in diesem Browser',
      'dein restliches Guthaben, auch gekaufte Credits – ohne Erstattung',
      'dein Zugang mit E-Mail-Adresse und Name',
    ],
    records: 'Zahlungsbelege bewahren wir wegen gesetzlicher Aufbewahrungspflichten auf, aber ohne Verbindung zu deinem Konto.',
    typeBefore: 'Gib zur Bestätigung',
    typeAfter: 'ein',
    cancel: 'Abbrechen',
    deleting: 'Konto wird gelöscht…',
    confirm: 'Konto endgültig löschen',
  },
  en: {
    failed: 'Account deletion failed. Your account was not deleted. Please try again.',
    offline: 'No connection. Your account may not have been deleted. Please try again.',
    trigger: 'Delete account',
    title: 'Delete your account permanently?',
    intro: 'This action can’t be undone. The following will be deleted permanently:',
    items: [
      'all your knowledge bases with their indexed content',
      'running crawls, which will be cancelled',
      'all your chats',
      'your crawl history in this browser',
      'your remaining balance, including purchased credits – without refund',
      'your access with email address and name',
    ],
    records: 'We keep payment records because of statutory retention obligations, but without any link to your account.',
    typeBefore: 'Type',
    typeAfter: 'to confirm',
    cancel: 'Cancel',
    deleting: 'Deleting account…',
    confirm: 'Delete account permanently',
  },
} as const

const DANGER = 'bg-error-600 text-white hover:bg-error-700'

export function DeleteAccountDialog({ onDeleted }: { onDeleted: () => Promise<void> | void }) {
  const locale = useAppLocale()
  const t = copy[locale]
  const [open, setOpen] = useState(false)
  const [phrase, setPhrase] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const confirmed = isAccountDeletionConfirmed(phrase)

  const changeOpen = (next: boolean) => {
    if (busy) return
    setOpen(next)
    if (!next) {
      setPhrase('')
      setError('')
    }
  }

  const deleteAccount = async () => {
    if (!confirmed || busy) return
    setBusy(true)
    setError('')
    try {
      const response = await fetch('/api/account/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirm: phrase }),
      })
      const body = (await response.json().catch(() => null)) as { success?: boolean; error?: string } | null
      if (!response.ok || !body?.success) {
        setError(body?.error ?? t.failed)
        setBusy(false)
        return
      }
      await onDeleted()
    } catch {
      setError(t.offline)
      setBusy(false)
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={changeOpen}>
      <AlertDialogTrigger asChild>
        <Button type="button" className={DANGER}>{t.trigger}</Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t.title}</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-3 text-left">
              <p>{t.intro}</p>
              <ul className="list-disc space-y-1 pl-5">
                {t.items.map((item) => <li key={item}>{item}</li>)}
              </ul>
              <p>{t.records}</p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="space-y-2">
          <label htmlFor="delete-account-confirm" className="block text-sm font-medium">
            {t.typeBefore} <strong>{ACCOUNT_DELETION_PHRASES[locale]}</strong> {t.typeAfter}
          </label>
          <Input
            id="delete-account-confirm"
            value={phrase}
            onChange={(event) => setPhrase(event.target.value)}
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
            disabled={busy}
          />
          {error && <p role="alert" className="text-sm text-error-600">{error}</p>}
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={busy}>{t.cancel}</AlertDialogCancel>
          <AlertDialogAction
            onClick={(event) => {
              // Stays open while the request runs and when it fails.
              event.preventDefault()
              void deleteAccount()
            }}
            disabled={!confirmed || busy}
            className={DANGER}
          >
            {busy && <Loader2 className="mr-2 size-4 animate-spin" />}
            {busy ? t.deleting : t.confirm}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
