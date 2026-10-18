"use client"

import { Database, Loader2, Search, Trash2 } from "lucide-react"
import { useMemo, useState } from "react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { useCrawlStore, type CrawlJob } from "@/stores/crawl-store"
import { crawlResultLabel } from "./crawl-progress"
import { intlLocale } from "@/i18n/copy"
import { useAppLocale } from "@/i18n/navigation"
import type { Locale } from "@/i18n/routing"

const copy = {
  de: {
    running: "Läuft", done: "Fertig", cancelled: "Abgebrochen", failed: "Fehlgeschlagen",
    confirmRemove: (name: string) => `„${name}“ aus dem lokalen Verlauf entfernen?`,
    empty: "Noch nichts eingelesen", emptyHint: "Jede eingelesene Website erscheint automatisch in diesem Verlauf.",
    history: "Verlauf", runs: (count: number) => `${count} ${count === 1 ? "Einlesevorgang" : "Einlesevorgänge"} auf diesem Gerät`,
    search: "Verlauf durchsuchen", removeLabel: (name: string) => `${name} aus Verlauf entfernen`, remove: "Aus Verlauf entfernen",
    noMatches: "Keine passenden Einträge gefunden.", local: "Der Verlauf wird lokal im Browser gespeichert. Das Entfernen löscht keine Wissensbasis.",
  },
  en: {
    running: "Running", done: "Done", cancelled: "Cancelled", failed: "Failed",
    confirmRemove: (name: string) => `Remove “${name}” from the local history?`,
    empty: "Nothing read yet", emptyHint: "Every website you read appears in this history automatically.",
    history: "History", runs: (count: number) => `${count} ${count === 1 ? "run" : "runs"} on this device`,
    search: "Search history", removeLabel: (name: string) => `Remove ${name} from history`, remove: "Remove from history",
    noMatches: "No matching entries found.", local: "The history is stored locally in your browser. Removing an entry doesn’t delete a knowledge base.",
  },
} as const

function hostname(url: string) {
  try { return new URL(url).hostname.replace(/^www\./, "") } catch { return url }
}

function formatDate(value: string, locale: Locale) {
  return new Intl.DateTimeFormat(intlLocale(locale), { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }).format(new Date(value))
}

function formatDuration(job: CrawlJob) {
  const end = job.completed_at ? new Date(job.completed_at).getTime() : Date.now()
  const seconds = Math.max(0, Math.floor((end - new Date(job.created_at).getTime()) / 1000))
  if (seconds < 60) return `${seconds} s`
  if (seconds < 3600) return `${Math.floor(seconds / 60)}:${(seconds % 60).toString().padStart(2, "0")} min`
  return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`
}

function JobStatus({ job }: { job: CrawlJob }) {
  const t = copy[useAppLocale()]
  const [label, dot] = ["pending", "queued", "running", "processing"].includes(job.status)
    ? [t.running, "animate-pulse bg-brand-500"]
    : job.status === "completed"
      ? [t.done, "bg-success-500"]
      : job.status === "cancelled"
        ? [t.cancelled, "bg-gray-400"]
        : [t.failed, "bg-error-500"]
  return (
    <span className="inline-flex shrink-0 items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
      <span className={cn("size-1.5 rounded-full", dot)} />{label}
    </span>
  )
}

export function CrawlJobsList() {
  const locale = useAppLocale()
  const t = copy[locale]
  const { jobs, currentJob, isRunning, deleteJob } = useCrawlStore()
  const [query, setQuery] = useState("")
  const filteredJobs = useMemo(() => {
    const needle = query.trim().toLowerCase()
    if (!needle) return jobs
    return jobs.filter((job) => `${job.name} ${job.url}`.toLowerCase().includes(needle))
  }, [jobs, query])

  const remove = (job: CrawlJob) => {
    if (window.confirm(t.confirmRemove(job.name))) deleteJob(job.id)
  }

  if (jobs.length === 0) {
    return (
      <div className="flex min-h-72 flex-col items-center justify-center text-center">
        <div className="flex size-12 items-center justify-center rounded-2xl bg-gray-100 text-gray-400 dark:bg-gray-800"><Database className="size-5" /></div>
        <h2 className="mt-4 text-sm font-semibold text-gray-900 dark:text-white">{t.empty}</h2>
        <p className="mt-1 text-xs leading-5 text-gray-500">{t.emptyHint}</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-semibold text-gray-900 dark:text-white">{t.history}</h2>
          <p className="mt-0.5 text-xs text-gray-500">{t.runs(jobs.length)}</p>
        </div>
        {jobs.length > 4 && (
          <div className="relative w-full sm:w-64">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-400" />
            <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t.search} className="h-9 rounded-lg pl-9" />
          </div>
        )}
      </div>

      <div className="divide-y divide-gray-100 dark:divide-gray-800">
        {filteredJobs.map((job) => {
          const active = job.id === currentJob?.id && isRunning
          return (
            <article key={job.id} className="group flex items-center gap-3 py-4 sm:gap-4">
              <div className={cn("flex size-10 shrink-0 items-center justify-center rounded-xl font-urban text-base font-semibold uppercase", active ? "bg-brand-50 text-brand-600 dark:bg-brand-500/10" : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300")}>
                {active ? <Loader2 className="size-4 animate-spin" /> : hostname(job.url).slice(0, 1)}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex min-w-0 items-center justify-between gap-3">
                  <h3 className="truncate text-sm font-semibold text-gray-900 dark:text-white">{job.name}</h3>
                  <JobStatus job={job} />
                </div>
                <p className="mt-1 truncate text-xs text-gray-500 dark:text-gray-400">
                  {[hostname(job.url), job.status === "completed" ? crawlResultLabel(job, locale) : null, formatDuration(job), formatDate(job.created_at, locale)].filter(Boolean).join(" · ")}
                </p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => remove(job)}
                disabled={active}
                className="size-9 shrink-0 rounded-lg text-gray-400 opacity-100 hover:bg-error-50 hover:text-error-600 sm:opacity-0 sm:group-hover:opacity-100 sm:focus-visible:opacity-100"
                aria-label={t.removeLabel(job.name)}
                title={t.remove}
              >
                <Trash2 className="size-4" />
              </Button>
            </article>
          )
        })}
      </div>

      {filteredJobs.length === 0 && <p className="py-8 text-center text-sm text-gray-500">{t.noMatches}</p>}
      <p className="text-[11px] leading-5 text-gray-400">{t.local}</p>
    </div>
  )
}
