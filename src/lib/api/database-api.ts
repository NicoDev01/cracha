'use client'

// Types for database API
export interface Database {
    id: string
    name: string
    description: string
    url?: string
    source_url?: string
    created_at: string | Date
    updated_at: string | Date
    last_crawl?: string | Date
    chunks_count?: number
    pages_count?: number
    document_count?: number
    status: 'active' | 'pending' | 'error' | 'failed' | 'crawling' | 'inactive'
    settings?: {
        embedding_model: string
        chunk_size: number
        chunk_overlap: number
    }
    urls?: string[]
}

export interface DatabaseResponse {
    success: boolean
    databases?: Database[]
    database?: Database
    error?: string
    details?: string
    message?: string
}

class DatabaseAPIClient {
    private baseUrl = '/api'

    async getUserDatabases(): Promise<Database[]> {
        try {
            const response = await fetch(`${this.baseUrl}/databases`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                },
            })

            if (!response.ok) {
                throw new Error(`Failed to fetch databases: ${response.status}`)
            }

            const data = await response.json() as DatabaseResponse

            if (!data.success) {
                throw new Error(data.error || 'Failed to fetch databases')
            }

            return data.databases || []
        } catch (error) {
            console.error('Error fetching user databases:', error)
            throw error
        }
    }

    async getDatabaseInfo(id: string): Promise<Database> {
        try {
            const response = await fetch(`${this.baseUrl}/databases/${id}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                },
            })

            if (!response.ok) {
                throw new Error(`Failed to fetch database info: ${response.status}`)
            }

            const data = await response.json() as DatabaseResponse

            if (!data.success || !data.database) {
                throw new Error(data.error || 'Failed to fetch database info')
            }

            return data.database
        } catch (error) {
            console.error('Error fetching database info:', error)
            throw error
        }
    }

    async createDatabase(database: Partial<Database>): Promise<Database> {
        try {
            const response = await fetch(`${this.baseUrl}/databases`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(database),
            })

            if (!response.ok) {
                throw new Error(`Failed to create database: ${response.status}`)
            }

            const data = await response.json() as DatabaseResponse

            if (!data.success || !data.database) {
                throw new Error(data.error || 'Failed to create database')
            }

            return data.database
        } catch (error) {
            console.error('Error creating database:', error)
            throw error
        }
    }

    async updateDatabase(id: string, updates: Partial<Database>): Promise<Database> {
        try {
            const response = await fetch(`${this.baseUrl}/databases/${id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(updates),
            })

            if (!response.ok) {
                throw new Error(`Failed to update database: ${response.status}`)
            }

            const data = await response.json() as DatabaseResponse

            if (!data.success || !data.database) {
                throw new Error(data.error || 'Failed to update database')
            }

            return data.database
        } catch (error) {
            console.error('Error updating database:', error)
            throw error
        }
    }

    async deleteDatabase(id: string): Promise<void> {
        try {
            const response = await fetch(`${this.baseUrl}/databases/${id}`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                },
            })

            if (!response.ok) {
                throw new Error(`Failed to delete database: ${response.status}`)
            }

            const data = await response.json() as DatabaseResponse

            if (!data.success) {
                throw new Error(data.error || 'Failed to delete database')
            }
        } catch (error) {
            console.error('Error deleting database:', error)
            throw error
        }
    }
}

// Create singleton instance
export const databaseAPI = new DatabaseAPIClient()

// Export individual functions for convenience
export async function getUserDatabases(): Promise<Database[]> {
    return databaseAPI.getUserDatabases()
}

export async function getDatabaseInfo(id: string): Promise<Database> {
    return databaseAPI.getDatabaseInfo(id)
}

export async function createDatabase(database: Partial<Database>): Promise<Database> {
    return databaseAPI.createDatabase(database)
}

export async function updateDatabase(id: string, updates: Partial<Database>): Promise<Database> {
    return databaseAPI.updateDatabase(id, updates)
}

export async function deleteDatabase(id: string): Promise<void> {
    return databaseAPI.deleteDatabase(id)
}
