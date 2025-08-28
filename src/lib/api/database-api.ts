/**
 * Database API Client - For Database Management
 * 
 * Communicates with Cloudflare Workers API routes that handle
 * authentication and interact with KV storage and external services.
 * 
 * ✅ Cloudflare Workers Compatible:
 * - Uses hybrid environment variable access pattern
 * - Implements proper error handling for 401/429/404 responses
 * - Supports both local development and production environments
 */

import { Database } from '@/types/chat'

// API Response interfaces
export interface DatabaseListResponse {
  success: boolean
  user_id?: string
  databases: Database[]
  count: number
  error?: string
  note?: string
  environment?: string
}

export interface DatabaseInfoResponse {
  success: boolean
  database: Database
  error?: string
}

interface ErrorResponse {
  error?: string
  message?: string
}

/**
 * Get environment variable with fallback support
 * Works in both Node.js and Cloudflare Workers environments
 */
function getEnvVariable(key: string): string | undefined {
  // In browser/client-side, only NEXT_PUBLIC_ variables are available
  if (typeof window !== 'undefined') {
    return process.env[key]
  }
  
  // Server-side: works in both Node.js and Workers
  return process.env[key]
}

class DatabaseAPIClient {
  private baseUrl: string
  private adminWorkerUrl: string

  constructor() {
    // Use Cloudflare Workers API routes instead of direct Modal.com calls
    // This ensures proper authentication and environment handling
    this.baseUrl = typeof window !== 'undefined' 
      ? window.location.origin 
      : (getEnvVariable('NEXT_PUBLIC_APP_URL') || 'http://localhost:3000')
    
    // Admin Worker URL for advanced operations (if needed)
    this.adminWorkerUrl = getEnvVariable('NEXT_PUBLIC_ADMIN_WORKER_URL') || 
                         'https://cracha-admin-worker.aimpact-agency.workers.dev'
  }

  /**
   * Loads all databases for the currently authenticated user
   * ✅ Cloudflare Workers Compatible with proper error handling
   */
  async getUserDatabases(): Promise<Database[]> {
    try {
      console.log('🔍 Loading user databases via API route...')
      
      // 🔐 SECURITY: Use internal API route that handles authentication
      // This route automatically validates user authentication via Supabase
      const response = await fetch(`${this.baseUrl}/api/admin/databases`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache', // Ensure fresh data
        },
        // Include credentials for authentication
        credentials: 'include',
      })

      console.log(`📡 API Response: ${response.status} ${response.statusText}`)

      if (!response.ok) {
        // Handle authentication errors specifically
        if (response.status === 401) {
          console.warn('🔐 Authentication failed - user not authorized to access databases')
          throw new Error('Authentication required. Please log in to access your databases.')
        }
        
        // Handle rate limiting specifically
        if (response.status === 429) {
          console.warn('⏳ Rate limit exceeded - too many requests')
          const errorData = await response.json().catch(() => ({ error: 'Rate limit exceeded' })) as ErrorResponse
          throw new Error(`Rate limit exceeded: ${errorData.error || 'Please wait a moment and try again'}`)
        }
        
        // Handle server errors
        if (response.status === 500) {
          console.error('🚨 Server error occurred')
          const errorData = await response.json().catch(() => ({ error: 'Internal server error' })) as ErrorResponse
          throw new Error(`Server error: ${errorData.error || 'Please try again later'}`)
        }
        
        // Try to get error details from response
        let errorMessage = `HTTP ${response.status}: ${response.statusText}`
        try {
          const errorData = await response.json() as ErrorResponse
          if (errorData.error || errorData.message) {
            errorMessage = errorData.error || errorData.message || errorMessage
          }
        } catch {
          // Ignore JSON parsing errors, use default message
        }
        throw new Error(errorMessage)
      }

      const data = await response.json() as DatabaseListResponse
      console.log('📊 Database API Response:', {
        success: data.success,
        count: data.count,
        environment: data.environment,
        note: data.note
      })

      if (!data.success) {
        throw new Error(data.error || 'Failed to load databases')
      }

