"use client"

import Link from "next/link"
import { useEffect, useRef, useState, type ReactNode } from "react"
import * as Popover from "@radix-ui/react-popover"
import { AnimatePresence, motion, useReducedMotion } from "motion/react"
import { ArrowRight, Check, ExternalLink, Globe, Info, Loader2, MessagesSquare, Plus, RotateCcw, X } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { chatHref } from "@/lib/databases"
import { cn } from "@/lib/utils"
import { useCrawlStore, type CrawledPage, type SkippedPage } from "@/stores/crawl-store"
import { crawlIndexedLabel, crawlOverallPercent, crawlPageLimit, crawlStepProgress } from "./crawl-progress"

const number = new Intl.NumberFormat("de-DE")

const steps = [
  { label: "Vorbereiten", description: "Der Crawler wird gestartet" },
  { label: "Seiten crawlen", description: "Seiten der Website abrufen und lesen" },
  { label: "Indexieren", description: "In Abschnitte zerlegen, einbetten und im Suchindex speichern" },
]

function formatDuration(seconds: number) {
  if (seconds < 60) return `${seconds} s`
  return `${Math.floor(seconds / 60)}:${(seconds % 60).toString().padStart(2, "0")} min`
}

function hostname(url: string) {
  try { return new URL(url).hostname.replace(/^www\./, "") } catch { return url }
}

function pagePath(url: string) {
  try {
    const { pathname } = new URL(url)
    return pathname === "/" ? "/" : decodeURIComponent(pathname.replace(/\/$/, ""))
  } catch {
    return url
  }
}

/** The current time, ticking while `running`. */
function useNow(running: boolean, interval = 250) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    if (!running) return
    const timer = window.setInterval(() => setNow(Date.now()), interval)
    return () => window.clearInterval(timer)
  }, [running, interval])
  return now
}

/** One bar for the whole run, with the current step on the left and the share done on the right. */
function OverallBar({ percent, current }: { percent: number; current: number }) {
  const reduceMotion = useReducedMotion()
  return (
    <div>
      <div className="mb-2 flex items-baseline justify-between gap-3 text-sm">
        <span className="truncate font-medium text-gray-900 dark:text-white">
          <span className="mr-2 font-mono text-xs font-normal tabular-nums text-gray-400 dark:text-gray-500">{current + 1}/{steps.length}</span>
          {steps[current].label}
        </span>
        <span className="shrink-0 font-mono text-xs tabular-nums text-gray-500 dark:text-gray-400">{percent} %</span>
      </div>
      <div
        role="progressbar"
        aria-label="Gesamtfortschritt"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent}
        className="relative h-2 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800"
      >
        <motion.div
          className="absolute inset-y-0 left-0 rounded-full bg-brand-500"
          initial={false}
          animate={{ width: `${percent}%` }}
          transition={reduceMotion ? { duration: 0 } : { duration: 0.9, ease: "easeOut" }}
        />
        {!reduceMotion && (
          <motion.div
            className="absolute inset-y-0 w-1/5 bg-gradient-to-r from-transparent via-white/40 to-transparent dark:via-white/20"
            initial={{ left: "-20%" }}
            animate={{ left: "100%" }}
            transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
          />
        )}
      </div>
    </div>
  )
}

/**
 * What indexing is doing right now. AI Search reports nothing until a page's
 * first chunks exist, so until then the step shows how long it has been
 * running; after that, one segment per page lights up as it becomes
 * searchable.
 */
