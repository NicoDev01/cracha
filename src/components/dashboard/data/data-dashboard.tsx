"use client"

import { useState, useEffect, useCallback } from "react"
import { Plus, Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { DatabaseCard } from "./database-card"
import { DatabaseDetailsModal } from "./database-details-modal"
import { useAuthStore } from "@/stores/auth-store"
import { getDatabases } from "@/stores/chat-store"
import type { Database } from "@/types/chat"

export function DataDashboard() {
    const { user } = useAuthStore()
    const [databases, setDatabases] = useState<Database[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [searchQuery, setSearchQuery] = useState("")
    const [selectedDatabase, setSelectedDatabase] = useState<Database | null>(null)
    const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false)

    // Load databases
    const loadDatabases = useCallback(async () => {
        if (!user?.id) {
            setDatabases([])
            setIsLoading(false)
            return
        }

        try {
            setIsLoading(true)
            setError(null)
            const dbs = await getDatabases(user.id)
            setDatabases(dbs)
        } catch (error) {
            console.error('Failed to load databases:', error)
            const errorMessage = error instanceof Error ? error.message : 'Fehler beim Laden der Datenbanken'
            setError(errorMessage)
            setDatabases([])
        } finally {
            setIsLoading(false)
        }
    }, [user?.id])

    useEffect(() => {
        loadDatabases()
    }, [loadDatabases])

    // Filter databases based on search query
    const filteredDatabases = databases.filter(db =>
        db.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        db.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        db.source_url?.toLowerCase().includes(searchQuery.toLowerCase())
    )

    const handleDatabaseDeleted = () => {
        loadDatabases() // Reload databases after deletion
    }

    const handleDatabaseUpdated = () => {
        loadDatabases() // Reload databases after update
    }

    const openDatabaseDetails = (database: Database) => {
        setSelectedDatabase(database)
        setIsDetailsModalOpen(true)
    }

    return (
        <div className="space-y-10">
            {/* Header Actions */}
            <div className="flex flex-col lg:flex-row gap-6 justify-between items-start lg:items-center">
                <div className="flex-1 max-w-lg">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                        <Input
                            placeholder="Datenbanken durchsuchen..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-10 h-11 border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                        />
                    </div>
                </div>

                <div className="flex gap-3">
                    <Button
                        variant="outline"
                        onClick={loadDatabases}
                        disabled={isLoading}
                        className="h-11 px-6 border-gray-300 hover:border-gray-400"
                    >
                        {isLoading ? "Lädt..." : "Aktualisieren"}
                    </Button>

                    <Button
                        onClick={() => window.location.href = '/dashboard/crawl'}
                        className="h-11 px-6 bg-blue-600 hover:bg-blue-700 shadow-sm"
                    >
                        <Plus className="w-4 h-4 mr-2" />
                        Neue Datenbank
                    </Button>
                </div>
            </div>

            {/* Stats entfernt */}

            {/* Error State */}
            {error && (
                <div className="bg-red-50 border border-red-200 rounded-2xl p-6 shadow-sm dark:bg-red-900/20 dark:border-red-800">
                    <div className="text-red-800 dark:text-red-300 font-semibold mb-2">Fehler beim Laden der Datenbanken</div>
                    <div className="text-red-600 dark:text-red-400 text-sm mb-4">{error}</div>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={loadDatabases}
                        className="text-red-600 border-red-200 hover:bg-red-50 hover:border-red-300 rounded-xl dark:text-red-400 dark:border-red-700"
                    >
                        Erneut versuchen
                    </Button>
                </div>
            )}

            {/* Loading State */}
            {isLoading && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {[...Array(6)].map((_, i) => (
                        <div key={i} className="bg-white rounded-2xl border border-gray-200 p-6 animate-pulse shadow-sm dark:border-gray-800 dark:bg-white/[0.03]">
                            <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded-xl w-3/4 mb-4"></div>
                            <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded-xl w-full mb-2"></div>
                            <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded-xl w-2/3 mb-6"></div>
                            <div className="flex gap-3">
                                <div className="h-9 bg-gray-200 dark:bg-gray-700 rounded-xl w-24"></div>
                                <div className="h-9 bg-gray-200 dark:bg-gray-700 rounded-xl w-24"></div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Empty State */}
            {!isLoading && !error && filteredDatabases.length === 0 && (
                <div className="bg-gray-50 rounded-2xl border border-gray-200 shadow-sm dark:bg-gray-800/50 dark:border-gray-700">
                    <div className="text-center py-16 px-6">
                        <div className="text-gray-400 mb-6">
                            <svg className="w-20 h-20 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2 2v-5m16 0h-2M4 13h2m0 0V9a2 2 0 012-2h2m0 0V6a2 2 0 012-2h2.586a1 1 0 01.707.293l2.414 2.414A1 1 0 0116 7.414V9" />
                            </svg>
                        </div>
                        <h3 className="text-xl font-semibold text-gray-900 dark:text-white/90 mb-3">
                            {searchQuery ? 'Keine Datenbanken gefunden' : 'Noch keine Datenbanken'}
                        </h3>
                        <p className="text-gray-600 dark:text-gray-400 mb-8 max-w-md mx-auto">
                            {searchQuery
                                ? `Keine Datenbanken entsprechen der Suche "${searchQuery}"`
                                : 'Erstelle deine erste Datenbank, um loszulegen'
                            }
                        </p>
                        {!searchQuery && (
                            <Button
                                onClick={() => window.location.href = '/dashboard/crawl'}
                                className="bg-blue-600 hover:bg-blue-700 h-11 px-6 shadow-sm rounded-xl"
                            >
                                <Plus className="w-4 h-4 mr-2" />
                                Erste Datenbank erstellen
                            </Button>
                        )}
                    </div>
                </div>
            )}

            {/* Database Grid */}
            {!isLoading && !error && filteredDatabases.length > 0 && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {filteredDatabases.map((database) => (
                        <DatabaseCard
                            key={database.id}
                            database={database}
                            onDelete={handleDatabaseDeleted}
                            onUpdate={handleDatabaseUpdated}
                            onViewDetails={() => openDatabaseDetails(database)}
                        />
                    ))}
                </div>
            )}

            {/* Database Details Modal */}
            {selectedDatabase && (
                <DatabaseDetailsModal
                    database={selectedDatabase}
                    isOpen={isDetailsModalOpen}
                    onClose={() => {
                        setIsDetailsModalOpen(false)
                        setSelectedDatabase(null)
                    }}
                    onUpdate={handleDatabaseUpdated}
                    onDelete={handleDatabaseDeleted}
                />
            )}
        </div>
    )
}