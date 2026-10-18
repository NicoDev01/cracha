import { redirect } from "next/navigation";
import { getLocale } from "next-intl/server";

import { localizePath } from "./paths";
import type { Locale } from "./routing";

export async function getAppLocale(): Promise<Locale> {
  return (await getLocale()) as Locale;
}

/** redirect() to an internal path in the current request's language. */
export async function localizedRedirect(href: string): Promise<never> {
  redirect(localizePath(href, await getAppLocale()));
}
