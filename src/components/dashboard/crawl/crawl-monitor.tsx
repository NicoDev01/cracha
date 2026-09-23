"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { Check, CheckCircle2, Circle, Clock3, Database, ExternalLink, Loader2, MessagesSquare, OctagonX, XCircle } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { chatHref } from "@/lib/databases"
import { cn } from "@/lib/utils"
import { useCrawlStore, type CrawlJob, type CrawlPhase } from "@/stores/crawl-store"
import { crawlProgressLabel } from "./crawl-progress"

const phaseOrder: CrawlPhase[] = ["queued", "crawling", "indexing", "completed"]
const phases = [
  { value: "queued" as const, label: "Vorbereiten" },
  { value: "crawling" as const, label: "Seiten erfassen" },
  { value: "indexing" as const, label: "Wissensbasis aufbauen" },
]

function formatDuration(seconds: number) {
  if (seconds < 60) return `${seconds}s`
  const minutes = Math.floor(seconds / 60)
  const remainder = seconds % 60
  return `${minutes}m ${remainder.toString().padStart(2, "0")}s`
}

function statusCopy(job: CrawlJob) {
  switch (job.phase) {
    case "queued": return { title: "Wird vorbereitet" }
    case "crawling": return { title: "Website wird erfasst" }
    case "indexing": return { title: "Wissensbasis wird erstellt" }
    case "completed": return { title: "Bereit" }
    case "cancelled": return { title: "Abgebrochen" }
    default: return { title: "Fehlgeschlagen", detail: job.error || "Der Crawl konnte nicht abgeschlossen werden." }
  }
}

function StepIcon({ complete, active }: { complete: boolean; active: boolean }) {
  if (complete) return <Check className="size-3.5" />
  if (active) return <Loader2 className="size-3.5 animate-spin" />
  return <Circle className="size-3" />
}

