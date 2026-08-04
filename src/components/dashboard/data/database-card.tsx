"use client"

import { useState } from "react"
import {
  Database,
  Calendar,
  ExternalLink,
  Trash2,
  RefreshCw,
  Eye,
  MoreVertical,
  AlertTriangle
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
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
import { toast } from "sonner"
import type { Database as DatabaseType } from "@/types/chat"

interface DatabaseCardProps {
  database: DatabaseType
  onDelete: () => void
  onUpdate: () => void
  onViewDetails: () => void
}

export function DatabaseCard({ database, onDelete, onUpdate, onViewDetails }: DatabaseCardProps) {
  const [isDeleting, setIsDeleting] = useState(false)
  const [isRecrawling, setIsRecrawling] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)

  const formatDate = (date: Date | string | undefined) => {
    if (!date) return 'Nie'
    
    // Handle both Date objects and ISO strings
    const dateObj = typeof date === 'string' ? new Date(date) : date
    
    // Check if the date is valid
    if (isNaN(dateObj.getTime())) {
      console.warn('Invalid date provided to formatDate:', date)
      return 'Ungültiges Datum'
    }
    
    return new Intl.DateTimeFormat('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(dateObj)
  }

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('de-DE').format(num)
  }

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-700/50'
      case 'crawling': return 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-700/50'
      case 'error':
      case 'failed': return 'bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-700/50'
      case 'inactive': return 'bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-800/50 dark:text-gray-400 dark:border-gray-700/50'
      default: return 'bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-800/50 dark:text-gray-400 dark:border-gray-700/50'
    }
  }

  const getStatusText = (status?: string) => {
    switch (status) {
      case 'active': return 'Aktiv'
      case 'crawling': return 'Crawling'
      case 'error':
      case 'failed': return 'Fehler'
      case 'inactive': return 'Inaktiv'
      default: return 'Unbekannt'
    }
  }

  const handleDelete = async () => {
    setIsDeleting(true)
    try {
      const response = await fetch(`/api/databases/${database.id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('Fehler beim Löschen der Datenbank')
      }

      toast.success(`Datenbank "${database.name}" wurde erfolgreich gelöscht`)
      onDelete()
    } catch (error) {
      console.error('Delete error:', error)
      toast.error(error instanceof Error ? error.message : 'Fehler beim Löschen der Datenbank')
    } finally {
      setIsDeleting(false)
      setShowDeleteDialog(false)
    }
  }

  const handleRecrawl = async () => {
    setIsRecrawling(true)
    try {
      // TODO: Implement actual re-crawl API call
      const response = await fetch(`/api/admin/databases/${database.id}/recrawl`, {
        method: 'POST',
      })

      if (!response.ok) {
        throw new Error('Fehler beim Starten des Re-Crawls')
      }

      toast.success(`Re-Crawl für "${database.name}" wurde gestartet`)
      onUpdate()
    } catch (error) {
      console.error('Re-crawl error:', error)
      toast.error(error instanceof Error ? error.message : 'Fehler beim Starten des Re-Crawls')
    } finally {
      setIsRecrawling(false)
    }
  }

  const isRecentlyUpdated = database.last_crawl && (() => {
    const lastCrawlDate = typeof database.last_crawl === 'string' 
      ? new Date(database.last_crawl) 
      : database.last_crawl
    
    return !isNaN(lastCrawlDate.getTime()) && 
           lastCrawlDate.getTime() > Date.now() - 24 * 60 * 60 * 1000
  })()

  return (
    <>
      <div className="bg-white rounded-xl border border-gray-200 hover:border-gray-300 hover:shadow-md transition-all duration-200 overflow-hidden shadow-sm dark:bg-white/[0.03] dark:border-gray-800 dark:hover:border-gray-700 dark:hover:shadow-lg">
        {/* Header */}
        <div className="p-6">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <div className="flex-shrink-0 w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                <Database className="w-5 h-5 text-blue-600" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-gray-900 dark:text-white/90 truncate">
                  {database.name}
                </h3>
                <Badge
                  variant="secondary"
                  className={`text-xs mt-1 ${getStatusColor(database.status)}`}
                >
                  {getStatusText(database.status)}
                  {isRecentlyUpdated && (
                    <span className="ml-1">•</span>
                  )}
                </Badge>
              </div>
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                  <MoreVertical className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={onViewDetails}>
                  <Eye className="w-4 h-4 mr-2" />
                  Details anzeigen
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={handleRecrawl}
                  disabled={isRecrawling || database.status === 'crawling'}
                >
                  <RefreshCw className={`w-4 h-4 mr-2 ${isRecrawling ? 'animate-spin' : ''}`} />
                  Re-Crawl starten
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => setShowDeleteDialog(true)}
                  className="text-red-600 focus:text-red-600"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Löschen
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {database.description && (
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 line-clamp-2">
              {database.description}
            </p>
          )}

          {/* Stats */}
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="text-center">
              <div className="text-lg font-semibold text-gray-900 dark:text-white/90">
                {formatNumber(database.document_count || 0)}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">Dokumente</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-semibold text-gray-900 dark:text-white/90">
                {database.last_crawl ? formatDate(database.last_crawl).split(' ')[0] : 'Nie'}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">Letzter Crawl</div>
            </div>
          </div>

          {/* Source URL */}
          {database.source_url && (
            <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 mb-4">
              <ExternalLink className="w-3 h-3 flex-shrink-0" />
              <span className="truncate">{database.source_url}</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-gray-50/50 border-t border-gray-100 dark:bg-gray-800/50 dark:border-gray-700">
          <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
            <div className="flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              <span>Erstellt {formatDate(database.created_at).split(' ')[0]}</span>
            </div>

            {isRecentlyUpdated && (
              <Badge variant="secondary" className="bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-700/50">
                Neu
              </Badge>
            )}
          </div>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-600" />
              Datenbank löschen
            </AlertDialogTitle>
            <AlertDialogDescription>
              Möchtest du die Datenbank <strong>&ldquo;{database.name}&rdquo;</strong> wirklich löschen?
              <br /><br />
              <strong>Diese Aktion kann nicht rückgängig gemacht werden.</strong> Alle Daten,
              einschließlich Dokumente, Chunks und Vectorize-Einträge werden permanent gelöscht.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {isDeleting ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Lösche...
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4 mr-2" />
                  Löschen
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
