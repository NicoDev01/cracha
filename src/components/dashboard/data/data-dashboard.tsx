"use client"

import { Link, useAppLocale } from "@/i18n/navigation";
import { useCallback, useEffect, useMemo, useState } from "react"
import { ExternalLink, Globe, Library, Loader2, MessagesSquare, RefreshCw, Search, Trash2 } from "lucide-react"
import { toast } from "sonner"

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { StatusBadge } from "@/components/dashboard/common/StatusBadge"
import { deleteDatabase } from "@/lib/api/database-api"
import { useChatStore } from "@/stores/chat-store"
import { apiFetch } from "@/lib/api/request"
import {
  chatHref,
  databaseName,
  databaseStatus,
  formatDateTime,
  formatNumber,
  hostname,
  pageCount,
  sourceUrl,
  STATUS_LABELS,
} from "@/lib/databases"
import { cn } from "@/lib/utils"
import { useAuthStore } from "@/stores/auth-store"
import { getDatabases } from "@/stores/chat-store"
import type { Database } from "@/types/chat"

const copy = {
  de: {
    loadFailed: "Wissensbasen konnten nicht geladen werden.",
    deletedOne: "Wissensbasis gelöscht.",
    deletedMany: (count: number) => `${count} Wissensbasen gelöscht.`,
    deleteFailed: (count: number) => `${count} ${count === 1 ? "Wissensbasis konnte" : "Wissensbasen konnten"} nicht gelöscht werden.`,
    recrawlFailed: "Neu einlesen konnte nicht gestartet werden.",
    recrawling: (name: string) => `„${name}“ wird neu eingelesen.`,
    search: "Wissensbasen durchsuchen",
    refresh: "Aktualisieren",
    crawl: "Website crawlen",
    selected: (count: number) => `${count} ausgewählt`,
    delete: "Löschen",
    retry: "Erneut versuchen",
    loading: "Wissensbasen werden geladen",
    noMatches: "Keine Treffer",
    none: "Noch keine Wissensbasis",
    adjust: "Passe deine Suche an.",
    noneHint: "Lies eine Website ein, um deine erste Wissensbasis anzulegen.",
    selectAll: "Alle sichtbaren Wissensbasen auswählen",
    knowledgeBase: "Wissensbasis",
    source: "Quelle",
    status: "Status",
    pages: "Seiten",
    chunks: "Abschnitte",
    lastRead: "Zuletzt eingelesen",
    actions: "Aktionen",
    select: (name: string) => `${name} auswählen`,
    askIn: (name: string) => `${name} im Chat fragen`,
    ask: "Fragen",
    notReadyLabel: (name: string) => `${name} ist noch nicht durchsuchbar`,
    notReady: "Noch nicht durchsuchbar",
    rereadLabel: (name: string) => `${name} neu einlesen`,
    reread: "Neu einlesen",
    deleteLabel: (name: string) => `${name} löschen`,
    count: (shown: number, total: number) => `${shown} von ${total} Wissensbasen`,
    deleteTitleOne: "Wissensbasis löschen?",
    deleteTitleMany: (count: number) => `${count} Wissensbasen löschen?`,
    deleteTextOne: "Alle Inhalte dieser Wissensbasis und alle Chats mit ihr werden dauerhaft entfernt. Diese Aktion kann nicht rückgängig gemacht werden.",
    deleteTextMany: "Alle Inhalte dieser Wissensbasen und alle Chats mit ihnen werden dauerhaft entfernt. Diese Aktion kann nicht rückgängig gemacht werden.",
    cancel: "Abbrechen",
    deleting: "Wird gelöscht",
  },
  en: {
    loadFailed: "Knowledge bases could not be loaded.",
    deletedOne: "Knowledge base deleted.",
    deletedMany: (count: number) => `${count} knowledge bases deleted.`,
    deleteFailed: (count: number) => `${count} ${count === 1 ? "knowledge base" : "knowledge bases"} could not be deleted.`,
    recrawlFailed: "Reading again could not be started.",
    recrawling: (name: string) => `“${name}” is being read again.`,
    search: "Search knowledge bases",
    refresh: "Refresh",
    crawl: "Crawl a website",
    selected: (count: number) => `${count} selected`,
    delete: "Delete",
    retry: "Try again",
    loading: "Loading knowledge bases",
    noMatches: "No matches",
    none: "No knowledge base yet",
    adjust: "Adjust your search.",
    noneHint: "Read a website to create your first knowledge base.",
    selectAll: "Select all visible knowledge bases",
    knowledgeBase: "Knowledge base",
    source: "Source",
    status: "Status",
    pages: "Pages",
    chunks: "Chunks",
    lastRead: "Last read",
    actions: "Actions",
    select: (name: string) => `Select ${name}`,
    askIn: (name: string) => `Ask ${name} in the chat`,
    ask: "Ask",
    notReadyLabel: (name: string) => `${name} isn’t searchable yet`,
    notReady: "Not searchable yet",
    rereadLabel: (name: string) => `Read ${name} again`,
    reread: "Read again",
    deleteLabel: (name: string) => `Delete ${name}`,
    count: (shown: number, total: number) => `${shown} of ${total} knowledge bases`,
    deleteTitleOne: "Delete knowledge base?",
    deleteTitleMany: (count: number) => `Delete ${count} knowledge bases?`,
    deleteTextOne: "All content of this knowledge base and all chats with it will be removed permanently. This action can’t be undone.",
    deleteTextMany: "All content of these knowledge bases and all chats with them will be removed permanently. This action can’t be undone.",
    cancel: "Cancel",
    deleting: "Deleting",
  },
} as const

