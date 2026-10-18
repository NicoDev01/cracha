import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import { Suspense } from "react";

import "../globals.css";
import { AccountDeletedNotice } from "@/components/account-deleted-notice";
import { siteDescription, siteTitle } from "@/config/site";
import { routing, type Locale } from "@/i18n/routing";

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

/**
 * The fallback for every route that does not set its own.
 *
 * The title used to be "Intelligente Wissensspeicher durch RAG-Technologie" —
 * three words nobody types into a search box, and none of them naming what the
 * thing is.
 */
export async function generateMetadata({ params }: LayoutProps<"/[locale]">): Promise<Metadata> {
  const locale = (await params).locale as Locale;
  return {
    title: { default: siteTitle[locale], template: "%s | CraCha" },
    description: siteDescription[locale],
  };
}

// Runs before the browser paints anything. React applies the theme only after
// hydration, which is far too late — the page would paint light and snap to
// dark, or in the sign-in card's case paint dark and snap to light.
//
// Two reasons to end up light: the visitor chose it, or this is one of the
// sign-in pages. Those are a single light card by design and have no dark
// version; the layout takes the class off again on client-side navigation,
// where this script does not run a second time.
const applyThemeBeforePaint = `
try {
  var alwaysLight = /^\\/(en\\/)?(login|register|reset-password|confirm|auth-code-error|auth\\/)/
  if (alwaysLight.test(location.pathname) || localStorage.getItem('theme') === 'light') {
    document.documentElement.classList.remove('dark')
  }
} catch (error) {}
`;

export default async function LocaleLayout({ children, params }: LayoutProps<"/[locale]">) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  return (
    <html lang={locale} suppressHydrationWarning className="dark overflow-x-hidden">
      <head>
        <script dangerouslySetInnerHTML={{ __html: applyThemeBeforePaint }} />
      </head>
      <body suppressHydrationWarning>
        <NextIntlClientProvider locale={locale} messages={{}}>
          {children}
          <Suspense fallback={null}>
            <AccountDeletedNotice />
          </Suspense>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