function IndexDetail({ total, searchable, chunks, since, now }: { total: number; searchable: number; chunks: number; since: string; now: number }) {
  const reduceMotion = useReducedMotion()
  const seconds = Math.max(0, Math.floor((now - new Date(since).getTime()) / 1000))
  const ready = Math.min(searchable, total)
  const segments = total > 0 && total <= 60
  return (
    <span className="block">
      <span className="block">
        {ready > 0
          ? <><span className="font-medium tabular-nums text-gray-700 dark:text-gray-200">{number.format(ready)} von {number.format(total)}</span> Seiten durchsuchbar{chunks > 0 && ` · ${number.format(chunks)} Abschnitte`}</>
          : `${number.format(total)} ${total === 1 ? "Seite wird" : "Seiten werden"} zerlegt, eingebettet und gespeichert`}
      </span>
      {segments ? (
        <span className="mt-2.5 flex flex-wrap gap-1" aria-hidden>
          {Array.from({ length: total }, (_, index) => {
            const lit = index < ready
            return (
              <span key={index} className="relative h-1.5 w-3 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
                <motion.span
                  className="absolute inset-0 rounded-full bg-brand-500"
                  initial={false}
                  animate={{ opacity: lit ? 1 : 0, scaleX: lit ? 1 : 0.3 }}
                  transition={reduceMotion ? { duration: 0 } : { duration: 0.35, ease: "easeOut", delay: lit ? (index % 12) * 0.03 : 0 }}
                  style={{ originX: 0 }}
                />
                {!lit && !reduceMotion && (
                  <motion.span
                    className="absolute inset-0 rounded-full bg-brand-500/30"
                    animate={{ opacity: [0, 1, 0] }}
                    transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut", delay: (index % 16) * 0.1 }}
                  />
                )}
              </span>
            )
          })}
        </span>
      ) : total > 0 ? (
        <span className="mt-2.5 block h-1.5 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800" aria-hidden>
          <motion.span
            className="block h-full rounded-full bg-brand-500"
            initial={false}
            animate={{ width: `${Math.round((ready / total) * 100)}%` }}
            transition={reduceMotion ? { duration: 0 } : { duration: 0.6, ease: "easeOut" }}
          />
        </span>
      ) : null}
      <span className="mt-2 block font-mono text-[11px] tabular-nums text-gray-400 dark:text-gray-500">
        läuft seit {formatDuration(seconds)} · meist unter einer Minute
      </span>
    </span>
  )
}

/**
 * The three steps stacked, each marker sitting on one track. The piece of
 * track below a step fills as that step advances, so the line itself shows
 * how far the current step has come.
 */
function StepList({ progress, current, details }: { progress: [number, number, number]; current: number; details: ReactNode[] }) {
  const reduceMotion = useReducedMotion()
  return (
    <ol aria-label="Schritte">
      {steps.map((step, index) => {
        const done = progress[index] >= 1 || index < current
        const active = index === current && !done
        const last = index === steps.length - 1
        return (
          <li key={step.label} aria-current={active ? "step" : undefined} className="relative grid grid-cols-[1.5rem_1fr] gap-x-3.5">
            <div className="relative flex justify-center">
              <motion.span
                initial={false}
                animate={{ scale: done ? [0.7, 1] : 1 }}
                transition={reduceMotion ? { duration: 0 } : { type: "spring", stiffness: 420, damping: 20 }}
                className={cn(
                  "relative z-10 flex size-6 items-center justify-center rounded-full text-[11px] font-semibold tabular-nums transition-colors duration-300",
                  done && "bg-success-500 text-white",
                  active && "bg-white ring-2 ring-brand-500 dark:bg-gray-900",
                  !done && !active && "bg-white text-gray-400 ring-1 ring-gray-200 dark:bg-gray-900 dark:text-gray-500 dark:ring-gray-700",
                )}
              >
                {done ? (
                  <Check className="size-3.5" strokeWidth={3} />
                ) : active ? (
                  <span className="relative flex size-2">
                    {!reduceMotion && <span className="absolute inset-0 animate-ping rounded-full bg-brand-500/60" />}
                    <span className="relative size-2 rounded-full bg-brand-500" />
                  </span>
                ) : (
                  index + 1
                )}
              </motion.span>
              {!last && (
                <span className="absolute left-1/2 top-7 bottom-1 w-0.5 -translate-x-1/2 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
                  <motion.span
                    className={cn("absolute inset-x-0 top-0 rounded-full", done ? "bg-success-500" : "bg-brand-500")}
                    initial={false}
                    animate={{ height: `${Math.round(Math.min(1, progress[index]) * 1000) / 10}%` }}
                    transition={reduceMotion ? { duration: 0 } : { duration: 0.9, ease: "easeOut" }}
                  />
                </span>
              )}
            </div>
            <div className={cn("min-w-0 pt-0.5", !last && "pb-6")}>
              <p className={cn(
                "text-sm transition-colors",
                active ? "font-medium text-gray-900 dark:text-white" : done ? "text-gray-700 dark:text-gray-300" : "text-gray-400 dark:text-gray-500",
              )}>
                {step.label}
              </p>
              <p className={cn("mt-0.5 text-xs leading-5", active ? "text-gray-500 dark:text-gray-400" : "text-gray-400 dark:text-gray-500")}>
                {details[index] ?? step.description}
              </p>
            </div>
          </li>
        )
      })}
    </ol>
  )
}

/**
 * The pages as a running log, newest at the bottom. Pages arrive in groups
 * with every status answer; they are let in one at a time so the log flows
 * instead of jumping. What was already there when the view opened shows at once.
 */
