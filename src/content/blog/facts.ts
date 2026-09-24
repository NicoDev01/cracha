import { CREDIT_PACKAGES, CREDITS } from "@/lib/credit-tariff";

/**
 * Numbers the articles quote about CraCha itself, taken from the tariff so a
 * price change cannot leave a published post saying something else.
 */
const euro = new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR", minimumFractionDigits: 0, maximumFractionDigits: 2 });

export const welcomeCredits = CREDITS.welcome;
export const maxDatabases = CREDITS.maxDatabases;
export const starterPages = 20;
export const starterQuestions = Math.floor((CREDITS.welcome - starterPages * CREDITS.perPage) / CREDITS.perChatMessage);
export const cheapestPackage = euro.format(Math.min(...CREDIT_PACKAGES.map((pack) => pack.priceCents)) / 100);
export const pagesCost = (pages: number) => pages * CREDITS.perPage;
