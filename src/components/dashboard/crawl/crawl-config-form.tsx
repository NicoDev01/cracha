"use client"

import * as React from "react"
import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Slider } from "@/components/ui/slider"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Globe, ChevronDown, ChevronUp, Zap, Settings, Info, Play, DollarSign } from "lucide-react"
import { useCrawlStore } from "@/stores/crawl-store"
import { useAuthStore } from "@/stores/auth-store"

// Schema basierend auf main.py crawl parameters
const crawlConfigSchema = z.object({
  url: z.string().url("Bitte gib eine gültige URL ein"),
  tenant_id: z.string().min(1, "Database Name ist erforderlich").regex(/^[a-zA-Z0-9_-]+$/, "Nur Buchstaben, Zahlen, _ und - erlaubt"),
  type: z.enum(["single", "recursive", "sitemap", "batch"]),
  max_depth: z.number().min(1).max(5),
  limit: z.number().min(1).max(1000),
  embedding_model: z.enum(["gemini-768", "gemini-1536", "gemini-3072", "openai-small", "openai-large"]),

  // Advanced Options
  include_patterns: z.string().optional(),
  exclude_domains: z.string().optional(),
  include_domains: z.string().optional(),
  url_filter: z.string().optional(),
  exclude_external: z.boolean(),
  generate_summaries: z.boolean(),
  ultra_fast: z.boolean(),
})

type CrawlConfig = z.infer<typeof crawlConfigSchema>

