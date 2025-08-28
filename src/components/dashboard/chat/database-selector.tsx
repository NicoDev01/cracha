"use client"

import { useState, useEffect, useCallback } from "react"
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
import { Badge } from "@/components/ui/badge"
import { useHydratedChatStore } from "@/hooks/use-chat-store"
import { getDatabases } from "@/stores/chat-store"
import { useAuthStore } from "@/stores/auth-store"
import type { Database as DatabaseType } from "@/types/chat"

export function DatabaseSelector() {
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

  // Load databases only on component mount and when user changes
  useEffect(() => {
    loadDatabases()
  }, [loadDatabases])

  // Manual refresh function
  const handleRefresh = () => {
    loadDatabases(true)
  }

  const selectedDb = databases.find(db => db.id === selectedDatabase)

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    }).format(date)
  }

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('de-DE').format(num)
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          className="min-w-[160px] sm:min-w-[200px] justify-between bg-white/80 dark:bg-white/[0.03] dark:text-white/90 backdrop-blur-sm border-gray-200/50 dark:border-gray-800 hover:bg-white/90 dark:hover:bg-white/[0.06] hover:border-gray-300/50 dark:hover:border-gray-700 transition-all duration-200"
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
        align="start"
        className="w-[92vw] sm:w-80 max-h-[12rem] sm:max-h-[20rem] overflow-y-auto overscroll-contain bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl border-gray-200/50 dark:border-gray-800 shadow-xl"
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
            className="h-6 w-6 p-0 hover:bg-gray-100 dark:hover:bg-gray-800"
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
              className="mt-2 text-red-600 hover:text-red-700"
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
                      <span>{formatNumber(database.document_count)} Docs</span>
                    </div>

                    {database.last_crawl && (
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        <span>{formatDate(database.last_crawl)}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex flex-col items-end gap-1 ml-2">
                  <Badge
                    variant="secondary"
                    className="text-xs bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-700/50"
                  >
                    Aktiv
                  </Badge>
                </div>
              </div>
            </DropdownMenuItem>
          ))
        )}

        <DropdownMenuSeparator />
        <div className="p-2">
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start text-blue-600 hover:text-blue-700 hover:bg-blue-50"
            onClick={() => window.location.href = '/dashboard/crawl'}
          >
            <Database className="w-4 h-4 mr-2" />
            Neue Datenbank erstellen
          </Button>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}