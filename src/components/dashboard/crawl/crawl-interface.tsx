"use client"

import { useState } from "react"
import { CrawlConfigForm } from "./crawl-config-form"
import { CrawlMonitor } from "./crawl-monitor"
import { CrawlJobsList } from "./crawl-jobs-list"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Settings, List, Activity } from "lucide-react"

export function CrawlInterface() {
  const [activeTab, setActiveTab] = useState("config")

  return (
    <div className="h-full">
      <div className="mx-auto w-full max-w-[630px] text-center mb-8">
        <h3 className="mb-4 font-semibold text-gray-800 text-theme-xl dark:text-white/90 sm:text-2xl">
          Website Crawling
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 sm:text-base">
          Crawle Websites und erstelle intelligente, durchsuchbare Wissensspeicher für RAG-basierte Abfragen
        </p>
      </div>

      <div className="max-w-6xl mx-auto">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
          <TabsList className="grid w-full grid-cols-3 mb-6 rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
            <TabsTrigger value="config" className="flex items-center gap-2 rounded-xl">
              <Settings className="w-4 h-4" />
              Konfiguration
            </TabsTrigger>
            <TabsTrigger value="monitor" className="flex items-center gap-2 rounded-xl">
              <Activity className="w-4 h-4" />
              Live Monitor
            </TabsTrigger>
            <TabsTrigger value="jobs" className="flex items-center gap-2 rounded-xl">
              <List className="w-4 h-4" />
              Crawl Jobs
            </TabsTrigger>
          </TabsList>

          <div className="flex-1 overflow-hidden">
            <TabsContent value="config" className="h-full mt-0">
              <div className="rounded-2xl border border-gray-200 bg-white px-5 py-7 dark:border-gray-800 dark:bg-white/[0.03] xl:px-10 xl:py-12">
                <div className="mb-6">
                  <h4 className="mb-2 font-semibold text-gray-800 text-lg dark:text-white/90">
                    Crawl Konfiguration
                  </h4>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Konfiguriere deine Website-Crawling Parameter
                  </p>
                </div>
                <div className="overflow-auto">
                  <CrawlConfigForm />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="monitor" className="h-full mt-0">
              <div className="rounded-2xl border border-gray-200 bg-white px-5 py-7 dark:border-gray-800 dark:bg-white/[0.03] xl:px-10 xl:py-12">
                <div className="mb-6">
                  <h4 className="mb-2 font-semibold text-gray-800 text-lg dark:text-white/90">
                    Live Crawl Monitor
                  </h4>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Verfolge den Fortschritt deines aktuellen Crawl-Jobs
                  </p>
                </div>
                <div className="overflow-auto">
                  <CrawlMonitor />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="jobs" className="h-full mt-0">
              <div className="rounded-2xl border border-gray-200 bg-white px-5 py-7 dark:border-gray-800 dark:bg-white/[0.03] xl:px-10 xl:py-12">
                <div className="mb-6">
                  <h4 className="mb-2 font-semibold text-gray-800 text-lg dark:text-white/90">
                    Crawl Jobs Historie
                  </h4>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Übersicht aller vergangenen und aktuellen Crawl-Jobs
                  </p>
                </div>
                <div className="overflow-auto">
                  <CrawlJobsList />
                </div>
              </div>
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </div>
  )
}