export function CrawlMonitor() {
  const { currentJob, isRunning, statusError, quotaNotice, cancelCrawl } = useCrawlStore()
  const [elapsed, setElapsed] = useState(0)

  useEffect(() => {
    if (!currentJob) return
    const update = () => {
      const end = currentJob.completed_at ? new Date(currentJob.completed_at).getTime() : Date.now()
      setElapsed(Math.max(0, Math.floor((end - new Date(currentJob.created_at).getTime()) / 1000)))
    }
    update()
    if (!isRunning) return
    const timer = window.setInterval(update, 1000)
    return () => window.clearInterval(timer)
  }, [currentJob, isRunning])

  useEffect(() => {
    if (currentJob && ["completed", "failed", "cancelled"].includes(currentJob.status)) window.dispatchEvent(new Event("cracha:credits-changed"))
  }, [currentJob?.id, currentJob?.status])

  if (!currentJob) {
    return (
      <aside className="flex min-h-72 flex-col items-center justify-center rounded-2xl border border-dashed border-gray-200 bg-gray-50/60 p-7 text-center dark:border-gray-700 dark:bg-gray-800/30">
        <div className="flex size-11 items-center justify-center rounded-xl bg-white text-gray-400 shadow-theme-xs dark:bg-gray-900">
          <Clock3 className="size-5" />
        </div>
        <h2 className="mt-4 text-sm font-semibold text-gray-800 dark:text-white">Noch kein Crawl gestartet</h2>
        <p className="mt-1 max-w-56 text-xs leading-5 text-gray-500 dark:text-gray-400">Der Status deines nächsten Crawls erscheint automatisch hier.</p>
      </aside>
    )
  }

  const copy = statusCopy(currentJob)
  const terminal = ["completed", "failed", "cancelled"].includes(currentJob.status)
  const successful = currentJob.status === "completed"
  const currentPhaseIndex = phaseOrder.indexOf(currentJob.phase)
  const progress = currentJob.progress
  const percent = Math.min(100, Math.max(0, progress?.percent ?? 0))
  // Only indexing knows its total: it counts against the pages it was handed.
  // A recursive crawl reports progress against the page *limit*, so a site with
  // forty pages and a limit of five hundred would creep to eight percent and
  // then jump to a hundred. A bar that does that is worse than no bar, so the
  // crawl phase keeps the indeterminate pulse it had.
  const determinate = !terminal && currentJob.phase === "indexing" && percent > 0
  // The reader pays for a product, not for an architecture: no service names,
  // no pipeline stages, only what their own website is doing in plain words.
  const progressLabel = crawlProgressLabel(currentJob)

  const handleCancel = async () => {
    try {
      await cancelCrawl()
      toast.success("Crawl wurde abgebrochen.")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Crawl konnte nicht abgebrochen werden.")
    }
  }

  return (
    <aside
      className={cn(
        "overflow-hidden rounded-2xl border bg-white shadow-theme-xs dark:bg-gray-900",
        successful ? "border-success-200 dark:border-success-800" : "border-gray-200 dark:border-gray-700",
      )}
      aria-live="polite"
    >
      {determinate ? (
        <div className="h-1 w-full bg-gray-100 dark:bg-gray-800">
          <div
            className="h-full bg-brand-500 transition-[width] duration-700 ease-out"
            style={{ width: `${percent}%` }}
          />
        </div>
      ) : (
        <div className={cn("h-1 w-full", successful ? "bg-success-500" : terminal ? "bg-error-500" : "animate-pulse bg-brand-500")} />
      )}
      <div className="p-5 sm:p-6">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-3">
            <div className={cn(
              "flex size-10 shrink-0 items-center justify-center rounded-xl",
              successful
                ? "bg-success-50 text-success-600 dark:bg-success-500/10"
                : terminal
                  ? "bg-error-50 text-error-600 dark:bg-error-500/10"
                  : "bg-brand-50 text-brand-600 dark:bg-brand-500/10",
            )}>
              {successful ? <CheckCircle2 className="size-5" /> : terminal ? <XCircle className="size-5" /> : <Loader2 className="size-5 animate-spin" />}
            </div>
            <div className="min-w-0">
              <h2 className="text-base font-semibold text-gray-900 dark:text-white">{copy.title}</h2>
            </div>
          </div>
          <span className="shrink-0 font-mono text-xs tabular-nums text-gray-400">{formatDuration(elapsed)}</span>
        </div>

        {copy.detail && <p className="mt-4 text-sm leading-6 text-error-600 dark:text-error-400">{copy.detail}</p>}

        <div className="mt-5 rounded-xl border border-gray-100 bg-gray-50/80 p-3.5 dark:border-gray-800 dark:bg-gray-800/50">
          <div className="flex min-w-0 items-center gap-2 text-sm font-medium text-gray-800 dark:text-gray-100">
            <Database className="size-4 shrink-0 text-gray-400" />
            <span className="truncate">{currentJob.name}</span>
          </div>
          <a href={currentJob.url} target="_blank" rel="noreferrer" className="mt-2 flex min-w-0 items-center gap-2 text-xs text-gray-500 hover:text-brand-600 dark:text-gray-400">
            <span className="truncate">{currentJob.url}</span>
            <ExternalLink className="size-3 shrink-0" />
          </a>
        </div>

        {isRunning && (
          <div className="mt-5 flex items-start gap-2.5 text-xs" aria-label="Crawl-Fortschritt">
            <Loader2 className="mt-0.5 size-3.5 shrink-0 animate-spin text-brand-500" />
            <div className="min-w-0 flex-1">
              <p className="font-medium text-gray-700 dark:text-gray-200">{progressLabel}</p>
              {progress?.url && currentJob.phase === "crawling" && (
                <p className="mt-1 truncate font-mono text-[11px] text-gray-400">{progress.url}</p>
              )}
            </div>
            {determinate && (
              <span className="shrink-0 font-mono text-xs tabular-nums text-gray-400">{percent}%</span>
            )}
          </div>
        )}

        {!terminal && (
          <div className="mt-5 space-y-3">
            {phases.map((phase, index) => {
              const complete = currentPhaseIndex > index
              const active = currentJob.phase === phase.value
              return (
                <div key={phase.value} className="flex items-center gap-3">
                  <span className={cn(
                    "flex size-6 items-center justify-center rounded-full border",
                    complete
                      ? "border-success-500 bg-success-500 text-white"
                      : active
                        ? "border-brand-500 bg-brand-50 text-brand-600 dark:bg-brand-500/10"
                        : "border-gray-200 text-gray-300 dark:border-gray-700 dark:text-gray-600",
                  )}>
                    <StepIcon complete={complete} active={active} />
                  </span>
                  <span className={cn("text-sm", active ? "font-semibold text-gray-900 dark:text-white" : "text-gray-500 dark:text-gray-400")}>{phase.label}</span>
                </div>
              )
            })}
          </div>
        )}

        {successful && (
          <div className="mt-5 grid grid-cols-2 gap-2">
            <div className="rounded-xl bg-gray-50 p-3 dark:bg-gray-800/60">
              <strong className="block text-lg text-gray-900 dark:text-white">{currentJob.pages_crawled}</strong>
              <span className="text-[11px] text-gray-500">Abgerufene Seiten</span>
            </div>
            <div className="rounded-xl bg-gray-50 p-3 dark:bg-gray-800/60">
              <strong className="block text-lg text-gray-900 dark:text-white">{currentJob.indexed_pages ?? '–'}</strong>
              <span className="text-[11px] text-gray-500">Indexierte Seiten</span>
            </div>
          </div>
        )}

        {terminal && <p className="mt-3 text-xs leading-5 text-gray-500">{currentJob.pages_skipped} Seiten übersprungen. {currentJob.indexing_pending ? `${currentJob.indexing_pending} Seiten nicht fertig indexiert. ` : ''}Die Wissensbasis bildet nur die erfolgreich eingelesenen Inhalte ab, nicht garantiert die gesamte Website.</p>}
        {quotaNotice && (
          <p className="mt-4 rounded-xl border border-warning-200 bg-warning-50 px-3 py-2 text-xs leading-5 text-warning-700 dark:border-warning-500/30 dark:bg-warning-500/10 dark:text-warning-300">
            {quotaNotice}
          </p>
        )}

        {statusError && isRunning && (
          <p className="mt-4 text-xs leading-5 text-amber-600 dark:text-amber-400">Status kurzzeitig nicht erreichbar. Die Aktualisierung wird automatisch wiederholt.</p>
        )}

        <div className="mt-5 flex flex-wrap gap-2">
          {isRunning && (
            <Button type="button" variant="outline" size="sm" onClick={handleCancel} className="gap-2 rounded-lg text-gray-600 dark:text-gray-300">
              <OctagonX className="size-4" />
              Abbrechen
            </Button>
          )}
          {successful && (
            <Button asChild size="sm" className="gap-2 rounded-lg bg-brand-500 !text-white hover:bg-brand-600">
              <Link href={chatHref(currentJob.tenant_id)}><MessagesSquare className="size-4" />Fragen stellen</Link>
            </Button>
          )}
        </div>

        {isRunning && <p className="mt-4 text-[11px] leading-5 text-gray-400">Du kannst die Seite verlassen. Der Crawl läuft im Hintergrund weiter.</p>}
      </div>
    </aside>
  )
}
