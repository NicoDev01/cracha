"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { AnimatePresence, motion, useReducedMotion } from "motion/react"
import { ArrowRight, Check, ExternalLink, Globe, Loader2, MessagesSquare, Plus, RotateCcw, X } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { chatHref } from "@/lib/databases"
import { cn } from "@/lib/utils"
import { useCrawlStore, type CrawledPage, type CrawlJob, type CrawlPhase } from "@/stores/crawl-store"
import { crawlPageLimit, crawlResultLabel } from "./crawl-progress"

const number = new Intl.NumberFormat("de-DE")

const steps = [
  { phase: "queued" as const, label: "Vorbereiten" },
  { phase: "crawling" as const, label: "Seiten einlesen" },
  { phase: "indexing" as const, label: "Wissensbasis aufbauen" },
]
const stepOrder: CrawlPhase[] = ["queued", "crawling", "indexing", "completed"]

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
    return pathname === "/" ? "Startseite" : decodeURIComponent(pathname.replace(/\/$/, ""))
  } catch {
    return url
  }
}

/** Seconds since the job started, ticking while it runs. */
function useElapsed(job: CrawlJob | null, running: boolean) {
  const [elapsed, setElapsed] = useState(0)
  useEffect(() => {
    if (!job) return
    const update = () => {
      const end = job.completed_at ? new Date(job.completed_at).getTime() : Date.now()
      setElapsed(Math.max(0, Math.floor((end - new Date(job.created_at).getTime()) / 1000)))
    }
    update()
    if (!running) return
    const timer = window.setInterval(update, 1000)
    return () => window.clearInterval(timer)
  }, [job, running])
  return elapsed
}

/**
 * Three segments that fill as the crawl moves on. The active one carries a
 * light sweep instead of a percentage: during crawling only a ceiling is known,
 * and the index reports all its pages at once, so a number would jump.
 */
function StepBar({ phase }: { phase: CrawlPhase }) {
  const current = stepOrder.indexOf(phase)
  const reduceMotion = useReducedMotion()
  return (
    <div className="grid grid-cols-3 gap-1.5" aria-label="Fortschritt">
      {steps.map((step, index) => {
        const done = current > index
        const active = current === index
        return (
          <div key={step.phase} className="min-w-0">
            <div className="relative h-1 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
              <motion.div
                className="absolute inset-y-0 left-0 rounded-full bg-brand-500"
                initial={false}
                animate={{ width: done ? "100%" : active ? "35%" : "0%" }}
                transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
              />
              {active && !reduceMotion && (
                <motion.div
                  className="absolute inset-y-0 w-1/3 rounded-full bg-gradient-to-r from-transparent via-brand-400/70 to-transparent"
                  initial={{ left: "-35%" }}
                  animate={{ left: "100%" }}
                  transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
                />
              )}
            </div>
            <p className={cn(
              "mt-2 truncate text-xs",
              active ? "font-medium text-gray-900 dark:text-white" : done ? "text-gray-500 dark:text-gray-400" : "text-gray-400 dark:text-gray-600",
            )}>
              {step.label}
            </p>
          </div>
        )
      })}
    </div>
  )
}

