"use client"

import { useEffect, useRef, useState } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { ArrowRight, ChevronDown, File, Globe2, ListTree, Loader2, Search, Settings2 } from "lucide-react"
import { motion } from "motion/react"
import { toast } from "sonner"

import Link from "next/link"
import { CREDITS, affordablePages, crawlCost } from "@/lib/credit-tariff"
import { useCredits } from "@/hooks/use-credits"

import { apiFetch } from "@/lib/api/request"
import { Button } from "@/components/ui/button"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Slider } from "@/components/ui/slider"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import { useAuthStore } from "@/stores/auth-store"
import { useCrawlStore, type CrawlConfig } from "@/stores/crawl-store"

const crawlConfigSchema = z.object({
  url: z.string().url("Bitte gib eine gültige URL ein.").refine(
    (value) => ["http:", "https:"].includes(new URL(value).protocol),
    "Nur HTTP- und HTTPS-URLs sind erlaubt.",
  ),
  name: z.string().trim().min(2, "Bitte vergib einen Namen.").max(80, "Maximal 80 Zeichen."),
  type: z.enum(["single", "recursive", "sitemap"]),
  max_depth: z.number().int().min(1).max(5),
  limit: z.number().int().min(1).max(500),
  include_patterns: z.string().optional(),
  exclude_domains: z.string().optional(),
  respect_robots_txt: z.boolean(),
  crawl_all: z.boolean(),
})

type CrawlFormValues = z.infer<typeof crawlConfigSchema>

/** Mirrors the crawler's own ceiling (`CrawlRequest.limit`, le=500). */
const MAX_PAGES_PER_CRAWL = 500

type AnalysisState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "done"; total: number | null; sitemapUrl: string | null; truncated: boolean }

function isCrawlableUrl(value: string) {
  try {
    return ["http:", "https:"].includes(new URL(value).protocol)
  } catch {
    return false
  }
}

const modes = [
  { value: "single" as const, label: "Einzelne Seite", short: "Einzelseite", icon: File },
  { value: "recursive" as const, label: "Unterseiten", short: "Unterseiten", icon: Globe2 },
  { value: "sitemap" as const, label: "Sitemap", short: "Sitemap", icon: ListTree },
]

