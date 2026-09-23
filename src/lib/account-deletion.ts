/** The word a user types to confirm deleting their account. Shared by dialog and route. */
export const ACCOUNT_DELETION_PHRASE = 'LÖSCHEN'

/**
 * NFC because macOS keyboards can produce "Ö" as "O" plus a combining
 * diaeresis, which looks identical and would otherwise never match.
 */
export function isAccountDeletionConfirmed(value: unknown): boolean {
  return typeof value === 'string' && value.normalize('NFC').trim() === ACCOUNT_DELETION_PHRASE
}