/** The pages as they arrive, newest on top. */
function PageFeed({ pages, dimmed }: { pages: CrawledPage[]; dimmed?: boolean }) {
  const reduceMotion = useReducedMotion()
  return (
    <ul className={cn("space-y-0.5 transition-opacity duration-500", dimmed && "opacity-60")} aria-label="Zuletzt eingelesene Seiten">
      <AnimatePresence initial={false}>
        {pages.map((page, index) => (
          <motion.li
            key={page.url}
            layout={!reduceMotion}
            initial={reduceMotion ? false : { opacity: 0, y: -6 }}
            animate={{ opacity: 1 - index * 0.09, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="flex min-w-0 items-center gap-3 rounded-lg px-2 py-1.5"
          >
            <span className={cn(
              "flex size-4 shrink-0 items-center justify-center rounded-full",
              index === 0 && !dimmed ? "bg-brand-500/15 text-brand-500" : "text-success-500",
            )}>
              {index === 0 && !dimmed ? <span className="size-1.5 animate-pulse rounded-full bg-brand-500" /> : <Check className="size-3" strokeWidth={3} />}
            </span>
            <span className="min-w-0 flex-1 truncate text-sm text-gray-700 dark:text-gray-200">{page.title || pagePath(page.url)}</span>
            <span className="hidden max-w-[40%] shrink-0 truncate font-mono text-[11px] text-gray-400 sm:block">{pagePath(page.url)}</span>
          </motion.li>
        ))}
      </AnimatePresence>
    </ul>
  )
}

function Running({ job }: { job: CrawlJob }) {
  const pages = job.recent_pages ?? []
  const found = job.progress?.current ?? job.pages_crawled
  const limit = crawlPageLimit(job)

  if (job.phase === "queued") {
    return <p className="text-sm text-gray-500 dark:text-gray-400">Der Crawler startet …</p>
  }

  if (job.phase === "indexing") {
    const total = job.progress?.total || job.pages_crawled
    return (
      <div className="space-y-4">
        <div>
          <p className="text-sm font-medium text-gray-900 dark:text-white">
            {number.format(total)} {total === 1 ? "Seite wird" : "Seiten werden"} für die Suche aufbereitet
          </p>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Das dauert meist etwa eine Minute.</p>
        </div>
        {pages.length > 0 && <PageFeed pages={pages} dimmed />}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <p className="flex items-baseline gap-2">
        <span className="font-urban text-4xl font-semibold tabular-nums tracking-tight text-gray-900 dark:text-white">{number.format(found)}</span>
        <span className="text-sm text-gray-500 dark:text-gray-400">
          {limit ? `von max. ${number.format(limit)} Seiten` : found === 1 ? "Seite" : "Seiten"}
        </span>
      </p>
      {pages.length > 0
        ? <PageFeed pages={pages} />
        : <p className="text-sm text-gray-500 dark:text-gray-400">Die ersten Seiten werden geladen …</p>}
    </div>
  )
}

export function CrawlMonitor({ onNew }: { onNew?: () => void }) {
  const { currentJob, isRunning, statusError, quotaNotice, cancelCrawl, retryCrawl } = useCrawlStore()
  const elapsed = useElapsed(currentJob, isRunning)
  const [retrying, setRetrying] = useState(false)
  const reduceMotion = useReducedMotion()

  useEffect(() => {
    if (currentJob && ["completed", "failed", "cancelled"].includes(currentJob.status)) window.dispatchEvent(new Event("cracha:credits-changed"))
  }, [currentJob?.id, currentJob?.status])

  if (!currentJob) {
    return (
      <div className="flex min-h-72 flex-col items-center justify-center text-center">
        <div className="flex size-11 items-center justify-center rounded-2xl bg-gray-100 text-gray-400 dark:bg-gray-800">
          <Globe className="size-5" />
        </div>
        <h2 className="mt-4 text-sm font-semibold text-gray-900 dark:text-white">Noch nichts eingelesen</h2>
        <p className="mt-1 max-w-60 text-xs leading-5 text-gray-500 dark:text-gray-400">Sobald du eine Website einliest, siehst du hier, welche Seiten gerade dazukommen.</p>
        {onNew && (
          <Button type="button" size="sm" onClick={onNew} className="mt-5 gap-2 rounded-full bg-brand-500 px-4 !text-white hover:bg-brand-600">
            <Plus className="size-4" />Website einlesen
          </Button>
        )}
      </div>
    )
  }

  const terminal = ["completed", "failed", "cancelled"].includes(currentJob.status)
  const successful = currentJob.status === "completed"
  // A failed crawl used to be a dead end: the only way on was deleting the
  // knowledge base and setting it up again. Needs the knowledge base id, which
  // a crawl refused before the server assigned one never had.
  const canRetry = !isRunning && ["failed", "cancelled"].includes(currentJob.status) && Boolean(currentJob.tenant_id)

  const handleRetry = async () => {
    setRetrying(true)
    try {
      await retryCrawl()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Einlesen konnte nicht neu gestartet werden.")
    } finally {
      setRetrying(false)
    }
  }

  const handleCancel = async () => {
    try {
      await cancelCrawl()
      toast.success("Einlesen abgebrochen.")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Einlesen konnte nicht abgebrochen werden.")
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
            className="space-y-7"
          >
            <StepBar phase={currentJob.phase} />
            <Running job={currentJob} />
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
                {successful
                  ? crawlResultLabel(currentJob)
                  : currentJob.status === "cancelled"
                    ? "Das Einlesen wurde beendet."
                    : currentJob.error || "Das Einlesen konnte nicht abgeschlossen werden."}
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
            <span className="text-xs text-gray-400">Du kannst die Seite verlassen, das Einlesen läuft weiter.</span>
          </>
        )}
      </footer>
    </section>
  )
}
