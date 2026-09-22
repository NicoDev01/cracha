"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Check, ChevronDown, Database, Calendar, FileText, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { StatusBadge } from "@/components/dashboard/common/StatusBadge"
import { useHydratedChatStore } from "@/hooks/use-chat-store"
import { databaseStatus, formatDate, formatNumber, pageCount } from "@/lib/databases"
import { getDatabases } from "@/stores/chat-store"
import { useAuthStore } from "@/stores/auth-store"
import type { Database as DatabaseType } from "@/types/chat"

export function DatabaseSelector() {
  const router = useRouter()
  const { selectedDatabase, selectDatabase } = useHydratedChatStore()
  const { user } = useAuthStore()
  const [databases, setDatabases] = useState<DatabaseType[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Load databases function
  const loadDatabases = useCallback(async (showRefreshIndicator = false) => {
    if (!user) {
      setDatabases([])
      setIsLoading(false)
      return
    }

    try {
      if (showRefreshIndicator) {
        setIsRefreshing(true)
      } else {
        setIsLoading(true)
      }
      setError(null)

      // 🔐 SECURITY: getDatabases now uses authentication from server
      const dbs = await getDatabases()
      setDatabases(dbs)
    } catch (error) {
      console.error('Failed to load databases:', error)
      const errorMessage = error instanceof Error ? error.message : 'Fehler beim Laden der Datenbanken'
      setError(errorMessage)
      setDatabases([])
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }, [user])

  // Load databases only on component mount and when user changes. Inline with
  // a cancelled flag rather than calling loadDatabases(): that helper flips
  // loading state synchronously, which inside an effect body is exactly the
  // cascading-render pattern React warns about.
  useEffect(() => {
    let cancelled = false
    void (async () => {
      if (!user) return
      try {
        const dbs = await getDatabases()
        if (!cancelled) {
          setError(null)
          setDatabases(dbs)
        }
      } catch (loadError) {
        if (!cancelled) {
          const errorMessage = loadError instanceof Error ? loadError.message : 'Fehler beim Laden der Datenbanken'
          setError(errorMessage)
          setDatabases([])
        }
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [user])

  // Manual refresh function
  const handleRefresh = () => {
    loadDatabases(true)
  }

  const selectedDb = databases.find(db => db.id === selectedDatabase)

  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          className="w-[10.5rem] justify-between rounded-full border-gray-200 bg-white/80 px-4 backdrop-blur-sm transition-all duration-200 hover:border-gray-300 hover:bg-white sm:w-[13rem] dark:border-gray-700 dark:bg-white/[0.03] dark:text-white/90 dark:hover:border-gray-600 dark:hover:bg-white/[0.06]"
        >
          <div className="flex items-center gap-2">
            <Database className="w-4 h-4 text-gray-500 dark:text-gray-400" />
            <span className="truncate">
              {selectedDb ? selectedDb.name : "Datenbank wählen"}
            </span>
          </div>
          <ChevronDown className="w-4 h-4 text-gray-500 dark:text-gray-400" />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        className="max-h-[12rem] w-[92vw] overflow-y-auto overscroll-contain border-gray-200/50 bg-white/95 shadow-xl backdrop-blur-xl sm:max-h-[20rem] sm:w-72 dark:border-gray-800 dark:bg-gray-900/95"
      >
        <DropdownMenuLabel className="flex items-center justify-between text-gray-700 dark:text-white/90">
          <div className="flex items-center gap-2">
            <Database className="w-4 h-4" />
            Verfügbare Datenbanken
            {(isLoading || isRefreshing) && (
              <div className="w-4 h-4 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin"></div>
            )}
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRefresh}
            disabled={isLoading || isRefreshing}
            aria-label="Datenbanken aktualisieren"
            className="size-6 rounded-full p-0 hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            <RefreshCw className={`w-3 h-3 ${isRefreshing ? 'animate-spin' : ''}`} />
          </Button>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />

        {error ? (
          <div className="p-4 text-center text-red-500">
            <div className="text-red-400 mb-2">⚠️</div>
            <p className="text-sm">{error}</p>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRefresh}
            className="mt-2 rounded-full text-red-600 hover:text-red-700"
          >
            <RefreshCw className="w-3 h-3 mr-1" />
            Erneut versuchen
          </Button>
          </div>
        ) : isLoading ? (
          <div className="p-4 text-center text-gray-500">
            <div className="w-6 h-6 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin mx-auto mb-2"></div>
            <p className="text-sm">Lade Datenbanken...</p>
          </div>
        ) : databases.length === 0 ? (
          <div className="p-4 text-center text-gray-500">
            <Database className="w-8 h-8 mx-auto mb-2 text-gray-300" />
            <p className="text-sm">Keine Datenbanken vorhanden</p>
            <p className="text-xs text-gray-400 mt-1">
              Klicke auf Crawl um eine Datenbank zu erstellen
            </p>
          </div>
        ) : (
          databases.map((database) => (
            <DropdownMenuItem
              key={database.id}
              onClick={() => selectDatabase(database.id)}
              disabled={databaseStatus(database) !== 'active'}
              className="p-3 cursor-pointer hover:bg-blue-50/50 focus:bg-blue-50/50 dark:hover:bg-blue-900/20 dark:focus:bg-blue-900/20 transition-colors"
            >
              <div className="flex items-start justify-between w-full">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-gray-900 dark:text-white/90 truncate">
                      {database.name}
                    </span>
                    {selectedDatabase === database.id && (
                      <Check className="w-4 h-4 text-blue-600 flex-shrink-0" />
                    )}
                  </div>

                  {database.description && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-2 line-clamp-2">
                      {database.description}
                    </p>
                  )}

                  <div className="flex items-center gap-3 text-xs text-gray-400 dark:text-gray-400">
                    <div className="flex items-center gap-1">
                      <FileText className="w-3 h-3" />
                      <span>{formatNumber(pageCount(database))} Seiten</span>
                    </div>

                    {database.last_crawl && (
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        <span>{formatDate(database.last_crawl)}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex flex-col items-end gap-1.5 ml-2">
                  <StatusBadge status={databaseStatus(database)} />
                  {(database.source_url || database.url || database.urls?.[0]) && (
                    <button
                      type="button"
                      title={`„${database.name}“ neu crawlen / aktualisieren`}
                      onClick={(e) => {
                        e.stopPropagation()
                        const targetUrl = database.source_url || database.url || database.urls?.[0] || ''
                        router.push(`/dashboard/crawl?url=${encodeURIComponent(targetUrl)}&name=${encodeURIComponent(database.name)}`)
                      }}
                      className="rounded p-1 text-gray-400 hover:bg-gray-200 hover:text-gray-700 dark:hover:bg-gray-700 dark:hover:text-gray-200 transition-colors"
                      aria-label={`„${database.name}“ aktualisieren`}
                    >
                      <RefreshCw className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>
            </DropdownMenuItem>
          ))
        )}

        <DropdownMenuSeparator />
        <div className="p-2 space-y-1">
          {selectedDb && (selectedDb.source_url || selectedDb.url || selectedDb.urls?.[0]) && (
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start rounded-full text-brand-600 hover:text-brand-700 hover:bg-brand-50 dark:text-brand-400 dark:hover:bg-brand-950/40"
              onClick={() => {
                const targetUrl = selectedDb.source_url || selectedDb.url || selectedDb.urls?.[0] || ''
                router.push(`/dashboard/crawl?url=${encodeURIComponent(targetUrl)}&name=${encodeURIComponent(selectedDb.name)}`)
              }}
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Aktive Datenbank aktualisieren
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start rounded-full text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-950/40"
            onClick={() => router.push('/dashboard/crawl')}
          >
            <Database className="w-4 h-4 mr-2" />
            Neue Datenbank erstellen
          </Button>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
