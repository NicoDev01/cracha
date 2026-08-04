"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { ChevronDown, ChevronUp, Globe, Play, Settings } from "lucide-react"
import { useState } from "react"
import { useForm } from "react-hook-form"
import { toast } from "sonner"
import { z } from "zod"

import { Button } from "@/components/ui/button"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Slider } from "@/components/ui/slider"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { useAuthStore } from "@/stores/auth-store"
import { useCrawlStore } from "@/stores/crawl-store"

const crawlConfigSchema = z.object({
  url: z.string().url("Bitte gib eine gültige URL ein").refine(
    (value) => ["http:", "https:"].includes(new URL(value).protocol),
    "Nur HTTP- und HTTPS-URLs sind erlaubt",
  ),
  tenant_id: z.string()
    .min(1, "Name der Wissensbasis ist erforderlich")
    .max(80, "Maximal 80 Zeichen")
    .regex(/^[a-zA-Z0-9_-]+$/, "Nur Buchstaben, Zahlen, _ und - erlaubt"),
  type: z.enum(["single", "recursive", "sitemap"]),
  max_depth: z.number().int().min(1).max(5),
  limit: z.number().int().min(1).max(500),
  include_patterns: z.string().optional(),
  exclude_domains: z.string().optional(),
  respect_robots_txt: z.boolean(),
})

type CrawlFormValues = z.infer<typeof crawlConfigSchema>

export function CrawlConfigForm() {
  const [showAdvanced, setShowAdvanced] = useState(false)
  const { startCrawl, isRunning } = useCrawlStore()
  const { user } = useAuthStore()

  const form = useForm<CrawlFormValues>({
    resolver: zodResolver(crawlConfigSchema),
    defaultValues: {
      url: "",
      tenant_id: "",
      type: "recursive",
      max_depth: 2,
      limit: 100,
      include_patterns: "",
      exclude_domains: "",
      respect_robots_txt: true,
    },
  })

  const crawlType = form.watch("type")

  const onSubmit = async (values: CrawlFormValues) => {
    if (!user?.id) {
      toast.error("Bitte melde dich an, um einen Crawl zu starten.")
      return
    }

    try {
      await startCrawl({ ...values, user_id: user.id })
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Crawl konnte nicht gestartet werden.")
    }
  }

  return (
    <div className="mx-auto max-w-4xl">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Globe className="h-5 w-5 text-blue-600" />
              <h2 className="text-lg font-semibold">Website erfassen</h2>
            </div>

            <FormField
              control={form.control}
              name="url"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Start-URL</FormLabel>
                  <FormControl>
                    <Input placeholder="https://docs.example.com" autoComplete="url" {...field} />
                  </FormControl>
                  <FormDescription>Die Domain wird serverseitig auf öffentliche HTTP(S)-Ziele geprüft.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <FormField
                control={form.control}
                name="tenant_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name der Wissensbasis</FormLabel>
                    <FormControl>
                      <Input placeholder="laravel-docs" autoComplete="off" {...field} />
                    </FormControl>
                    <FormDescription>Eindeutiger Bezeichner für Suche und Chat.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Crawl-Modus</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="recursive">Rekursiv (empfohlen)</SelectItem>
                        <SelectItem value="single">Nur diese Seite</SelectItem>
                        <SelectItem value="sitemap">Sitemap-URL</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {crawlType === "recursive" && (
              <div className="grid grid-cols-1 gap-6 rounded-lg border p-4 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="max_depth"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Maximale Tiefe: {field.value}</FormLabel>
                      <FormControl>
                        <Slider min={1} max={5} step={1} value={[field.value]} onValueChange={(value) => field.onChange(value[0])} />
                      </FormControl>
                      <FormDescription>Anzahl der Link-Ebenen ab der Startseite.</FormDescription>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="limit"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Maximale Seiten: {field.value}</FormLabel>
                      <FormControl>
                        <Slider min={10} max={500} step={10} value={[field.value]} onValueChange={(value) => field.onChange(value[0])} />
                      </FormControl>
                      <FormDescription>Harte Obergrenze pro Crawl.</FormDescription>
                    </FormItem>
                  )}
                />
              </div>
            )}
          </div>

          <Collapsible open={showAdvanced} onOpenChange={setShowAdvanced}>
            <CollapsibleTrigger asChild>
              <Button type="button" variant="ghost" className="gap-2 px-0">
                <Settings className="h-4 w-4" />
                URL-Filter und Crawling-Regeln
                {showAdvanced ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-4 pt-4">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="include_patterns"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Einschließen</FormLabel>
                      <FormControl>
                        <Textarea placeholder={"*docs*\n*guide*"} className="font-mono text-sm" {...field} />
                      </FormControl>
                      <FormDescription>Optionale URL-Glob-Muster, eines pro Zeile.</FormDescription>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="exclude_domains"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Domains ausschließen</FormLabel>
                      <FormControl>
                        <Textarea placeholder={"ads.example.com\ntracking.example.com"} className="font-mono text-sm" {...field} />
                      </FormControl>
                      <FormDescription>Optionale Domains, eine pro Zeile.</FormDescription>
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="respect_robots_txt"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between rounded-lg border p-4">
                    <div>
                      <FormLabel>robots.txt beachten</FormLabel>
                      <FormDescription>Standardmäßig aktiviert und für reguläre Crawls empfohlen.</FormDescription>
                    </div>
                    <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                  </FormItem>
                )}
              />
            </CollapsibleContent>
          </Collapsible>

          <div className="flex justify-end">
            <Button type="submit" disabled={isRunning} className="gap-2 bg-blue-600 hover:bg-blue-700">
              <Play className="h-4 w-4" />
              {isRunning ? "Crawl läuft …" : "Crawl starten"}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  )
}
