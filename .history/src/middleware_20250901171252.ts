import { NextResponse, type NextRequest } from 'next/server'

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function middleware(_request: NextRequest) {
  // Temporarily disabled for debugging routing issues
  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Temporarily disable middleware for debugging
     * Re-enable after auth issues are resolved
     */
    // '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}