"use client"

import { Suspense, useEffect, useMemo, useState } from "react"
import { useSearchParams } from "next/navigation"
import { Activity, Globe, History, Plus } from "lucide-react"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useCrawlStore } from "@/stores/crawl-store"
import { CrawlConfigForm } from "./crawl-config-form"
import { CrawlJobsList } from "./crawl-jobs-list"
import { CrawlMonitor } from "./crawl-monitor"

function CrawlConfigWithParams({ onStarted }: { onStarted: () => void }) {
  const searchParams = useSearchParams()
  const initialUrl = searchParams.get("url") || ""
  const initialName = searchParams.get("name") || ""
  const rawType = searchParams.get("type")
  const initialType: 'single' | 'recursive' | 'sitemap' | undefined = rawType === "single" || rawType === "recursive" || rawType === "sitemap" ? rawType : undefined

  const initialValues = useMemo(() => ({
    url: initialUrl,
    name: initialName,
    ...(initialType ? { type: initialType } : {}),
  }), [initialUrl, initialName, initialType])

  return (
    <CrawlConfigForm
      onStarted={onStarted}
      initialValues={initialValues}
    />
  )
}

export function CrawlInterface() {
  const [activeTab, setActiveTab] = useState("new")
  const { isRunning, resumeCurrentCrawl } = useCrawlStore()

  useEffect(() => {
    resumeCurrentCrawl()
  }, [resumeCurrentCrawl])

  // Adjusted while rendering rather than in an effect. A crawl starting is a
  // change the tab has to follow, and an effect would render the old tab once
  // and then replace it -- deferring that by a microtask hides the second pass
  // from the linter without removing it. React re-runs this component before
  // anything reaches the screen instead.
  const [wasRunning, setWasRunning] = useState(isRunning)
  if (isRunning !== wasRunning) {
    setWasRunning(isRunning)
    if (isRunning) setActiveTab("status")
  }

  return (
    <section className="flex h-full min-h-0 flex-col" aria-label="Website einlesen">
      <header className="flex shrink-0 items-center justify-between gap-3 border-b border-gray-200 px-4 py-3 sm:px-5 dark:border-gray-800">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-brand-500 text-white shadow-theme-sm">
            <Globe className="size-5" />
          </div>
          <h1 className="truncate font-semibold text-gray-900 dark:text-white">Website einlesen</h1>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="h-9 rounded-xl bg-gray-100 p-1 dark:bg-gray-800">
            <TabsTrigger value="new" className="rounded-lg px-3" aria-label="Neue Website einlesen">
              <Plus className="size-4" />
              <span className="hidden sm:inline">Neu</span>
            </TabsTrigger>
            <TabsTrigger value="status" className="relative rounded-lg px-3" aria-label="Status">
              <Activity className="size-4" />
              <span className="hidden sm:inline">Status</span>
              {isRunning && <span className="absolute right-1 top-1 size-1.5 animate-pulse rounded-full bg-brand-500" />}
            </TabsTrigger>
            <TabsTrigger value="history" className="rounded-lg px-3" aria-label="Verlauf">
              <History className="size-4" />
              <span className="hidden sm:inline">Verlauf</span>
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto bg-gradient-to-b from-gray-25 to-white dark:from-gray-950 dark:to-gray-900">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="min-h-full">
          <TabsContent value="new" className="m-0">
            <div className="mx-auto w-full max-w-3xl p-4 sm:p-6 lg:p-8">
              <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-theme-xs sm:p-7 dark:border-gray-700 dark:bg-gray-900">
                <Suspense fallback={<div className="h-64 animate-pulse rounded-xl bg-gray-100 dark:bg-gray-800" />}>
                  <CrawlConfigWithParams onStarted={() => setActiveTab("status")} />
                </Suspense>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="status" className="m-0">
            <div className="mx-auto w-full max-w-3xl p-4 sm:p-6 lg:p-8">
              <CrawlMonitor />
            </div>
          </TabsContent>

          <TabsContent value="history" className="m-0">
            <div className="mx-auto w-full max-w-5xl p-4 sm:p-6 lg:p-8">
              <CrawlJobsList />
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </section>
  )
}