export function DataDashboard() {
  const locale = useAppLocale()
  const t = copy[locale]
  const { user } = useAuthStore()
  const [databases, setDatabases] = useState<Database[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [deleteIds, setDeleteIds] = useState<string[]>([])
  const [isDeleting, setIsDeleting] = useState(false)
  const [recrawlingIds, setRecrawlingIds] = useState<Set<string>>(new Set())

  // `background` is true for the poll that runs during a crawl. It never shows
  // the spinner and never clears the list, so one dropped request mid-crawl
  // does not look like the dashboard breaking. The spinner itself is switched
  // on by whoever asks for a visible reload -- never in an effect, where it
  // would render the page once and then immediately render it again.
  const pruneSelection = useCallback((current: Database[]) => {
    const live = new Set(current.map((database) => database.id))
    setSelectedIds((selected) => {
      const kept = [...selected].filter((id) => live.has(id))
      // Same set, same object: a poll every ten seconds must not re-render the
      // table just because it looked.
      return kept.length === selected.size ? selected : new Set(kept)
    })
  }, [])

  const loadDatabases = useCallback(async (background = false) => {
    if (!user) {
      setDatabases([])
      setIsLoading(false)
      return
    }

    try {
      const fresh = await getDatabases()
      setDatabases(fresh)
      // Pruned here, where the list actually changes, rather than in an effect
      // watching it afterwards. A selection that outlives its row drives the
      // bulk bar and its delete button, so it must not survive the refresh
      // that removed the row -- including the failure below, which empties the
      // list entirely.
      pruneSelection(fresh)
      setError(null)
    } catch (loadError) {
      if (background) return
      setError(loadError instanceof Error ? loadError.message : t.loadFailed)
      setDatabases([])
      pruneSelection([])
    } finally {
      setIsLoading(false)
    }
  }, [pruneSelection, user, t.loadFailed])

  const isCrawling = databases.some((database) => databaseStatus(database) === "crawling")

  useEffect(() => {
    // Fetching on mount is what an effect is for, and this one sets no state
    // synchronously: with a user signed in the first statement is the await.
    // The rule cannot see that, because the signed-out branch it also contains
    // does set state -- and that branch is the one that never runs here.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadDatabases()
  }, [loadDatabases])

  useEffect(() => {
    if (!isCrawling) return
    // Keyed on the boolean, not on the array: every poll produced a new array,
    // which tore the interval down and rebuilt it on each response.
    const timer = window.setInterval(() => void loadDatabases(true), 10_000)
    return () => window.clearInterval(timer)
  }, [isCrawling, loadDatabases])

  const filteredDatabases = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()
    if (!query) return databases
    return databases.filter((database) => {
      const url = sourceUrl(database)
      return [databaseName(database), database.description, url, hostname(url), STATUS_LABELS[locale][databaseStatus(database)]]
        .some((value) => value?.toLowerCase().includes(query))
    })
  }, [databases, searchQuery, locale])

  const selectedVisible = filteredDatabases.filter((database) => selectedIds.has(database.id))
  const allVisibleSelected = filteredDatabases.length > 0 && selectedVisible.length === filteredDatabases.length
  const someVisibleSelected = selectedVisible.length > 0 && !allVisibleSelected

  const toggleAllVisible = () => {
    setSelectedIds((current) => {
      const next = new Set(current)
      for (const database of filteredDatabases) {
        if (allVisibleSelected) next.delete(database.id)
        else next.add(database.id)
      }
      return next
    })
  }

  const toggleDatabase = (id: string) => {
    setSelectedIds((current) => {
      const next = new Set(current)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const handleDelete = async () => {
    if (deleteIds.length === 0) return
    setIsDeleting(true)
    const results = await Promise.allSettled(deleteIds.map((id) => deleteDatabase(id)))
    const deleted = deleteIds.filter((_, index) => results[index].status === "fulfilled")
    const failed = deleteIds.length - deleted.length

    if (deleted.length > 0) {
      const deletedSet = new Set(deleted)
      useChatStore.getState().forgetDatabases(deleted)
      setDatabases((current) => current.filter((database) => !deletedSet.has(database.id)))
      setSelectedIds((current) => new Set([...current].filter((id) => !deletedSet.has(id))))
      toast.success(deleted.length === 1 ? t.deletedOne : t.deletedMany(deleted.length))
    }
    if (failed > 0) toast.error(t.deleteFailed(failed))

    setIsDeleting(false)
    setDeleteIds([])
  }

  const handleRecrawl = async (database: Database) => {
    setRecrawlingIds((current) => new Set(current).add(database.id))
    try {
      const response = await apiFetch(`/api/admin/databases/${encodeURIComponent(database.id)}/recrawl`, {
        method: "POST",
      })
      const result = await response.json().catch(() => ({})) as { error?: string }
      if (!response.ok) throw new Error(result.error || t.recrawlFailed)
      setDatabases((current) => current.map((entry) => (
        entry.id === database.id ? { ...entry, status: "crawling" } : entry
      )))
      toast.success(t.recrawling(databaseName(database)))
    } catch (recrawlError) {
      toast.error(recrawlError instanceof Error ? recrawlError.message : t.recrawlFailed)
    } finally {
      setRecrawlingIds((current) => {
        const next = new Set(current)
        next.delete(database.id)
        return next
      })
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-400" />
          <Input
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder={t.search}
            className="h-10 rounded-xl pl-9"
          />
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => void loadDatabases()} disabled={isLoading} className="h-10 gap-2 rounded-xl">
            <RefreshCw className={cn("size-4", isLoading && "animate-spin")} />
            {t.refresh}
          </Button>
          <Button asChild size="sm" className="h-10 gap-2 rounded-xl bg-brand-500 !text-white hover:bg-brand-600">
            <Link href="/dashboard/crawl"><Globe className="size-4" />{t.crawl}</Link>
          </Button>
        </div>
      </div>

      {selectedIds.size > 0 && (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 dark:border-gray-700 dark:bg-gray-800/60">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-200">{t.selected(selectedIds.size)}</span>
          <Button variant="ghost" size="sm" onClick={() => setDeleteIds([...selectedIds])} className="gap-2 rounded-lg text-error-600 hover:bg-error-50 hover:text-error-700 dark:hover:bg-error-500/10">
            <Trash2 className="size-4" />{t.delete}
          </Button>
        </div>
      )}

      {error && (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-error-200 bg-error-50 px-4 py-3 text-sm text-error-700 dark:border-error-800 dark:bg-error-500/10 dark:text-error-300">
          <span>{error}</span>
          <Button variant="ghost" size="sm" onClick={() => void loadDatabases()} className="shrink-0">{t.retry}</Button>
        </div>
      )}

      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-theme-xs dark:border-gray-700 dark:bg-gray-900">
        {isLoading ? (
          <div className="flex min-h-64 items-center justify-center gap-2 text-sm text-gray-500">
            <Loader2 className="size-4 animate-spin" />{t.loading}
          </div>
        ) : !error && filteredDatabases.length === 0 ? (
          <div className="flex min-h-64 flex-col items-center justify-center px-6 text-center">
            <Library className="size-8 text-gray-300 dark:text-gray-600" />
            <h2 className="mt-3 text-sm font-semibold text-gray-900 dark:text-white">{searchQuery ? t.noMatches : t.none}</h2>
            <p className="mt-1 text-xs text-gray-500">{searchQuery ? t.adjust : t.noneHint}</p>
          </div>
        ) : !error && (
          <Table className="min-w-[980px]">
            <TableHeader className="bg-gray-50/80 dark:bg-gray-800/60">
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-11 pl-4">
                  <input
                    type="checkbox"
                    checked={allVisibleSelected}
                    ref={(element) => { if (element) element.indeterminate = someVisibleSelected }}
                    onChange={toggleAllVisible}
                    aria-label={t.selectAll}
                    className="size-4 rounded border-gray-300 accent-brand-500"
                  />
                </TableHead>
                <TableHead>{t.knowledgeBase}</TableHead>
                <TableHead>{t.source}</TableHead>
                <TableHead>{t.status}</TableHead>
                <TableHead className="text-right">{t.pages}</TableHead>
                <TableHead className="text-right">{t.chunks}</TableHead>
                <TableHead>{t.lastRead}</TableHead>
                <TableHead className="w-32 text-right">{t.actions}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredDatabases.map((database) => {
                const url = sourceUrl(database)
                const isRecrawling = recrawlingIds.has(database.id)
                return (
                  <TableRow key={database.id} data-state={selectedIds.has(database.id) ? "selected" : undefined}>
                    <TableCell className="pl-4">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(database.id)}
                        onChange={() => toggleDatabase(database.id)}
                        aria-label={t.select(databaseName(database))}
                        className="size-4 rounded border-gray-300 accent-brand-500"
                      />
                    </TableCell>
                    <TableCell className="max-w-56">
                      <div className="truncate font-semibold text-gray-900 dark:text-white" title={databaseName(database)}>{databaseName(database)}</div>
                      {database.description && <div className="mt-0.5 truncate text-xs text-gray-500">{database.description}</div>}
                    </TableCell>
                    <TableCell className="max-w-64">
                      {url ? (
                        <a href={url} target="_blank" rel="noreferrer" className="group block min-w-0 text-gray-600 hover:text-brand-600 dark:text-gray-300">
                          <span className="flex items-center gap-1.5 font-medium"><span className="truncate">{hostname(url)}</span><ExternalLink className="size-3 shrink-0 opacity-60" /></span>
                          <span className="mt-0.5 block truncate text-xs text-gray-400" title={url}>{url}</span>
                        </a>
                      ) : "–"}
                    </TableCell>
                    <TableCell><StatusBadge status={databaseStatus(database)} /></TableCell>
                    <TableCell className="text-right tabular-nums">{formatNumber(pageCount(database), locale)}</TableCell>
                    <TableCell className="text-right font-medium tabular-nums">{formatNumber(database.chunks_count, locale)}</TableCell>
                    <TableCell className="whitespace-nowrap text-gray-500 dark:text-gray-400">{formatDateTime(database.last_crawl, locale)}</TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-1">
                        {databaseStatus(database) === "active" ? (
                          <Button asChild variant="ghost" size="icon" className="size-8 rounded-lg text-gray-500 hover:text-brand-600">
                            <Link
                              href={chatHref(database.id)}
                              prefetch={false}
                              aria-label={t.askIn(databaseName(database))}
                              title={t.ask}
                            >
                              <MessagesSquare className="size-4" />
                            </Link>
                          </Button>
                        ) : (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            disabled
                            className="size-8 rounded-lg text-gray-500"
                            aria-label={t.notReadyLabel(databaseName(database))}
                            title={t.notReady}
                          >
                            <MessagesSquare className="size-4" />
                          </Button>
                        )}
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => void handleRecrawl(database)}
                          disabled={isRecrawling || databaseStatus(database) === "crawling"}
                          className="size-8 rounded-lg text-gray-500 hover:text-brand-600"
                          aria-label={t.rereadLabel(databaseName(database))}
                          title={t.reread}
                        >
                          <RefreshCw className={cn("size-4", isRecrawling && "animate-spin")} />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => setDeleteIds([database.id])}
                          className="size-8 rounded-lg text-gray-500 hover:bg-error-50 hover:text-error-600 dark:hover:bg-error-500/10"
                          aria-label={t.deleteLabel(databaseName(database))}
                          title={t.delete}
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        )}
      </div>

      {!isLoading && !error && databases.length > 0 && (
        <p className="text-xs text-gray-400">{t.count(filteredDatabases.length, databases.length)}</p>
      )}

      <AlertDialog open={deleteIds.length > 0} onOpenChange={(open) => { if (!open && !isDeleting) setDeleteIds([]) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{deleteIds.length === 1 ? t.deleteTitleOne : t.deleteTitleMany(deleteIds.length)}</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteIds.length === 1
                ? t.deleteTextOne
                : t.deleteTextMany}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>{t.cancel}</AlertDialogCancel>
            <AlertDialogAction
              onClick={(event) => {
                event.preventDefault()
                void handleDelete()
              }}
              disabled={isDeleting}
              className="bg-error-600 text-white hover:bg-error-700"
            >
              {isDeleting ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Trash2 className="mr-2 size-4" />}
              {isDeleting ? t.deleting : t.delete}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
