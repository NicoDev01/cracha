import { formatEuro } from "@/i18n/copy";
import { CREDIT_PACKAGES, CREDITS } from "@/lib/credit-tariff";

/**
 * Numbers the articles quote about CraCha itself, taken from the tariff so a
 * price change cannot leave a published post saying something else.
 */
const cheapestCents = Math.min(...CREDIT_PACKAGES.map((pack) => pack.priceCents));

export const welcomeCredits = CREDITS.welcome;
export const maxDatabases = CREDITS.maxDatabases;
export const starterPages = 20;
export const starterQuestions = Math.floor((CREDITS.welcome - starterPages * CREDITS.perPage) / CREDITS.perChatMessage);
export const cheapestPackage = formatEuro(cheapestCents, "de");
export const cheapestPackageEn = formatEuro(cheapestCents, "en");
export const pagesCost = (pages: number) => pages * CREDITS.perPage;