function PageLog({ pages, running, scanning }: { pages: CrawledPage[]; running: boolean; scanning: boolean }) {
  const reduceMotion = useReducedMotion()
  const [shown, setShown] = useState(pages.length)
  const box = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (shown >= pages.length) return
    const timer = window.setTimeout(() => setShown((count) => count + 1), reduceMotion ? 0 : 220)
    return () => window.clearTimeout(timer)
  }, [shown, pages.length, reduceMotion])

  useEffect(() => {
    // Smooth through the box's own CSS, which reduced motion switches off.
    if (box.current) box.current.scrollTop = box.current.scrollHeight
  }, [shown])

  const visible = pages.slice(0, Math.min(shown, pages.length))
  return (
    <div className="relative overflow-hidden rounded-xl border border-gray-100 bg-gray-50/80 dark:border-gray-800 dark:bg-gray-950/40">
      <div
        ref={box}
        className="h-52 overflow-y-auto scroll-smooth px-3 py-3 font-mono text-xs motion-reduce:scroll-auto leading-6 [mask-image:linear-gradient(to_bottom,transparent,black_28px)] [scrollbar-width:none]"
        aria-label="Gecrawlte Seiten"
      >
        <ul>
          {visible.map((page, index) => {
            const last = index === visible.length - 1
            return (
              <motion.li
                key={page.url}
                initial={reduceMotion ? false : { opacity: 0, x: -4 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.25, ease: "easeOut" }}
                className="flex min-w-0 items-center gap-2"
              >
                <span className={cn("shrink-0", last && running && !scanning ? "text-brand-500" : "text-success-500")}>
                  {last && running && !scanning ? "›" : "✓"}
                </span>
                <span className="shrink-0 text-gray-400 dark:text-gray-500">{pagePath(page.url)}</span>
                {page.title && <span className="min-w-0 truncate text-gray-700 dark:text-gray-300">{page.title}</span>}
              </motion.li>
            )
          })}
          {running && !scanning && (
            <li className="flex items-center gap-2 text-gray-400">
              <span className="inline-block h-3.5 w-1.5 animate-pulse bg-brand-500/70" />
            </li>
          )}
        </ul>
      </div>
      {/* While the index is built nothing reports progress, so a light passes
          over the pages to show that they are being worked on. */}
      {scanning && !reduceMotion && (
        <motion.div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 h-16 bg-gradient-to-b from-transparent via-brand-500/10 to-transparent"
          initial={{ top: "-4rem" }}
          animate={{ top: "100%" }}
          transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
        />
      )}
    </div>
  )
}

