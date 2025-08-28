"use client"

import { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"
import {
  Database,
  Calendar,
  FileText,
  ExternalLink,
  Trash2,
  RefreshCw,
  Globe,
  Clock,
  Hash,
  Link,
  AlertTriangle,
  CheckCircle,
  XCircle
} from "lucide-react"
import { toast } from "sonner"
import type { Database as DatabaseType } from "@/types/chat"

interface DatabaseDetailsModalProps {
  database: DatabaseType
  isOpen: boolean
  onClose: () => void
  onUpdate: () => void
  onDelete: () => void
}

interface DatabaseDetails {
  id: string
  name: string
  description?: string
  status: string
  document_count: number
  chunk_count?: number
  vector_count?: number
  created_at: string
  updated_at: string
  last_crawl?: string
  source_url?: string
  crawl_config?: {
    type: string
    max_depth?: number
    limit?: number
    embedding_model: string
    include_patterns?: string[]
    exclude_patterns?: string[]
  }
  urls?: string[]
  recent_activity?: Array<{
    timestamp: string
    action: string
    details: string
    status: 'success' | 'error' | 'info'
  }>
}

export function DatabaseDetailsModal({ 
  database, 
  isOpen, 
  onClose, 
  onUpdate, 
  onDelete 
}: DatabaseDetailsModalProps) {
  const [details, setDetails] = useState<DatabaseDetails | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isRecrawling, setIsRecrawling] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const formatDate = (dateString: string | Date | undefined) => {
    if (!dateString) return 'Nie'
    const date = typeof dateString === 'string' ? new Date(dateString) : dateString
    return new Intl.DateTimeFormat('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date)
  }

  const formatNumber = (num: number | undefined) => {
    if (num === undefined) return '0'
    return new Intl.NumberFormat('de-DE').format(num)
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-700 border-green-200'
      case 'crawling': return 'bg-blue-100 text-blue-700 border-blue-200'
      case 'error': return 'bg-red-100 text-red-700 border-red-200'
      case 'inactive': return 'bg-gray-100 text-gray-700 border-gray-200'
      default: return 'bg-gray-100 text-gray-700 border-gray-200'
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'active': return 'Aktiv'
      case 'crawling': return 'Crawling läuft'
      case 'error': return 'Fehler'
      case 'inactive': return 'Inaktiv'
      default: return 'Unbekannt'
    }
  }

  const loadDatabaseDetails = async () => {
    setIsLoading(true)
    try {
      // TODO: Implement actual API call to get detailed database info
      const response = await fetch(`/api/admin/databases/${database.id}/details`)
      
      if (!response.ok) {
        throw new Error('Fehler beim Laden der Datenbankdetails')
      }

      const data = await response.json() as DatabaseDetails
      setDetails(data)
    } catch (error) {
      console.error('Failed to load database details:', error)
      // Fallback to basic database info
      setDetails({
        id: database.id,
        name: database.name,
        description: database.description,
        status: database.status || 'active',
        document_count: database.document_count || 0,
        created_at: database.created_at.toISOString(),
        updated_at: database.updated_at.toISOString(),
        last_crawl: database.last_crawl?.toISOString(),
        source_url: database.source_url,
        crawl_config: {
          type: 'single',
          embedding_model: 'gemini-768'
        },
        urls: database.source_url ? [database.source_url] : [],
        recent_activity: [
          {
            timestamp: database.created_at.toISOString(),
            action: 'Datenbank erstellt',
            details: 'Datenbank wurde erfolgreich erstellt',
            status: 'success'
          }
        ]
      })
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (isOpen) {
      loadDatabaseDetails()
    }
  }, [isOpen, database.id])

  const handleRecrawl = async () => {
    setIsRecrawling(true)
    try {
      const response = await fetch(`/api/admin/databases/${database.id}/recrawl`, {
        method: 'POST',
      })

      if (!response.ok) {
        throw new Error('Fehler beim Starten des Re-Crawls')
      }

      toast.success(`Re-Crawl für "${database.name}" wurde gestartet`)
      onUpdate()
      loadDatabaseDetails() // Reload details
    } catch (error) {
      console.error('Re-crawl error:', error)
      toast.error(error instanceof Error ? error.message : 'Fehler beim Starten des Re-Crawls')
    } finally {
      setIsRecrawling(false)
    }
  }

  const handleDelete = async () => {
    setIsDeleting(true)
    try {
      const response = await fetch(`/api/admin/databases/${database.id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('Fehler beim Löschen der Datenbank')
      }

      toast.success(`Datenbank "${database.name}" wurde erfolgreich gelöscht`)
      onDelete()
      onClose()
    } catch (error) {
      console.error('Delete error:', error)
      toast.error(error instanceof Error ? error.message : 'Fehler beim Löschen der Datenbank')
    } finally {
      setIsDeleting(false)
    }
  }

  if (!details && !isLoading) return null

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <Database className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <div className="text-xl font-semibold">{database.name}</div>
              {details && (
                <Badge 
                  variant="secondary" 
                  className={`text-xs mt-1 ${getStatusColor(details.status)}`}
                >
                  {getStatusText(details.status)}
                </Badge>
              )}
            </div>
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <RefreshCw className="w-6 h-6 animate-spin text-gray-400" />
            <span className="ml-2 text-gray-600">Lade Details...</span>
          </div>
        ) : details ? (
          <Tabs defaultValue="overview" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="overview">Übersicht</TabsTrigger>
              <TabsTrigger value="content">Inhalte</TabsTrigger>
              <TabsTrigger value="config">Konfiguration</TabsTrigger>
              <TabsTrigger value="activity">Aktivität</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-6">
              {/* Key Metrics */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-gray-50 rounded-lg p-4 text-center">
                  <FileText className="w-6 h-6 text-gray-600 mx-auto mb-2" />
                  <div className="text-2xl font-bold text-gray-900">
                    {formatNumber(details.document_count)}
                  </div>
                  <div className="text-sm text-gray-600">Dokumente</div>
                </div>
                
                <div className="bg-gray-50 rounded-lg p-4 text-center">
                  <Hash className="w-6 h-6 text-gray-600 mx-auto mb-2" />
                  <div className="text-2xl font-bold text-gray-900">
                    {formatNumber(details.chunk_count || 0)}
                  </div>
                  <div className="text-sm text-gray-600">Chunks</div>
                </div>
                
                <div className="bg-gray-50 rounded-lg p-4 text-center">
                  <Database className="w-6 h-6 text-gray-600 mx-auto mb-2" />
                  <div className="text-2xl font-bold text-gray-900">
                    {formatNumber(details.vector_count || 0)}
                  </div>
                  <div className="text-sm text-gray-600">Vektoren</div>
                </div>
                
                <div className="bg-gray-50 rounded-lg p-4 text-center">
                  <Clock className="w-6 h-6 text-gray-600 mx-auto mb-2" />
                  <div className="text-2xl font-bold text-gray-900">
                    {details.last_crawl ? 
                      Math.floor((Date.now() - new Date(details.last_crawl).getTime()) / (1000 * 60 * 60 * 24))
                      : '∞'
                    }
                  </div>
                  <div className="text-sm text-gray-600">Tage alt</div>
                </div>
              </div>

              {/* Basic Info */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Grundinformationen</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700">Erstellt</label>
                    <div className="flex items-center gap-2 mt-1">
                      <Calendar className="w-4 h-4 text-gray-400" />
                      <span className="text-sm text-gray-900">
                        {formatDate(details.created_at)}
                      </span>
                    </div>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium text-gray-700">Letztes Update</label>
                    <div className="flex items-center gap-2 mt-1">
                      <RefreshCw className="w-4 h-4 text-gray-400" />
                      <span className="text-sm text-gray-900">
                        {formatDate(details.updated_at)}
                      </span>
                    </div>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium text-gray-700">Letzter Crawl</label>
                    <div className="flex items-center gap-2 mt-1">
                      <Globe className="w-4 h-4 text-gray-400" />
                      <span className="text-sm text-gray-900">
                        {formatDate(details.last_crawl)}
                      </span>
                    </div>
                  </div>
                  
                  {details.source_url && (
                    <div>
                      <label className="text-sm font-medium text-gray-700">Quell-URL</label>
                      <div className="flex items-center gap-2 mt-1">
                        <ExternalLink className="w-4 h-4 text-gray-400" />
                        <a 
                          href={details.source_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-blue-600 hover:text-blue-700 truncate"
                        >
                          {details.source_url}
                        </a>
                      </div>
                    </div>
                  )}
                </div>

                {details.description && (
                  <div>
                    <label className="text-sm font-medium text-gray-700">Beschreibung</label>
                    <p className="text-sm text-gray-900 mt-1">{details.description}</p>
                  </div>
                )}
              </div>

              {/* Actions */}
              <Separator />
              <div className="flex gap-3">
                <Button
                  onClick={handleRecrawl}
                  disabled={isRecrawling || details.status === 'crawling'}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {isRecrawling ? (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      Re-Crawl läuft...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Re-Crawl starten
                    </>
                  )}
                </Button>
                
                <Button
                  variant="destructive"
                  onClick={handleDelete}
                  disabled={isDeleting}
                >
                  {isDeleting ? (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      Lösche...
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-4 h-4 mr-2" />
                      Datenbank löschen
                    </>
                  )}
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="content" className="space-y-4">
              <h3 className="text-lg font-semibold">Enthaltene URLs</h3>
              
              {details.urls && details.urls.length > 0 ? (
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {details.urls.map((url, index) => (
                    <div key={index} className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
                      <Link className="w-4 h-4 text-gray-400 flex-shrink-0" />
                      <a 
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-blue-600 hover:text-blue-700 truncate flex-1"
                      >
                        {url}
                      </a>
                      <ExternalLink className="w-3 h-3 text-gray-400 flex-shrink-0" />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <Globe className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <p>Keine URLs verfügbar</p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="config" className="space-y-4">
              <h3 className="text-lg font-semibold">Crawl-Konfiguration</h3>
              
              {details.crawl_config ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700">Crawl-Typ</label>
                    <p className="text-sm text-gray-900 mt-1 capitalize">
                      {details.crawl_config.type}
                    </p>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium text-gray-700">Embedding-Model</label>
                    <p className="text-sm text-gray-900 mt-1">
                      {details.crawl_config.embedding_model}
                    </p>
                  </div>
                  
                  {details.crawl_config.max_depth && (
                    <div>
                      <label className="text-sm font-medium text-gray-700">Max. Tiefe</label>
                      <p className="text-sm text-gray-900 mt-1">
                        {details.crawl_config.max_depth}
                      </p>
                    </div>
                  )}
                  
                  {details.crawl_config.limit && (
                    <div>
                      <label className="text-sm font-medium text-gray-700">Limit</label>
                      <p className="text-sm text-gray-900 mt-1">
                        {details.crawl_config.limit} Seiten
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <Database className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <p>Keine Konfiguration verfügbar</p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="activity" className="space-y-4">
              <h3 className="text-lg font-semibold">Letzte Aktivitäten</h3>
              
              {details.recent_activity && details.recent_activity.length > 0 ? (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {details.recent_activity.map((activity, index) => (
                    <div key={index} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                      <div className="flex-shrink-0 mt-0.5">
                        {activity.status === 'success' && (
                          <CheckCircle className="w-4 h-4 text-green-600" />
                        )}
                        {activity.status === 'error' && (
                          <XCircle className="w-4 h-4 text-red-600" />
                        )}
                        {activity.status === 'info' && (
                          <Clock className="w-4 h-4 text-blue-600" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-gray-900">
                          {activity.action}
                        </div>
                        <div className="text-sm text-gray-600 mt-1">
                          {activity.details}
                        </div>
                        <div className="text-xs text-gray-400 mt-1">
                          {formatDate(activity.timestamp)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <Clock className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <p>Keine Aktivitäten verfügbar</p>
                </div>
              )}
            </TabsContent>
          </Tabs>
        ) : null}
      </DialogContent>
    </Dialog>
  )
}