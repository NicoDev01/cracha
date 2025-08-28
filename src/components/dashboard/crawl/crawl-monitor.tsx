"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator" // May be used for layout separation
import { 
  Activity, 
  Globe, 
  FileText, 
  Zap, // May be used for performance indicators
  DollarSign, // May be used for cost tracking
  Clock, 
  StopCircle,
  CheckCircle,
  XCircle,
  AlertCircle,
  Loader2
} from "lucide-react"
import { useCrawlStore } from "@/stores/crawl-store"
import { cn } from "@/lib/utils"

export function CrawlMonitor() {
  const { currentJob, isRunning, progress, logs, cancelCrawl, clearLogs } = useCrawlStore()
  const [elapsedTime, setElapsedTime] = useState(0)

  // Timer for elapsed time
  useEffect(() => {
    let interval: NodeJS.Timeout
    
    if (isRunning && currentJob) {
      interval = setInterval(() => {
        const startTime = new Date(currentJob.created_at).getTime()
        const now = Date.now()
        setElapsedTime(Math.floor((now - startTime) / 1000))
      }, 1000)
    } else {
      setElapsedTime(0)
    }

    return () => {
      if (interval) clearInterval(interval)
    }
  }, [isRunning, currentJob])

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="w-4 h-4 text-yellow-500" />
      case 'running':
        return <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-500" />
      case 'failed':
        return <XCircle className="w-4 h-4 text-red-500" />
      default:
        return <AlertCircle className="w-4 h-4 text-gray-500" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'running':
        return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'completed':
        return 'bg-green-100 text-green-800 border-green-200'
      case 'failed':
        return 'bg-red-100 text-red-800 border-red-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  if (!currentJob) {
    return (
      <div className="max-w-4xl mx-auto flex flex-col items-center justify-center h-64 text-center">
        <Activity className="w-12 h-12 text-gray-300 mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">Kein aktiver Crawl-Job</h3>
        <p className="text-gray-500">
          Starte einen neuen Crawl-Job in der Konfiguration, um den Fortschritt hier zu verfolgen.
        </p>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Job Status Header */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {getStatusIcon(currentJob.status)}
              <div>
                <CardTitle className="text-lg">{currentJob.tenant_id}</CardTitle>
                <CardDescription className="flex items-center gap-2">
                  <Globe className="w-3 h-3" />
                  {currentJob.url}
                </CardDescription>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge className={cn("border", getStatusColor(currentJob.status))}>
                {currentJob.status.toUpperCase()}
              </Badge>
              {isRunning && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={cancelCrawl}
                  className="text-red-600 hover:text-red-700"
                >
                  <StopCircle className="w-4 h-4 mr-1" />
                  Abbrechen
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Fortschritt</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>

          {/* Statistics Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-3 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">
                {currentJob.progress?.pages_crawled || 0}
              </div>
              <div className="text-xs text-blue-600 font-medium">Seiten gecrawlt</div>
            </div>
            
            <div className="text-center p-3 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">
                {currentJob.progress?.chunks_created || 0}
              </div>
              <div className="text-xs text-green-600 font-medium">Chunks erstellt</div>
            </div>
            
            <div className="text-center p-3 bg-purple-50 rounded-lg">
              <div className="text-2xl font-bold text-purple-600">
                {formatTime(elapsedTime)}
              </div>
              <div className="text-xs text-purple-600 font-medium">Verstrichene Zeit</div>
            </div>
            
            <div className="text-center p-3 bg-orange-50 rounded-lg">
              <div className="text-2xl font-bold text-orange-600">
                ${(currentJob.progress?.estimated_cost || 0).toFixed(4)}
              </div>
              <div className="text-xs text-orange-600 font-medium">Geschätzte Kosten</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Live Logs */}
      <Card className="flex-1">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Live Logs
            </CardTitle>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={clearLogs}
              disabled={logs.length === 0}
            >
              Logs löschen
            </Button>
          </div>
        </CardHeader>
        
        <CardContent>
          <ScrollArea className="h-64 w-full rounded-md border p-4">
            {logs.length === 0 ? (
              <div className="flex items-center justify-center h-full text-gray-500">
                <div className="text-center">
                  <FileText className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                  <p>Keine Logs verfügbar</p>
                </div>
              </div>
            ) : (
              <div className="space-y-1">
                {logs.map((log, index) => (
                  <div key={index} className="flex items-start gap-2 text-sm">
                    <span className="text-gray-400 font-mono text-xs mt-0.5 flex-shrink-0">
                      {new Date().toLocaleTimeString()}
                    </span>
                    <span className="font-mono text-xs leading-relaxed break-all">
                      {log}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Job Details */}
      {currentJob.status === 'completed' && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-500" />
              Crawl abgeschlossen
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div>
                <span className="font-medium">Gestartet:</span>
                <div className="text-gray-600">
                  {new Date(currentJob.created_at).toLocaleString()}
                </div>
              </div>
              {currentJob.completed_at && (
                <div>
                  <span className="font-medium">Abgeschlossen:</span>
                  <div className="text-gray-600">
                    {new Date(currentJob.completed_at).toLocaleString()}
                  </div>
                </div>
              )}
              <div>
                <span className="font-medium">Typ:</span>
                <div className="text-gray-600 capitalize">{currentJob.type}</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Error Details */}
      {currentJob.status === 'failed' && currentJob.error && (
        <Card className="border-red-200">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2 text-red-600">
              <XCircle className="w-5 h-5" />
              Crawl fehlgeschlagen
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-red-50 border border-red-200 rounded-md p-3">
              <pre className="text-sm text-red-800 whitespace-pre-wrap font-mono">
                {currentJob.error}
              </pre>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}