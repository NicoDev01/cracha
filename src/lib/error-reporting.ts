import type { Breadcrumb, ErrorEvent as SentryEvent } from "@sentry/browser";

/**
 * Browser errors go to Sentry (project cracha-web, EU region). Without this a
 * crash in a visitor's dashboard left no trace anywhere: the Worker logs only
 * see requests, not what the browser did with the answer.
 *
 * The DSN is public by design — it can only submit events, and the browser has
 * to send it anyway.
 */
const DSN = "https://2ecf04ff0a9a7e1e33697d33e3de0bc0@o4509519950839808.ingest.de.sentry.io/4512141193510992";

/** `next start`, `wrangler dev` and previews run production builds too. */
const PRODUCTION_HOST = "cracha-app.com";

type SentryModule = typeof import("@sentry/browser");
let loading: Promise<SentryModule> | null = null;

/**
 * Query strings and fragments carry sign-in codes and reset tokens
 * (/confirm?code=…, #access_token=…); the path alone is enough to find a bug.
 */
export function withoutQuery(url: string): string {
  const cut = url.search(/[?#]/);
  return cut === -1 ? url : url.slice(0, cut);
}

export function scrubEvent(event: SentryEvent): SentryEvent {
  if (event.request) {
    if (event.request.url) event.request.url = withoutQuery(event.request.url);
    delete event.request.query_string;
    delete event.request.cookies;
  }
  return event;
}

export function scrubBreadcrumb(crumb: Breadcrumb): Breadcrumb {
  const data = crumb.data;
  if (data) {
    for (const key of ["url", "from", "to"]) {
      if (typeof data[key] === "string") data[key] = withoutQuery(data[key]);
    }
  }
  return crumb;
}

function loadSentry(): Promise<SentryModule> | null {
  if (typeof window === "undefined" || window.location.hostname !== PRODUCTION_HOST) return null;
  loading ??= import("@sentry/browser").then((Sentry) => {
    Sentry.init({
      dsn: DSN,
      release: process.env.NEXT_PUBLIC_BUILD_SHA,
      environment: "production",
      // What the privacy policy promises: the error, where it happened, the
      // browser — no user, cookies, headers, bodies or query strings.
      dataCollection: {
        userInfo: false,
        cookies: false,
        httpHeaders: false,
        httpBodies: [],
        urlQueryParams: false,
        stackFrameVariables: false,
      },
      denyUrls: [/^(chrome|moz|safari(-web)?)-extension:\/\//],
      beforeSend: scrubEvent,
      beforeBreadcrumb: scrubBreadcrumb,
    });
    return Sentry;
  });
  return loading;
}

/** For error boundaries: React hands them the error, so it never reaches window.onerror. */
export function reportError(error: unknown) {
  loadSentry()
    ?.then((Sentry) => Sentry.captureException(error))
    .catch(() => {});
}

/**
 * The SDK loads once the page is idle, so it costs the landing page nothing
 * before first paint. Errors thrown before that are held and sent afterwards.
 */
export function startErrorReporting() {
  if (typeof window === "undefined" || window.location.hostname !== PRODUCTION_HOST) return;

  const early: unknown[] = [];
  const onError = (event: ErrorEvent) => early.push(event.error ?? event.message);
  const onRejection = (event: PromiseRejectionEvent) => early.push(event.reason);
  window.addEventListener("error", onError);
  window.addEventListener("unhandledrejection", onRejection);

  const start = () => {
    loadSentry()
      ?.then((Sentry) => {
        window.removeEventListener("error", onError);
        window.removeEventListener("unhandledrejection", onRejection);
        for (const error of early) Sentry.captureException(error);
      })
      .catch(() => {});
  };
  const whenIdle = () =>
    "requestIdleCallback" in window ? window.requestIdleCallback(start, { timeout: 5000 }) : setTimeout(start, 1000);

  if (document.readyState === "complete") whenIdle();
  else window.addEventListener("load", whenIdle, { once: true });
}
