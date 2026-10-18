import type { Locale } from '@/i18n/routing'

export const PURCHASE_TERMS_VERSION = '2026-09-20'

/**
 * The declaration a buyer ticks before checkout, in the language the dialog
 * shows. The exact wording shown is stored on the Stripe session.
 */
export const PURCHASE_CONSENT = {
  de: 'Ich verlange, dass CraCha vor Ablauf der Widerrufsfrist mit der Leistung beginnt. Mein Widerrufsrecht bleibt bestehen; bei Widerruf kann für bereits erbrachte Leistungen anteiliger Wertersatz anfallen.',
  en: 'I request that CraCha starts providing the service before the withdrawal period ends. My right of withdrawal remains; if I withdraw, proportionate compensation may be due for services already provided.',
} as const satisfies Record<Locale, string>

/** The German wording, kept for callers that predate the English version. */
export const PURCHASE_CONSENT_TEXT = PURCHASE_CONSENT.de