export function CrawlConfigForm({
  onStarted,
  initialValues,
}: {
  onStarted?: () => void
  initialValues?: Partial<CrawlFormValues>
}) {
  const { credits, error: creditError, refresh } = useCredits()
  const analysisRequest = useRef(0)
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [analysis, setAnalysis] = useState<AnalysisState>({ status: "idle" })
  const { startCrawl, isRunning } = useCrawlStore()
  const { user } = useAuthStore()

  const form = useForm<CrawlFormValues>({
    resolver: zodResolver(crawlConfigSchema),
    defaultValues: {
      url: initialValues?.url ?? "",
      name: initialValues?.name ?? "",
      type: initialValues?.type ?? "recursive",
      max_depth: initialValues?.max_depth ?? 2,
      // Leave the 100-credit trial enough room for questions after indexing.
      limit: initialValues?.limit ?? 20,
      include_patterns: initialValues?.include_patterns ?? "",
      exclude_domains: initialValues?.exclude_domains ?? "",
      respect_robots_txt: initialValues?.respect_robots_txt ?? false,
      crawl_all: initialValues?.crawl_all ?? false,
    },
  })

  useEffect(() => {
    if (initialValues) {
      if (initialValues.url !== undefined && initialValues.url !== form.getValues("url")) form.setValue("url", initialValues.url)
      if (initialValues.name !== undefined && initialValues.name !== form.getValues("name")) form.setValue("name", initialValues.name)
      if (initialValues.type !== undefined && initialValues.type !== form.getValues("type")) form.setValue("type", initialValues.type)
      if (initialValues.max_depth !== undefined && initialValues.max_depth !== form.getValues("max_depth")) form.setValue("max_depth", initialValues.max_depth)
      if (initialValues.limit !== undefined && initialValues.limit !== form.getValues("limit")) form.setValue("limit", initialValues.limit)
      if (initialValues.include_patterns !== undefined && initialValues.include_patterns !== form.getValues("include_patterns")) form.setValue("include_patterns", initialValues.include_patterns)
      if (initialValues.exclude_domains !== undefined && initialValues.exclude_domains !== form.getValues("exclude_domains")) form.setValue("exclude_domains", initialValues.exclude_domains)
    }
  }, [initialValues, form])

  // The crawler container is usually asleep when someone opens this form; by
  // the time the URL is typed it is awake, so the start does not wait for it.
  useEffect(() => {
    void apiFetch("/api/admin/crawl/warm", { method: "POST" }).catch(() => undefined)
  }, [])

  const crawlType = form.watch("type")
  const url = form.watch("url")
  const crawlAll = form.watch("crawl_all")
  const requestedLimit = form.watch("limit")

  // A count belongs to the URL it was measured for; editing the URL invalidates it.
  useEffect(() => {
    ++analysisRequest.current
    setAnalysis({ status: "idle" })
    form.setValue("crawl_all", false)
  }, [url, form])

  const discovered = analysis.status === "done" ? analysis.total : null
  const cappedTotal = discovered === null ? 0 : Math.min(discovered, MAX_PAGES_PER_CRAWL)

  const requestedPages = crawlType === "single" ? 1 : crawlAll && discovered !== null ? cappedTotal : requestedLimit
  const allowedPages = credits ? Math.min(requestedPages, affordablePages(credits.balance)) : requestedPages
  const maximumCost = crawlCost(allowedPages)
  const remainingQuestions = credits ? Math.floor(Math.max(0, credits.balance - maximumCost) / CREDITS.perChatMessage) : null

  const handleAnalyze = async () => {
    if (!isCrawlableUrl(url)) {
      form.setError("url", { message: "Bitte gib zuerst eine gültige URL ein." })
      return
    }
    const sequence = ++analysisRequest.current
    setAnalysis({ status: "loading" })
    try {
      const response = await apiFetch("/api/admin/crawl/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
        signal: AbortSignal.timeout(30_000),
      })
      const result = (await response.json().catch(() => ({}))) as {
        success?: boolean
        analysis?: { total_pages: number | null; sitemap_url: string | null; truncated: boolean }
        error?: string
      }
      if (!response.ok || !result.success || !result.analysis) {
        throw new Error(result.error ?? "Die Website konnte nicht analysiert werden.")
      }
      if (analysisRequest.current !== sequence) return
      setAnalysis({
        status: "done",
        total: result.analysis.total_pages,
        sitemapUrl: result.analysis.sitemap_url,
        truncated: result.analysis.truncated,
      })
    } catch (error) {
      if (analysisRequest.current !== sequence) return
      setAnalysis({
        status: "error",
        message: error instanceof Error ? error.message : "Die Website konnte nicht analysiert werden.",
      })
    }
  }

  const onSubmit = async (values: CrawlFormValues) => {
    if (!user?.id) {
      toast.error("Bitte melde dich erneut an.")
      return
    }

    const { crawl_all, ...rest } = values
    // With a page list from the sitemap, following links would be the weaker
    // choice: it reaches only what is linked.
    const useSitemap = crawl_all && discovered !== null

    const config: CrawlConfig = {
      ...rest,
      type: values.type === "single" ? "single" : useSitemap ? "sitemap" : values.type,
      // No id here any more. It was built from the name plus eight characters
      // of the user id, which meant the browser chose the key its own data is
      // stored under. The server assigns it and returns it.
      user_id: user.id,
      max_depth: values.type === "single" ? 1 : values.max_depth,
      limit: values.type === "single" ? 1 : useSitemap ? cappedTotal : values.limit,
    }

    try {
      await startCrawl(config)
      window.dispatchEvent(new Event("cracha:credits-changed"))
      onStarted?.()
      toast.success("Crawl gestartet. Er läuft im Hintergrund weiter.")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Crawl konnte nicht gestartet werden.")
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-7">
        <FormField
          control={form.control}
          name="url"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="sr-only">Website</FormLabel>
              <FormControl>
                <div className="group relative">
                  <Globe2 className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-gray-400 transition-colors group-focus-within:text-brand-500" />
                  <Input
                    {...field}
                    type="url"
                    placeholder="https://deine-website.de"
                    autoComplete="url"
                    disabled={isRunning}
                    className={cn("h-14 rounded-2xl pl-12 text-base shadow-theme-xs", crawlType !== "single" && "pr-14 sm:pr-36")}
                  />
                  {crawlType !== "single" && (
                    <button
                      type="button"
                      aria-label="Website analysieren"
                      onClick={handleAnalyze}
                      disabled={isRunning || analysis.status === "loading" || !isCrawlableUrl(url)}
                      className="absolute right-2 top-1/2 inline-flex h-10 -translate-y-1/2 items-center gap-1.5 rounded-xl px-3 text-sm font-medium text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-900 disabled:pointer-events-none disabled:opacity-40 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white"
                    >
                      {analysis.status === "loading" ? <Loader2 className="size-4 animate-spin" /> : <Search className="size-4" />}
                      <span className="hidden sm:inline">Analysieren</span>
                    </button>
                  )}
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {crawlType !== "single" && analysis.status === "error" && (
          <p className="-mt-4 text-sm text-error-600 dark:text-error-400">{analysis.message}</p>
        )}
        {crawlType !== "single" && analysis.status === "done" && discovered === null && (
          <p className="-mt-4 text-sm text-gray-500 dark:text-gray-400">Keine Sitemap gefunden. Seiten und Tiefe legst du unten fest.</p>
        )}
        {crawlType !== "single" && analysis.status === "done" && discovered !== null && (
          <FormField
            control={form.control}
            name="crawl_all"
            render={({ field }) => (
              <FormItem className="-mt-3 flex items-center justify-between gap-4 rounded-xl bg-brand-50 px-4 py-3 dark:bg-brand-500/10">
                <FormLabel className="text-sm font-normal text-gray-700 dark:text-gray-200">
                  <span>
                    <span className="font-semibold tabular-nums text-brand-600 dark:text-brand-300">{new Intl.NumberFormat("de-DE").format(discovered)}</span>
                    {discovered === 1 ? " Seite" : " Seiten"} in der Sitemap{analysis.truncated && " und mehr"}
                    {discovered > MAX_PAGES_PER_CRAWL && ` · ${MAX_PAGES_PER_CRAWL} pro Durchgang`}
                  </span>
                </FormLabel>
                <div className="flex shrink-0 items-center gap-2">
                  <span className="text-xs text-gray-500 dark:text-gray-400">Alle einlesen</span>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      disabled={isRunning}
                      aria-label="Alle Seiten der Sitemap einlesen"
                      onCheckedChange={(checked) => {
                        field.onChange(checked)
                        if (checked) form.setValue("limit", cappedTotal)
                      }}
                    />
                  </FormControl>
                </div>
              </FormItem>
            )}
          />
        )}

        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-sm font-medium text-gray-700 dark:text-gray-300">Name</FormLabel>
              <FormControl>
                <Input {...field} placeholder="z. B. Produktdokumentation" autoComplete="off" disabled={isRunning} className="h-11 rounded-xl" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="type"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-sm font-medium text-gray-700 dark:text-gray-300">Umfang</FormLabel>
              <FormControl>
                <div className="grid grid-cols-3 gap-1 rounded-xl bg-gray-100 p-1 dark:bg-gray-800/70" role="radiogroup" aria-label="Umfang">
                  {modes.map((mode) => {
                    const Icon = mode.icon
                    const selected = field.value === mode.value
                    return (
                      <button
                        key={mode.value}
                        type="button"
                        role="radio"
                        aria-checked={selected}
                        disabled={isRunning}
                        onClick={() => field.onChange(mode.value)}
                        className={cn(
                          "relative flex h-10 items-center justify-center gap-2 rounded-lg px-2 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-60",
                          selected ? "text-gray-900 dark:text-white" : "text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200",
                        )}
                      >
                        {selected && (
                          <motion.span
                            layoutId="crawl-mode"
                            className="absolute inset-0 rounded-lg bg-white shadow-theme-xs dark:bg-gray-900"
                            transition={{ type: "spring", stiffness: 500, damping: 38 }}
                          />
                        )}
                        <Icon className="relative hidden size-4 shrink-0 sm:block" />
                        <span className="relative truncate sm:hidden">{mode.short}</span>
                        <span className="relative hidden truncate sm:inline">{mode.label}</span>
                      </button>
                    )
                  })}
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Both sliders are meaningless once the exact page list is known. */}
        {crawlType !== "single" && !crawlAll && (
          <div className={cn("grid gap-6", crawlType === "recursive" && "sm:grid-cols-2 sm:gap-8")}>
            <FormField
              control={form.control}
              name="limit"
              render={({ field }) => (
                <FormItem>
                  <div className="flex items-baseline justify-between gap-3">
                    <FormLabel className="text-sm font-medium text-gray-700 dark:text-gray-300">Seiten</FormLabel>
                    <span className="text-sm font-semibold tabular-nums text-gray-900 dark:text-white">{field.value}</span>
                  </div>
                  <FormControl>
                    <Slider min={1} max={500} step={1} value={[field.value]} disabled={isRunning} onValueChange={(value) => field.onChange(value[0])} aria-label="Seitenanzahl" className="py-2" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {crawlType === "recursive" && (
              <FormField
                control={form.control}
                name="max_depth"
                render={({ field }) => (
                  <FormItem>
                    <div className="flex items-baseline justify-between gap-3">
                      <FormLabel className="text-sm font-medium text-gray-700 dark:text-gray-300">Tiefe</FormLabel>
                      <span className="text-sm font-semibold tabular-nums text-gray-900 dark:text-white">{field.value}</span>
                    </div>
                    <FormControl>
                      <Slider min={1} max={5} step={1} value={[field.value]} disabled={isRunning} onValueChange={(value) => field.onChange(value[0])} aria-label="Link-Tiefe" className="py-2" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
          </div>
        )}

        <Collapsible open={showAdvanced} onOpenChange={setShowAdvanced}>
          <CollapsibleTrigger asChild>
            <button type="button" disabled={isRunning} className="inline-flex items-center gap-1.5 text-sm text-gray-500 transition-colors hover:text-gray-900 disabled:opacity-50 dark:text-gray-400 dark:hover:text-white">
              <Settings2 className="size-4" />
              Erweitert
              <ChevronDown className={cn("size-4 transition-transform", showAdvanced && "rotate-180")} />
            </button>
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-4 space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <FormField
                control={form.control}
                name="include_patterns"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium text-gray-700 dark:text-gray-300">Nur URLs mit</FormLabel>
                    <FormControl><Textarea {...field} placeholder={"*docs*\n*guide*"} className="min-h-20 rounded-xl font-mono text-xs" /></FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="exclude_domains"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium text-gray-700 dark:text-gray-300">Domains ausschließen</FormLabel>
                    <FormControl><Textarea {...field} placeholder={"ads.example.com"} className="min-h-20 rounded-xl font-mono text-xs" /></FormControl>
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="respect_robots_txt"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between gap-4">
                  <FormLabel className="text-sm font-medium text-gray-700 dark:text-gray-300">robots.txt beachten</FormLabel>
                  <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                </FormItem>
              )}
            />
          </CollapsibleContent>
        </Collapsible>

        {/* The price stays next to the button: prepaid credits are only fair if
            the cost of the next action is visible before it is taken. */}
        <div className="flex flex-col-reverse gap-3 border-t border-gray-100 pt-6 sm:flex-row sm:items-center sm:justify-between dark:border-gray-800">
          <div role="status" className="text-sm text-gray-500 dark:text-gray-400">
            <p>
              <span className="font-medium tabular-nums text-gray-900 dark:text-white">max. {maximumCost} Credits</span>
              {credits && <span className="tabular-nums"> · {credits.balance} verfügbar</span>}
            </p>
            {credits && allowedPages < requestedPages && (
              <p className="mt-1 text-xs text-warning-600 dark:text-warning-400">Reicht für {allowedPages} von {requestedPages} Seiten. <Link className="underline" href="/dashboard#guthaben">Aufladen</Link></p>
            )}
            {credits && allowedPages >= requestedPages && remainingQuestions === 0 && allowedPages > 0 && (
              <p className="mt-1 text-xs text-warning-600 dark:text-warning-400">Danach bleibt kein Guthaben für Fragen.</p>
            )}
            {creditError && <p className="mt-1 text-xs">{creditError} <button type="button" className="underline" onClick={() => void refresh()}>Erneut laden</button></p>}
          </div>
          <Button type="submit" disabled={isRunning || (credits !== null && allowedPages === 0)} className="h-11 gap-2 rounded-full bg-brand-500 px-6 !text-white shadow-theme-xs hover:bg-brand-600">
            {isRunning && <Loader2 className="size-4 animate-spin" />}
            {isRunning ? "Crawl läuft" : "Crawl starten"}
            {!isRunning && <ArrowRight className="size-4" />}
          </Button>
        </div>
      </form>
    </Form>
  )
}
