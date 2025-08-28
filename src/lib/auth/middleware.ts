import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/supabase/server'

export interface AuthenticatedRequest extends NextRequest {
  user: {
    id: string
    email: string
  }
}

/**
 * Create a fallback user for development when Supabase is not configured
 */
function createFallbackUser() {
  return {
    id: 'dev-user-' + Math.random().toString(36).substr(2, 9),
    email: 'dev@example.com'
  }
}

/**
 * Authentication middleware for API routes
 * Validates Supabase session and attaches user info to request
 * Implements hybrid authentication with fallback for development
 */
export function withAuth(
  handler: (request: AuthenticatedRequest) => Promise<NextResponse>,
  options: {
    requireAuth?: boolean
    allowedRoles?: string[]
  } = { requireAuth: true }
) {
  // Return the async middleware function directly
  return async (request: NextRequest): Promise<NextResponse> => {
    try {
      // Get authenticated user from Supabase session
      const user = await getAuthenticatedUser()
      
      // Check if Supabase is configured
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
      const isSupabaseConfigured = supabaseUrl && !supabaseUrl.includes('placeholder')
      
      if (options.requireAuth && !user) {
        // In development mode with no Supabase config, provide fallback
        if (process.env.NODE_ENV === 'development' && !isSupabaseConfigured) {
          console.warn('🔧 Development mode: Using fallback authentication')
          const fallbackUser = createFallbackUser()
          
          const authenticatedRequest = request as AuthenticatedRequest
          authenticatedRequest.user = fallbackUser
          
          return await handler(authenticatedRequest)
        }
        
        return NextResponse.json({
          success: false,
          error: 'Authentication required. Please log in to access this resource.'
        }, { status: 401 })
      }
      
      if (!user) {
        // If auth not required and no user, proceed without user context
        return await handler(request as AuthenticatedRequest)
      }
      
      // Attach user to request object
      const authenticatedRequest = request as AuthenticatedRequest
      authenticatedRequest.user = {
        id: user.id,
        email: user.email || ''
      }
      
      // Proceed with authenticated request
      return await handler(authenticatedRequest)
      
    } catch (error) {
      console.error('Authentication middleware error:', error)
      
      if (options.requireAuth) {
        // In development mode, provide fallback even on errors
        if (process.env.NODE_ENV === 'development') {
          console.warn('🔧 Development mode: Using fallback authentication due to error')
          const fallbackUser = createFallbackUser()
          
          const authenticatedRequest = request as AuthenticatedRequest
          authenticatedRequest.user = fallbackUser
          
          return await handler(authenticatedRequest)
        }
        
        return NextResponse.json({
          success: false,
          error: 'Authentication validation failed. Please log in again.'
        }, { status: 401 })
      }
      
      // If auth not required, proceed anyway
      return await handler(request as AuthenticatedRequest)
    }
  }
}

/**
 * Higher-order function to create authenticated API handlers
 * Usage: export const GET = authenticated(async (request) => { ... })
 */
export function authenticated(
  handler: (request: AuthenticatedRequest) => Promise<NextResponse>
) {
  return withAuth(handler, { requireAuth: true })
}

/**
 * Higher-order function to create optionally authenticated API handlers
 * Usage: export const GET = optionalAuth(async (request) => { ... })
 */
export function optionalAuth(
  handler: (request: AuthenticatedRequest) => Promise<NextResponse>
) {
  return withAuth(handler, { requireAuth: false })
}

/**
 * Utility function to extract user ID from authenticated request
 */
export function getUserId(request: AuthenticatedRequest): string {
  if (!request.user?.id) {
    throw new Error('User ID not available - ensure request is authenticated')
  }
  return request.user.id
}

/**
 * Utility function to validate user ownership of a resource
 * Throws error if user doesn't own the resource
 */
export function validateUserOwnership(
  request: AuthenticatedRequest, 
  resourceUserId: string,
  resourceType: string = 'resource'
): void {
  const currentUserId = getUserId(request)
  
  if (currentUserId !== resourceUserId) {
    throw new Error(`Access denied. You don't have permission to access this ${resourceType}.`)
  }
}