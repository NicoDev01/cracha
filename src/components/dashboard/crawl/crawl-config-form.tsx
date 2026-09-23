"use client"

import { useEffect, useRef, useState } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { ChevronDown, File, Globe2, ListTree, Loader2, Play, Search, Settings2 } from "lucide-react"
import { toast } from "sonner"

import Link from "next/link"
import { CREDITS, affordablePages, crawlCost } from "@/lib/credit-tariff"
import { useCredits } from "@/hooks/use-credits"

import { apiFetch } from "@/lib/api/request"
import { Button } from "@/components/ui/button"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
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
  { value: "single" as const, label: "Einzelne Seite", icon: File },
  { value: "recursive" as const, label: "Verlinkte Seiten", icon: Globe2 },
  { value: "sitemap" as const, label: "Sitemap", icon: ListTree },
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
      respect_robots_txt: initialValues?.respect_robots_txt ?? true,
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
      toast.success("Einlesen gestartet. Es läuft im Hintergrund weiter.")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Einlesen konnte nicht gestartet werden.")
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
        <FormField
          control={form.control}
          name="url"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Quelle</FormLabel>
              <FormControl>
                <div className="relative">
                  <Globe2 className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-gray-400" />
                  <Input
                    {...field}
                    type="url"
                    placeholder="https://example.com"
                    autoComplete="url"
                    disabled={isRunning}
                    className="h-12 rounded-xl pl-10 text-base"
                  />
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {crawlType !== "single" && (
          <div className="space-y-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleAnalyze}
              disabled={isRunning || analysis.status === "loading" || !isCrawlableUrl(url)}
              className="h-9 gap-2 rounded-xl"
            >
              {analysis.status === "loading" ? <Loader2 className="size-4 animate-spin" /> : <Search className="size-4" />}
              {analysis.status === "loading" ? "Analysiere Website" : "Website analysieren"}
            </Button>

            {analysis.status === "error" && (
              <p className="rounded-xl border border-error-200 bg-error-50 px-3 py-2 text-sm text-error-700 dark:border-error-800 dark:bg-error-500/10 dark:text-error-300">
                {analysis.message}
              </p>
            )}

            {analysis.status === "done" && discovered === null && (
              <p className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-600 dark:border-gray-700 dark:bg-gray-800/40 dark:text-gray-300">
                Keine Sitemap gefunden. Die Gesamtzahl der Seiten lässt sich vorab nicht bestimmen —
                sie steht erst fest, wenn beim Einlesen keine neuen Links mehr auftauchen. Stelle Seitenanzahl
                und Tiefe unten selbst ein.
              </p>
            )}

            {analysis.status === "done" && discovered !== null && (
              <div className="space-y-3 rounded-xl border border-brand-200 bg-brand-50/70 p-3 dark:border-brand-800 dark:bg-brand-500/10">
                <p className="text-sm text-gray-700 dark:text-gray-200">
                  <span className="font-semibold tabular-nums text-brand-700 dark:text-brand-300">
                    {new Intl.NumberFormat("de-DE").format(discovered)}
                  </span>
                  {discovered === 1 ? " Seite" : " Seiten"} in der Sitemap gefunden
                  {analysis.truncated && " (Zählung abgebrochen, es sind mehr)"}.
                  {discovered > MAX_PAGES_PER_CRAWL
                    && ` Pro Durchgang werden derzeit höchstens ${MAX_PAGES_PER_CRAWL} davon eingelesen.`}
                </p>

                <FormField
                  control={form.control}
                  name="crawl_all"
                  render={({ field }) => (
                    <FormItem className="flex items-center justify-between gap-4 rounded-lg border border-gray-200 bg-white p-3 dark:border-gray-700 dark:bg-gray-900">
                      <div className="min-w-0">
                        <FormLabel>
                          {`Bis zu ${new Intl.NumberFormat("de-DE").format(cappedTotal)} Seiten der Sitemap einlesen`}
                        </FormLabel>
                        <FormDescription>
                          {discovered > MAX_PAGES_PER_CRAWL
                            ? `Pro Durchgang sind derzeit ${MAX_PAGES_PER_CRAWL} Seiten möglich — ${new Intl.NumberFormat("de-DE").format(discovered - MAX_PAGES_PER_CRAWL)} bleiben außen vor.`
                            : "Erfasst auch Seiten, auf die nichts verlinkt. Eine Sitemap darf unvollständig sein — führt die Website mehr Seiten, findet „Verlinkte Seiten“ über die Links mehr."}
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          disabled={isRunning}
                          onCheckedChange={(checked) => {
                            field.onChange(checked)
                            if (checked) form.setValue("limit", cappedTotal)
                          }}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>
            )}
          </div>
        )}

        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Name der Wissensbasis</FormLabel>
              <FormControl>
                <Input {...field} placeholder="z. B. Produktdokumentation" autoComplete="off" disabled={isRunning} className="h-11 rounded-xl" />
              </FormControl>
              <FormDescription>Dieser Name erscheint später im Chat und unter Wissensbasen.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="type"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Umfang</FormLabel>
              <FormControl>
                <div className="grid gap-2 sm:grid-cols-3" role="radiogroup" aria-label="Umfang">
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
                          "flex min-h-12 items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-center transition-colors",
                          selected
                            ? "border-brand-500 bg-brand-50 text-brand-700 ring-1 ring-brand-500/20 dark:bg-brand-500/10 dark:text-brand-300"
                            : "border-gray-200 bg-white text-gray-700 hover:border-gray-300 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200",
                          "disabled:cursor-not-allowed disabled:opacity-60",
                        )}
                      >
                        <Icon className="size-4 shrink-0" />
                        <span className="text-sm font-semibold">{mode.label}</span>
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
          <div className={cn("grid gap-5 rounded-xl border border-gray-200 bg-gray-50/60 p-4 dark:border-gray-700 dark:bg-gray-800/30", crawlType === "recursive" && "sm:grid-cols-2 sm:gap-7")}>
            <FormField
              control={form.control}
              name="limit"
              render={({ field }) => (
                <FormItem>
                  <div className="flex items-center justify-between gap-3">
                    <FormLabel>Seitenanzahl</FormLabel>
                    <span className="text-xs tabular-nums text-gray-500">{field.value} · Max. 500</span>
                  </div>
                  <FormControl>
                    <Slider
                      min={1}
                      max={500}
                      step={1}
                      value={[field.value]}
                      disabled={isRunning}
                      onValueChange={(value) => field.onChange(value[0])}
                      aria-label="Seitenanzahl"
                      className="py-2"
                    />
                  </FormControl>
                  <FormDescription>Für den ersten Test empfehlen wir 20 Seiten. Eine indexierte Seite kostet {CREDITS.perPage} Credit, eine Antwort {CREDITS.perChatMessage} Credits.</FormDescription>
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
                    <div className="flex items-center justify-between gap-3">
                      <FormLabel>Tiefe</FormLabel>
                      <span className="text-xs tabular-nums text-gray-500">{field.value} · Max. 5</span>
                    </div>
                    <FormControl>
                      <Slider
                        min={1}
                        max={5}
                        step={1}
                        value={[field.value]}
                        disabled={isRunning}
                        onValueChange={(value) => field.onChange(value[0])}
                        aria-label="Link-Tiefe"
                        className="py-2"
                      />
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
            <Button type="button" variant="ghost" className="h-9 gap-2 rounded-lg px-2 text-gray-500" disabled={isRunning}>
              <Settings2 className="size-4" />
              Erweiterte Einstellungen
              <ChevronDown className={cn("size-4 transition-transform", showAdvanced && "rotate-180")} />
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-3 space-y-4 rounded-xl border border-gray-200 bg-gray-50/70 p-4 dark:border-gray-700 dark:bg-gray-800/40">
            <div className="grid gap-4 md:grid-cols-2">
              <FormField
                control={form.control}
                name="include_patterns"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nur URLs mit</FormLabel>
                    <FormControl><Textarea {...field} placeholder={"*docs*\n*guide*"} className="min-h-20 font-mono text-xs" /></FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="exclude_domains"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Domains ausschließen</FormLabel>
                    <FormControl><Textarea {...field} placeholder={"ads.example.com"} className="min-h-20 font-mono text-xs" /></FormControl>
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="respect_robots_txt"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between gap-4 rounded-lg border border-gray-200 bg-white p-3 dark:border-gray-700 dark:bg-gray-900">
                  <div>
                    <FormLabel>robots.txt beachten</FormLabel>
                  </div>
                  <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                </FormItem>
              )}
            />
          </CollapsibleContent>
        </Collapsible>

        <div role="status" className="rounded-xl border border-gray-200 bg-gray-50 p-4 text-sm dark:border-gray-700 dark:bg-gray-800/40">
          <p className="font-medium">Maximal {maximumCost} Credits für bis zu {allowedPages} Seiten</p>
          <p className="mt-1 text-gray-500">Abgerechnet werden nur indexierte Seiten. Nicht benötigtes reserviertes Guthaben wird freigegeben. Auch vollständig eingelesen kann eine Wissensbasis nur einen Teil der Website abbilden.</p>
          {credits && <p className="mt-2">Verfügbar: {credits.balance} Credits. Danach bleiben mindestens {remainingQuestions} bezahlbare Fragen, sofern du zwischenzeitlich kein weiteres Guthaben verbrauchst.</p>}
          {credits && allowedPages < requestedPages && <p className="mt-2 text-amber-700 dark:text-amber-400">Dein Guthaben begrenzt das Einlesen auf {allowedPages} statt {requestedPages} Seiten. <Link className="underline" href="/dashboard#guthaben">Guthaben aufladen</Link></p>}
          {remainingQuestions === 0 && allowedPages > 0 && <p className="mt-2 text-amber-700 dark:text-amber-400">Bei voller Ausschöpfung bleibt kein Guthaben für Fragen. Reduziere die Seitenzahl oder lade Guthaben auf.</p>}
          {creditError && <p className="mt-2">{creditError} <button type="button" className="underline" onClick={() => void refresh()}>Erneut laden</button></p>}
          {!credits && !creditError && <p className="mt-2">Dein verfügbares Guthaben wird geladen. Der Server prüft das endgültige Limit beim Start.</p>}
        </div>
        <Button type="submit" disabled={isRunning || (credits !== null && allowedPages === 0)} className="h-11 w-full gap-2 rounded-xl bg-brand-500 !text-white hover:bg-brand-600 sm:w-auto sm:min-w-44">
          {isRunning ? <Loader2 className="size-4 animate-spin" /> : <Play className="size-4" />}
          {isRunning ? "Wird eingelesen" : "Einlesen starten"}
        </Button>
      </form>
    </Form>
  )
}