      // Ensure databases is an array
      const databases = Array.isArray(data.databases) ? data.databases : []
      console.log(`✅ Successfully loaded ${databases.length} databases`)

      interface RawDatabase {
        id: string;
        name: string;
        description?: string;
        document_count?: number;
        created_at: string | Date;
        last_updated?: string;
        updated_at?: string | Date;
        last_crawl?: string | Date | null;
        source_url?: string;
        status?: string;
      }

      // Transform raw database objects to our Database interface
      return (databases as unknown as RawDatabase[]).map((db: RawDatabase): Database => {
        // Handle different date formats from API
        const parseDate = (dateValue: string | Date | null | undefined): Date => {
          if (!dateValue) return new Date()
          if (dateValue instanceof Date) return dateValue
          return new Date(dateValue)
        }

        return {
          id: db.id,
          name: db.name,
          description: db.description || '',
          document_count: db.document_count || 0,
          created_at: parseDate(db.created_at),
          updated_at: parseDate(db.last_updated || db.updated_at || db.created_at),
          last_crawl: db.last_crawl ? parseDate(db.last_crawl) : undefined,
          source_url: db.source_url || '',
          status: db.status || 'active'
        }
      })

    } catch (error) {
      console.error('❌ Failed to load user databases:', error)
      
      // Handle different error types appropriately
      if (error instanceof Error) {
        // Re-throw authentication errors without fallback
        if (error.message.includes('Authentication required') || 
            error.message.includes('401') ||
            error.message.includes('Unauthorized')) {
          console.error('🚫 Authentication error - no fallback data provided')
          throw error
        }
        
        // For network or temporary errors, provide fallback in development only
        if (error.message.includes('Failed to fetch') || 
            error.message.includes('Rate limit') ||
            error.message.includes('Server error')) {
          
          // In development, provide mock data for testing
          if (getEnvVariable('NODE_ENV') === 'development' || 
              getEnvVariable('ENVIRONMENT') === 'development') {
            console.log('🔧 Development mode: Using mock data due to network error')
            return this.getMockDatabases()
          }
          
          // In production, re-throw the error
          throw error
        }
      }
      
      // For unknown errors, re-throw in production, fallback in development
      if (getEnvVariable('NODE_ENV') === 'development') {
        console.log('🔧 Development mode: Using mock data due to unknown error')
        return this.getMockDatabases()
      }
      
      throw error
    }
  }

  /**
   * Gets detailed information about a specific database
   * ✅ Uses API route for proper authentication and environment handling
   */
  async getDatabaseInfo(databaseId: string): Promise<Database> {
    try {
      console.log(`🔍 Loading database info for ID: ${databaseId}`)
      
      // Use API route instead of direct service call
      const response = await fetch(`${this.baseUrl}/api/admin/databases/${databaseId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      })

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error(`Database with ID '${databaseId}' not found`)
        }
        if (response.status === 401) {
          throw new Error('Authentication required. Please log in to access database information.')
        }
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const data = await response.json() as DatabaseInfoResponse

      if (!data.success) {
        throw new Error(data.error || 'Failed to load database info')
      }

      const db = data.database
      return {
        id: db.id,
        name: db.name,
        description: db.description || '',
        document_count: db.document_count || 0,
        created_at: new Date(db.created_at),
        updated_at: new Date(db.updated_at || db.created_at),
        last_crawl: db.last_crawl ? new Date(db.last_crawl) : undefined,
        source_url: db.source_url || '',
        status: db.status || 'active'
      }

    } catch (error) {
      console.error(`❌ Failed to load database info for ${databaseId}:`, error)
      throw error
    }
  }

  /**
   * Deletes a database
   * ✅ Uses API route for proper authentication and environment handling
   */
  async deleteDatabase(databaseId: string): Promise<boolean> {
    try {
      console.log(`🗑️ Deleting database: ${databaseId}`)
      
      // Use API route for deletion
      const response = await fetch(`${this.baseUrl}/api/admin/databases/${databaseId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      })

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error(`Database with ID '${databaseId}' not found`)
        }
        if (response.status === 401) {
          throw new Error('Authentication required. Please log in to delete databases.')
        }
        if (response.status === 403) {
          throw new Error('Permission denied. You do not have permission to delete this database.')
        }
        
        let errorMessage = `HTTP ${response.status}: ${response.statusText}`
        try {
          const errorData = await response.json() as ErrorResponse
          if (errorData.error) {
            errorMessage = errorData.error
          }
        } catch {
          // Ignore JSON parsing errors
        }
        throw new Error(errorMessage)
      }

      const data = await response.json() as { success: boolean; message?: string }
      console.log(`✅ Database deletion result:`, data)
      
      return data.success

    } catch (error) {
      console.error(`❌ Failed to delete database ${databaseId}:`, error)
      throw error
    }
  }

  /**
   * Mock data for development and testing
   * ✅ Provides realistic test data when external services are unavailable
   */
  private getMockDatabases(): Database[] {
    console.log('🔧 Returning mock databases for development')
    
    return [
      {
        id: 'test-pythondata',
        name: 'Python 3.13 Documentation',
        description: 'Crawled from Python 3.13 What\'s New documentation',
        document_count: 83,
        created_at: new Date('2025-01-20T17:22:25Z'),
        updated_at: new Date('2025-01-20T17:23:19Z'),
        last_crawl: new Date('2025-01-20T17:23:19Z'),
        source_url: 'https://docs.python.org/3/whatsnew/3.13.html',
        status: 'active'
      },
      {
        id: 'nextjs-docs',
        name: 'Next.js Documentation',
        description: 'Complete Next.js 15 documentation',
        document_count: 245,
        created_at: new Date('2025-01-19T14:30:00Z'),
        updated_at: new Date('2025-01-19T14:45:30Z'),
        last_crawl: new Date('2025-01-19T14:45:30Z'),
        source_url: 'https://nextjs.org/docs',
        status: 'active'
      },
      {
        id: 'cloudflare-workers',
        name: 'Cloudflare Workers Docs',
        description: 'Cloudflare Workers development guide',
        document_count: 156,
        created_at: new Date('2025-01-18T09:15:00Z'),
        updated_at: new Date('2025-01-18T09:30:45Z'),
        last_crawl: new Date('2025-01-18T09:30:45Z'),
        source_url: 'https://developers.cloudflare.com/workers/',
        status: 'active'
      },
      {
        id: 'development-notice',
        name: '🔧 Development Mode Active',
        description: 'This is mock data shown because the API is unavailable or not configured. In production, real databases will be shown.',
        document_count: 0,
        created_at: new Date(),
        updated_at: new Date(),
        last_crawl: undefined,
        source_url: '',
        status: 'development'
      }
    ]
  }
}

