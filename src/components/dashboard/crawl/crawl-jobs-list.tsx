"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table"
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { 
  Globe, 
  Calendar, // May be used for date filtering in the future
  Clock, 
  MoreHorizontal, 
  Eye, 
  Trash2, 
  RefreshCw,
  Search,
  Filter, // May be used for additional filtering in the future
  CheckCircle,
  XCircle,
  Loader2,
  AlertCircle
} from "lucide-react"
import { useCrawlStore } from "@/stores/crawl-store"
import { cn } from "@/lib/utils"

interface CrawlJob {
  id: string
  tenant_id: string
  status: 'pending' | 'running' | 'completed' | 'failed'
  url: string
  type: 'single' | 'recursive' | 'sitemap' | 'batch'
  progress?: {
    pages_crawled: number
    chunks_created: number
    estimated_cost: number
  }
  created_at: string
  completed_at?: string
  error?: string
}

export function CrawlJobsList() {
  const { jobs, loadJobs, deleteJob } = useCrawlStore()
  const [filteredJobs, setFilteredJobs] = useState<CrawlJob[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [typeFilter, setTypeFilter] = useState<string>("all")

  // Load jobs on component mount
  useEffect(() => {
    loadJobs()
  }, [loadJobs])

  // Filter jobs based on search and filters
  useEffect(() => {
    let filtered = jobs

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(job => 
        job.tenant_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        job.url.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    // Status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter(job => job.status === statusFilter)
    }

    // Type filter
    if (typeFilter !== "all") {
      filtered = filtered.filter(job => job.type === typeFilter)
    }

    // Sort by creation date (newest first)
    filtered.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

    setFilteredJobs(filtered)
  }, [jobs, searchTerm, statusFilter, typeFilter])

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

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'single':
        return 'bg-blue-100 text-blue-800'
      case 'recursive':
        return 'bg-purple-100 text-purple-800'
      case 'sitemap':
        return 'bg-green-100 text-green-800'
      case 'batch':
        return 'bg-orange-100 text-orange-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const formatDuration = (startTime: string, endTime?: string) => {
    const start = new Date(startTime).getTime()
    const end = endTime ? new Date(endTime).getTime() : Date.now()
    const duration = Math.floor((end - start) / 1000)
    
    if (duration < 60) return `${duration}s`
    if (duration < 3600) return `${Math.floor(duration / 60)}m ${duration % 60}s`
    return `${Math.floor(duration / 3600)}h ${Math.floor((duration % 3600) / 60)}m`
  }

  const handleDeleteJob = async (jobId: string) => {
    if (confirm("Möchtest du diesen Crawl-Job wirklich löschen?")) {
      await deleteJob(jobId)
    }
  }

  return (
    <div className="max-w-6xl mx-auto space-y-4">
      {/* Filters */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Filter & Suche</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Nach Database Name oder URL suchen..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Status Filter" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Alle Status</SelectItem>
                <SelectItem value="pending">Wartend</SelectItem>
                <SelectItem value="running">Läuft</SelectItem>
                <SelectItem value="completed">Abgeschlossen</SelectItem>
                <SelectItem value="failed">Fehlgeschlagen</SelectItem>
              </SelectContent>
            </Select>

            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Typ Filter" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Alle Typen</SelectItem>
                <SelectItem value="single">Single</SelectItem>
                <SelectItem value="recursive">Recursive</SelectItem>
                <SelectItem value="sitemap">Sitemap</SelectItem>
                <SelectItem value="batch">Batch</SelectItem>
              </SelectContent>
            </Select>

            <Button variant="outline" onClick={loadJobs} className="flex items-center gap-2">
              <RefreshCw className="w-4 h-4" />
              Aktualisieren
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Jobs Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Crawl Jobs ({filteredJobs.length})</CardTitle>
          <CardDescription>
            Übersicht aller Crawl-Jobs mit Status und Fortschritt
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredJobs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Globe className="w-12 h-12 text-gray-300 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {jobs.length === 0 ? "Keine Crawl-Jobs" : "Keine Jobs gefunden"}
              </h3>
              <p className="text-gray-500">
                {jobs.length === 0 
                  ? "Starte deinen ersten Crawl-Job in der Konfiguration."
                  : "Versuche andere Suchbegriffe oder Filter."
                }
              </p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Database</TableHead>
                    <TableHead>URL</TableHead>
                    <TableHead>Typ</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Fortschritt</TableHead>
                    <TableHead>Dauer</TableHead>
                    <TableHead>Erstellt</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredJobs.map((job) => (
                    <TableRow key={job.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <Globe className="w-4 h-4 text-gray-400" />
                          <span className="font-mono text-sm">{job.tenant_id}</span>
                        </div>
                      </TableCell>
                      
                      <TableCell>
                        <div className="max-w-[200px] truncate text-sm text-gray-600">
                          {job.url}
                        </div>
                      </TableCell>
                      
                      <TableCell>
                        <Badge className={cn("text-xs", getTypeColor(job.type))}>
                          {job.type}
                        </Badge>
                      </TableCell>
                      
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getStatusIcon(job.status)}
                          <Badge className={cn("text-xs border", getStatusColor(job.status))}>
                            {job.status}
                          </Badge>
                        </div>
                      </TableCell>
                      
                      <TableCell>
                        {job.progress ? (
                          <div className="text-sm">
                            <div>{job.progress.pages_crawled} Seiten</div>
                            <div className="text-gray-500">{job.progress.chunks_created} Chunks</div>
                          </div>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </TableCell>
                      
                      <TableCell>
                        <div className="text-sm text-gray-600">
                          {formatDuration(job.created_at, job.completed_at)}
                        </div>
                      </TableCell>
                      
                      <TableCell>
                        <div className="text-sm text-gray-600">
                          {new Date(job.created_at).toLocaleDateString()}
                        </div>
                      </TableCell>
                      
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem className="flex items-center gap-2">
                              <Eye className="w-4 h-4" />
                              Details anzeigen
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              className="flex items-center gap-2 text-red-600"
                              onClick={() => handleDeleteJob(job.id)}
                            >
                              <Trash2 className="w-4 h-4" />
                              Löschen
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}