export function CrawlConfigForm() {
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [estimatedCost, setEstimatedCost] = useState(0.0)
  const { startCrawl, isRunning } = useCrawlStore()
  const { user } = useAuthStore()

  const form = useForm<CrawlConfig>({
    resolver: zodResolver(crawlConfigSchema),
    defaultValues: {
      url: "",
      tenant_id: "",
      type: "single",
      max_depth: 2,
      limit: 50,
      embedding_model: "gemini-768",
      include_patterns: "",
      exclude_domains: "",
      include_domains: "",
      url_filter: "",
      exclude_external: false,
      generate_summaries: true,
      ultra_fast: true,
    },
  })

  const watchedValues = form.watch()

  // Estimate cost based on parameters
  const updateCostEstimate = (values: CrawlConfig) => {
    const basePages = values.type === "single" ? 1 : Math.min(values.limit, 100)
    const depthMultiplier = values.type === "recursive" ? values.max_depth : 1
    const estimatedPages = basePages * depthMultiplier

    // Cost per page estimation (based on gemini-768)
    const costPerPage = values.embedding_model === "gemini-768" ? 0.000010 :
      values.embedding_model === "gemini-1536" ? 0.000020 :
        values.embedding_model === "gemini-3072" ? 0.000040 :
          values.embedding_model === "openai-small" ? 0.000015 : 0.000030

    const estimated = estimatedPages * costPerPage
    setEstimatedCost(estimated)
  }

  // Update cost when form values change
  React.useEffect(() => {
    updateCostEstimate(watchedValues)
  }, [watchedValues])

  const onSubmit = async (values: CrawlConfig) => {
    if (!user?.id) {
      console.error("User not authenticated")
      return
    }

    try {
      await startCrawl({
        ...values,
        user_id: user.id, // Automatisch hinzugefügt
        // Automatische Hintergrund-Parameter (Phase 6 - task-frontend-erstellung2.md)
        max_concurrent: 5,           // Optimale Parallelität
        force: true,                // Keine Cost-Confirmation
        cleanup: true,              // Alte Versionen löschen
        exclude_social_media: true, // Qualität sicherstellen
        generate_summaries: true,   // Advanced RAG
        ultra_fast: true,          // Performance-Modus
      })
    } catch (error) {
      console.error("Failed to start crawl:", error)
    }
  }

  return (
    <div className="max-w-4xl mx-auto">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Basic Configuration */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <Globe className="w-5 h-5 text-blue-600" />
              <h3 className="text-lg font-semibold">Basis-Konfiguration</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="url"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Website URL *</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="https://docs.example.com"
                        {...field}
                        className="font-mono text-sm"
                      />
                    </FormControl>
                    <FormDescription>
                      Die URL der Website, die gecrawlt werden soll
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="tenant_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Database Name *</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="my-docs-database"
                        {...field}
                        className="font-mono text-sm"
                      />
                    </FormControl>
                    <FormDescription>
                      Eindeutiger Name für deine Datenbank
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Crawl Typ</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Wähle Crawl Typ" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="single">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline">Single</Badge>
                            <span>Einzelne Seite</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="recursive">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline">Recursive</Badge>
                            <span>Mehrere Seiten (Links folgen)</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="sitemap">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline">Sitemap</Badge>
                            <span>Via sitemap.xml</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="batch">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline">Batch</Badge>
                            <span>Mehrere URLs</span>
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="embedding_model"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Embedding Model</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Wähle Model" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="gemini-768">
                          <div className="flex items-center justify-between w-full">
                            <span>Gemini 768D</span>
                            <Badge variant="secondary" className="ml-2">Empfohlen</Badge>
                          </div>
                        </SelectItem>
                        <SelectItem value="gemini-1536">Gemini 1536D</SelectItem>
                        <SelectItem value="gemini-3072">Gemini 3072D</SelectItem>
                        <SelectItem value="openai-small">OpenAI Small</SelectItem>
                        <SelectItem value="openai-large">OpenAI Large</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Conditional fields for recursive crawling */}
            {watchedValues.type === "recursive" && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="max_depth"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Max Tiefe: {field.value}</FormLabel>
                      <FormControl>
                        <Slider
                          min={1}
                          max={5}
                          step={1}
                          value={[field.value]}
                          onValueChange={(value) => field.onChange(value[0])}
                          className="w-full"
                        />
                      </FormControl>
                      <FormDescription>
                        Wie tief soll in die Website-Struktur gecrawlt werden
                      </FormDescription>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="limit"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Seiten Limit: {field.value}</FormLabel>
                      <FormControl>
                        <Slider
                          min={1}
                          max={1000}
                          step={10}
                          value={[field.value]}
                          onValueChange={(value) => field.onChange(value[0])}
                          className="w-full"
                        />
                      </FormControl>
                      <FormDescription>
                        Maximale Anzahl zu crawlender Seiten
                      </FormDescription>
                    </FormItem>
                  )}
                />
              </div>
            )}
          </div>

          <Separator />

          {/* Advanced Options */}
          <Collapsible open={showAdvanced} onOpenChange={setShowAdvanced}>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" className="flex items-center gap-2 p-0 h-auto">
                <Settings className="w-4 h-4" />
                <span>Erweiterte Optionen</span>
                {showAdvanced ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </Button>
            </CollapsibleTrigger>

            <CollapsibleContent className="space-y-4 mt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="include_patterns"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Include Patterns</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="*docs* *tutorial* *guide*"
                          className="min-h-[80px] font-mono text-sm"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        URL-Muster die eingeschlossen werden sollen (ein Pattern pro Zeile)
                      </FormDescription>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="exclude_domains"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Exclude Domains</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="social.com ads.example.com"
                          className="min-h-[80px] font-mono text-sm"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        Domains die ausgeschlossen werden sollen (eine pro Zeile)
                      </FormDescription>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="include_domains"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Include Domains</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="docs.example.com help.example.com"
                          className="font-mono text-sm"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        Nur diese Domains crawlen (Leerzeichen getrennt)
                      </FormDescription>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="url_filter"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>URL Filter</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="documentation"
                          className="font-mono text-sm"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        Nur URLs die diesen Text enthalten
                      </FormDescription>
                    </FormItem>
                  )}
                />
              </div>

              <div className="flex flex-wrap gap-6">
                <FormField
                  control={form.control}
                  name="exclude_external"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center space-x-3 space-y-0">
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>Nur interne Links</FormLabel>
                        <FormDescription>
                          Externe Links ignorieren
                        </FormDescription>
                      </div>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="generate_summaries"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center space-x-3 space-y-0">
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>Summaries generieren</FormLabel>
                        <FormDescription>
                          LLM-Summaries für bessere RAG-Qualität
                        </FormDescription>
                      </div>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="ultra_fast"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center space-x-3 space-y-0">
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel className="flex items-center gap-1">
                          <Zap className="w-3 h-3" />
                          Ultra-Fast Modus
                        </FormLabel>
                        <FormDescription>
                          Maximale Geschwindigkeit
                        </FormDescription>
                      </div>
                    </FormItem>
                  )}
                />
              </div>
            </CollapsibleContent>
          </Collapsible>

          <Separator />

          {/* Cost Estimation & Submit */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <DollarSign className="w-4 h-4" />
              <span>Geschätzte Kosten: <strong>${estimatedCost.toFixed(6)}</strong></span>
              <Info className="w-4 h-4 text-gray-400" />
            </div>

            <Button
              type="submit"
              disabled={isRunning}
              className="flex items-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-700"
            >
              <Play className="w-4 h-4" />
              {isRunning ? "Crawling läuft..." : "Crawl starten"}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  )
}