/** "· 2 übersprungen" with a small (i) that says which pages and why. */
function SkippedInfo({ count, pages }: { count: number; pages: SkippedPage[] }) {
  const [open, setOpen] = useState(false)
  const closing = useRef<number | null>(null)
  const hold = (next: boolean) => {
    if (closing.current) window.clearTimeout(closing.current)
    if (next) setOpen(true)
    else closing.current = window.setTimeout(() => setOpen(false), 120)
  }
  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <span className="whitespace-nowrap">
        {" · "}{number.format(count)} übersprungen
        <Popover.Trigger
          aria-label="Welche Seiten wurden übersprungen?"
          onMouseEnter={() => hold(true)}
          onMouseLeave={() => hold(false)}
          className="ml-1 inline-flex size-4 translate-y-[3px] items-center justify-center rounded-full text-gray-400 transition-colors hover:text-gray-700 focus-visible:outline-2 focus-visible:outline-brand-500 dark:hover:text-gray-200"
        >
          <Info className="size-3.5" />
        </Popover.Trigger>
      </span>
      <Popover.Portal>
        <Popover.Content
          side="bottom"
          align="start"
          sideOffset={8}
          collisionPadding={16}
          onMouseEnter={() => hold(true)}
          onMouseLeave={() => hold(false)}
          className="z-50 w-80 max-w-[calc(100vw-2rem)] rounded-xl border border-gray-200 bg-white p-4 text-sm shadow-theme-lg dark:border-gray-800 dark:bg-gray-900"
        >
          <p className="font-medium text-gray-900 dark:text-white">Übersprungene Seiten</p>
          <p className="mt-1 text-xs leading-5 text-gray-500 dark:text-gray-400">
            Diese Seiten wurden gefunden, aber nicht in die Wissensbasis aufgenommen. Sie kosten keine Credits.
          </p>
          {pages.length > 0 ? (
            <ul className="mt-3 max-h-56 space-y-2 overflow-y-auto">
              {pages.map((page) => (
                <li key={page.url} className="min-w-0">
                  <a href={page.url} target="_blank" rel="noreferrer" className="block truncate font-mono text-xs text-gray-700 hover:text-brand-600 dark:text-gray-300">
                    {pagePath(page.url)}
                  </a>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{page.reason}</p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-xs text-gray-500 dark:text-gray-400">Welche es waren, zeigen Crawls ab jetzt hier an.</p>
          )}
          {pages.length > 0 && pages.length < count && (
            <p className="mt-2 text-xs text-gray-400">und {number.format(count - pages.length)} weitere</p>
          )}
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  )
}

export function CrawlMonitor({ onNew }: { onNew?: () => void }) {
  const { currentJob, isRunning, statusError, quotaNotice, cancelCrawl, retryCrawl } = useCrawlStore()
  const now = useNow(isRunning)
  const [retrying, setRetrying] = useState(false)
  const reduceMotion = useReducedMotion()

  const jobId = currentJob?.id
  const jobStatus = currentJob?.status
  useEffect(() => {
    if (jobStatus && ["completed", "failed", "cancelled"].includes(jobStatus)) window.dispatchEvent(new Event("cracha:credits-changed"))
  }, [jobId, jobStatus])

  if (!currentJob) {
    return (
      <div className="flex min-h-72 flex-col items-center justify-center text-center">
        <div className="flex size-11 items-center justify-center rounded-2xl bg-gray-100 text-gray-400 dark:bg-gray-800">
          <Globe className="size-5" />
        </div>
        <h2 className="mt-4 text-sm font-semibold text-gray-900 dark:text-white">Noch kein Crawl</h2>
        <p className="mt-1 max-w-60 text-xs leading-5 text-gray-500 dark:text-gray-400">Sobald du eine Website crawlst, siehst du hier jede Seite, die dazukommt.</p>
        {onNew && (
          <Button type="button" size="sm" onClick={onNew} className="mt-5 gap-2 rounded-full bg-brand-500 px-4 !text-white hover:bg-brand-600">
            <Plus className="size-4" />Website crawlen
          </Button>
        )}
      </div>
    )
  }

  const terminal = ["completed", "failed", "cancelled"].includes(currentJob.status)
  const successful = currentJob.status === "completed"
  const end = currentJob.completed_at ? new Date(currentJob.completed_at).getTime() : now
  const elapsed = Math.max(0, Math.floor((end - new Date(currentJob.created_at).getTime()) / 1000))
  const progress = crawlStepProgress(currentJob, now)
  const currentStep = currentJob.phase === "queued" ? 0 : currentJob.phase === "crawling" ? 1 : 2
  const pages = currentJob.crawled_pages ?? [...(currentJob.recent_pages ?? [])].reverse()
  const found = currentJob.progress?.current ?? currentJob.pages_crawled
  const limit = crawlPageLimit(currentJob)
  // While indexing, `progress` counts indexed pages instead of fetched ones,
  // so the fetched count comes from the job itself.
  const crawled = currentStep > 1 ? currentJob.progress?.total || currentJob.pages_crawled : found
  const stepDetails: ReactNode[] = [
    currentStep > 0 ? "Gestartet" : null,
    currentStep === 1
      ? found > 0
        ? `${number.format(found)} ${limit ? `von max. ${number.format(limit)} ` : ""}${found === 1 ? "Seite" : "Seiten"} erfasst`
        : "Seiten werden gesucht …"
      : currentStep > 1 ? `${number.format(crawled)} ${crawled === 1 ? "Seite" : "Seiten"} erfasst` : null,
    currentStep === 2 ? (
      <IndexDetail
        total={crawled}
        searchable={currentJob.progress?.searchable ?? 0}
        chunks={currentJob.progress?.chunks_count ?? 0}
        since={currentJob.phase_started_at ?? currentJob.created_at}
        now={now}
      />
    ) : null,
  ]
  // A failed crawl used to be a dead end: the only way on was deleting the
  // knowledge base and setting it up again. Needs the knowledge base id, which
  // a crawl refused before the server assigned one never had.
  const canRetry = !isRunning && ["failed", "cancelled"].includes(currentJob.status) && Boolean(currentJob.tenant_id)

  const handleRetry = async () => {
    setRetrying(true)
    try {
      await retryCrawl()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Crawl konnte nicht neu gestartet werden.")
    } finally {
      setRetrying(false)
    }
  }

  const handleCancel = async () => {
    try {
      await cancelCrawl()
      toast.success("Crawl abgebrochen.")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Crawl konnte nicht abgebrochen werden.")
    }
  }

  return (
    <section aria-live="polite" className="space-y-7">
      <header className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-gray-100 font-urban text-base font-semibold uppercase text-gray-600 dark:bg-gray-800 dark:text-gray-300">
            {hostname(currentJob.url).slice(0, 1)}
          </div>
          <div className="min-w-0">
            <h2 className="truncate font-semibold text-gray-900 dark:text-white">{currentJob.name}</h2>
            <a href={currentJob.url} target="_blank" rel="noreferrer" className="group inline-flex max-w-full items-center gap-1 text-xs text-gray-500 hover:text-brand-600 dark:text-gray-400">
              <span className="truncate">{hostname(currentJob.url)}</span>
              <ExternalLink className="size-3 shrink-0 opacity-0 transition-opacity group-hover:opacity-100" />
            </a>
          </div>
        </div>
        <span className="shrink-0 rounded-full bg-gray-100 px-2.5 py-1 font-mono text-xs tabular-nums text-gray-500 dark:bg-gray-800 dark:text-gray-400">
          {formatDuration(elapsed)}
        </span>
      </header>

      <AnimatePresence mode="wait" initial={false}>
        {!terminal ? (
          <motion.div
            key="running"
            initial={reduceMotion ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-6"
          >
            <OverallBar percent={crawlOverallPercent(progress)} current={currentStep} />

            <StepList progress={progress} current={currentStep} details={stepDetails} />

            {currentJob.phase !== "queued" && (
              <PageLog key={currentJob.id} pages={pages} running={isRunning} scanning={currentJob.phase === "indexing"} />
            )}
          </motion.div>
        ) : (
          <motion.div
            key="finished"
            initial={reduceMotion ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            className="flex items-start gap-4"
          >
            <motion.div
              initial={reduceMotion ? false : { scale: 0.6 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 380, damping: 18, delay: 0.05 }}
              className={cn(
                "flex size-11 shrink-0 items-center justify-center rounded-full",
                successful ? "bg-success-500 text-white" : "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400",
              )}
            >
              {successful ? <Check className="size-5" strokeWidth={3} /> : <X className="size-5" />}
            </motion.div>
            <div className="min-w-0 pt-0.5">
              <h3 className="font-urban text-2xl font-semibold tracking-tight text-gray-900 dark:text-white">
                {successful ? "Bereit" : currentJob.status === "cancelled" ? "Abgebrochen" : "Fehlgeschlagen"}
              </h3>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                {successful ? (
                  <>
                    {crawlIndexedLabel(currentJob)}
                    {currentJob.pages_skipped > 0 && <SkippedInfo count={currentJob.pages_skipped} pages={currentJob.skipped_pages ?? []} />}
                  </>
                ) : currentJob.status === "cancelled"
                  ? "Der Crawl wurde beendet."
                  : currentJob.error || "Der Crawl konnte nicht abgeschlossen werden."}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {quotaNotice && (
        <p className="rounded-xl bg-warning-50 px-3 py-2 text-xs leading-5 text-warning-700 dark:bg-warning-500/10 dark:text-warning-300">{quotaNotice}</p>
      )}
      {statusError && isRunning && (
        <p className="text-xs text-gray-400">Verbindung kurz unterbrochen, die Anzeige aktualisiert sich gleich wieder.</p>
      )}

      <footer className="flex flex-wrap items-center gap-2">
        {successful && (
          <Button asChild className="h-10 gap-2 rounded-full bg-brand-500 px-5 !text-white hover:bg-brand-600">
            <Link href={chatHref(currentJob.tenant_id)}><MessagesSquare className="size-4" />Fragen stellen<ArrowRight className="size-4" /></Link>
          </Button>
        )}
        {canRetry && (
          <Button type="button" onClick={handleRetry} disabled={retrying} className="h-10 gap-2 rounded-full bg-brand-500 px-5 !text-white hover:bg-brand-600">
            {retrying ? <Loader2 className="size-4 animate-spin" /> : <RotateCcw className="size-4" />}
            Erneut versuchen
          </Button>
        )}
        {terminal && onNew && (
          <Button type="button" variant="ghost" onClick={onNew} className="h-10 gap-2 rounded-full px-4 text-gray-600 dark:text-gray-300">
            <Plus className="size-4" />Weitere Website
          </Button>
        )}
        {isRunning && (
          <>
            <Button type="button" variant="ghost" size="sm" onClick={handleCancel} className="h-9 rounded-full px-3 text-gray-500 hover:text-error-600">
              Abbrechen
            </Button>
            <span className="text-xs text-gray-400">Du kannst die Seite verlassen, der Crawl läuft weiter.</span>
          </>
        )}
      </footer>
    </section>
  )
}
