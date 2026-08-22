"use client"

import { CheckCircle2, Clock3, Database, File, Globe2, ListTree, Loader2, Search, Trash2, XCircle } from "lucide-react"
import { useMemo, useState } from "react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { useCrawlStore, type CrawlJob } from "@/stores/crawl-store"

const modeCopy = {
  single: { label: "Einzelseite", icon: File },
  recursive: { label: "Website", icon: Globe2 },
  sitemap: { label: "Sitemap", icon: ListTree },
}

function hostname(url: string) {
  try { return new URL(url).hostname.replace(/^www\./, "") } catch { return url }
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("de-DE", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value))
}

function formatDuration(job: CrawlJob) {
  const end = job.completed_at ? new Date(job.completed_at).getTime() : Date.now()
  const seconds = Math.max(0, Math.floor((end - new Date(job.created_at).getTime()) / 1000))
  if (seconds < 60) return `${seconds}s`
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${seconds % 60}s`
  return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`
}

function JobStatus({ job }: { job: CrawlJob }) {
  if (["pending", "queued", "running", "processing"].includes(job.status)) {
    return <span className="inline-flex items-center gap-1.5 text-xs font-medium text-brand-600"><Loader2 className="size-3.5 animate-spin" />Läuft</span>
  }
  if (job.status === "completed") {
    return <span className="inline-flex items-center gap-1.5 text-xs font-medium text-success-600"><CheckCircle2 className="size-3.5" />Fertig</span>
  }
  if (job.status === "cancelled") {
    return <span className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-500"><Clock3 className="size-3.5" />Abgebrochen</span>
  }
  return <span className="inline-flex items-center gap-1.5 text-xs font-medium text-error-600"><XCircle className="size-3.5" />Fehlgeschlagen</span>
}

export function CrawlJobsList() {
  const { jobs, currentJob, isRunning, deleteJob } = useCrawlStore()
  const [query, setQuery] = useState("")
  const filteredJobs = useMemo(() => {
    const needle = query.trim().toLowerCase()
    if (!needle) return jobs
    return jobs.filter((job) => `${job.name} ${job.url}`.toLowerCase().includes(needle))
  }, [jobs, query])

  const remove = (job: CrawlJob) => {
    if (window.confirm(`„${job.name}“ aus dem lokalen Verlauf entfernen?`)) deleteJob(job.id)
  }

  if (jobs.length === 0) {
    return (
      <div className="flex min-h-72 flex-col items-center justify-center text-center">
        <div className="flex size-12 items-center justify-center rounded-2xl bg-gray-100 text-gray-400 dark:bg-gray-800"><Database className="size-5" /></div>
        <h2 className="mt-4 text-sm font-semibold text-gray-900 dark:text-white">Noch keine Crawls</h2>
        <p className="mt-1 text-xs leading-5 text-gray-500">Gestartete Crawls erscheinen automatisch in diesem Verlauf.</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-semibold text-gray-900 dark:text-white">Crawl-Verlauf</h2>
          <p className="mt-0.5 text-xs text-gray-500">{jobs.length} {jobs.length === 1 ? "Crawl" : "Crawls"} auf diesem Gerät</p>
        </div>
        {jobs.length > 4 && (
          <div className="relative w-full sm:w-64">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-400" />
            <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Verlauf durchsuchen" className="h-9 rounded-lg pl-9" />
          </div>
        )}
      </div>

      <div className="divide-y divide-gray-100 overflow-hidden rounded-2xl border border-gray-200 bg-white dark:divide-gray-800 dark:border-gray-700 dark:bg-gray-900">
        {filteredJobs.map((job) => {
          const mode = modeCopy[job.type]
          const ModeIcon = mode.icon
          const active = job.id === currentJob?.id && isRunning
          return (
            <article key={job.id} className="group flex items-center gap-3 p-4 sm:gap-4">
              <div className={cn("flex size-10 shrink-0 items-center justify-center rounded-xl", active ? "bg-brand-50 text-brand-600 dark:bg-brand-500/10" : "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400")}>
                {active ? <Loader2 className="size-4 animate-spin" /> : <ModeIcon className="size-4" />}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex min-w-0 items-center gap-2">
                  <h3 className="truncate text-sm font-semibold text-gray-900 dark:text-white">{job.name}</h3>
                  <JobStatus job={job} />
                </div>
                <p className="mt-1 truncate text-xs text-gray-500 dark:text-gray-400">{hostname(job.url)}</p>
                <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-gray-400">
                  <span>{mode.label}</span>
                  {job.status === "completed" && <span>{job.pages_crawled} Seiten · {job.chunks_created} Abschnitte</span>}
                  <span>{formatDuration(job)}</span>
                  <span>{formatDate(job.created_at)}</span>
                </div>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => remove(job)}
                disabled={active}
                className="size-9 shrink-0 rounded-lg text-gray-400 opacity-100 hover:bg-error-50 hover:text-error-600 sm:opacity-0 sm:group-hover:opacity-100 sm:focus-visible:opacity-100"
                aria-label={`${job.name} aus Verlauf entfernen`}
                title="Aus Verlauf entfernen"
              >
                <Trash2 className="size-4" />
              </Button>
            </article>
          )
        })}
      </div>

      {filteredJobs.length === 0 && <p className="py-8 text-center text-sm text-gray-500">Keine passenden Crawls gefunden.</p>}
      <p className="text-[11px] leading-5 text-gray-400">Der Verlauf wird lokal im Browser gespeichert. Das Entfernen löscht keine Wissensbasis.</p>
    </div>
  )
}
