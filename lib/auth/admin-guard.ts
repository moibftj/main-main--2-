import { NextRequest, NextResponse } from 'next/server'
import { isAdminAuthenticated } from './admin-session'

/**
 * API route guard for admin-only endpoints
 * Returns true if admin is authenticated, false otherwise
 * Also returns a response to send if authentication fails
 */
export async function verifyAdminAPI(): Promise<{
  authenticated: boolean
  response?: NextResponse
}> {
  const authenticated = await isAdminAuthenticated()

  if (!authenticated) {
    return {
      authenticated: false,
      response: NextResponse.json(
        { error: 'Admin authentication required' },
        { status: 401 }
      )
    }
  }

  return { authenticated: true }
}

/**
 * Simplified admin guard for API routes
 * Returns a NextResponse error if not authenticated, undefined if authenticated
 */
export async function requireAdminAuth(): Promise<NextResponse | undefined> {
  const authenticated = await isAdminAuthenticated()

  if (!authenticated) {
    return NextResponse.json(
      { error: 'Admin authentication required' },
      { status: 401 }
    )
  }

  return undefined
}
