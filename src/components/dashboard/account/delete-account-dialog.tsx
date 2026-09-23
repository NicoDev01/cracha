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
import { ACCOUNT_DELETION_PHRASE, isAccountDeletionConfirmed } from '@/lib/account-deletion'

const DANGER = 'bg-error-600 text-white hover:bg-error-700'

export function DeleteAccountDialog({ onDeleted }: { onDeleted: () => Promise<void> | void }) {
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
        setError(body?.error ?? 'Kontolöschung fehlgeschlagen. Dein Konto wurde nicht gelöscht. Bitte versuche es erneut.')
        setBusy(false)
        return
      }
      await onDeleted()
    } catch {
      setError('Keine Verbindung. Dein Konto wurde möglicherweise nicht gelöscht. Bitte versuche es erneut.')
      setBusy(false)
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={changeOpen}>
      <AlertDialogTrigger asChild>
        <Button type="button" className={DANGER}>Konto löschen</Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Konto endgültig löschen?</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-3 text-left">
              <p>Diese Aktion kann nicht rückgängig gemacht werden. Dauerhaft gelöscht werden:</p>
              <ul className="list-disc space-y-1 pl-5">
                <li>alle deine Wissensbasen mit ihren indexierten Inhalten</li>
                <li>laufende Crawls, die dafür abgebrochen werden</li>
                <li>dein Chat- und Crawl-Verlauf in diesem Browser</li>
                <li>dein restliches Guthaben, auch gekaufte Credits – ohne Erstattung</li>
                <li>dein Zugang mit E-Mail-Adresse und Name</li>
              </ul>
              <p>
                Zahlungsbelege bewahren wir wegen gesetzlicher Aufbewahrungspflichten auf, aber ohne
                Verbindung zu deinem Konto.
              </p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="space-y-2">
          <label htmlFor="delete-account-confirm" className="block text-sm font-medium">
            Gib zur Bestätigung <strong>{ACCOUNT_DELETION_PHRASE}</strong> ein
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
          <AlertDialogCancel disabled={busy}>Abbrechen</AlertDialogCancel>
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
            {busy ? 'Konto wird gelöscht…' : 'Konto endgültig löschen'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
