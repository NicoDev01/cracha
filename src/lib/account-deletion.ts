/** The word a user types to confirm deleting their account, per page language. Shared by dialog and route. */
export const ACCOUNT_DELETION_PHRASES = { de: 'LÖSCHEN', en: 'DELETE' } as const

/** The German word, which older callers and tests refer to. */
export const ACCOUNT_DELETION_PHRASE = ACCOUNT_DELETION_PHRASES.de

/**
 * NFC because macOS keyboards can produce "Ö" as "O" plus a combining
 * diaeresis, which looks identical and would otherwise never match. Either
 * language's word is accepted: the route cannot know which page asked.
 */
export function isAccountDeletionConfirmed(value: unknown): boolean {
  if (typeof value !== 'string') return false
  const typed = value.normalize('NFC').trim()
  return Object.values(ACCOUNT_DELETION_PHRASES).some((phrase) => typed === phrase)
}