// Create singleton instance
export const databaseAPI = new DatabaseAPIClient()

// Convenience functions with proper error handling
export async function getUserDatabases(): Promise<Database[]> {
  return databaseAPI.getUserDatabases()
}

export async function getDatabaseInfo(databaseId: string): Promise<Database> {
  return databaseAPI.getDatabaseInfo(databaseId)
}

export async function deleteDatabase(databaseId: string): Promise<boolean> {
  return databaseAPI.deleteDatabase(databaseId)
}

/**
 * Health check for the database API
 * ✅ Tests if the API endpoints are accessible and working
 */
export async function healthCheck(): Promise<{ healthy: boolean; message: string; environment?: string }> {
  try {
    const baseUrl = typeof window !== 'undefined' 
      ? window.location.origin 
      : (getEnvVariable('NEXT_PUBLIC_APP_URL') || 'http://localhost:3000')
    
    const response = await fetch(`${baseUrl}/api/test/cloudflare-token`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
    })

    if (response.ok) {
      const data = await response.json() as { environment?: string; [key: string]: unknown }
      return {
        healthy: true,
        message: 'Database API is accessible and configured correctly',
        environment: data.environment
      }
    } else {
      return {
        healthy: false,
        message: `API health check failed: ${response.status} ${response.statusText}`
      }
    }
  } catch (error) {
    return {
      healthy: false,
      message: `API health check error: ${error instanceof Error ? error.message : 'Unknown error'}`
    }
  }
}