import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

const ADMIN_SESSION_COOKIE = 'admin_session'
const ADMIN_SESSION_TIMEOUT = 30 * 60 * 1000 // 30 minutes in milliseconds

export interface AdminSession {
  userId: string
  email: string
  loginTime: number
  lastActivity: number
  portalKeyVerified: boolean
}

/**
 * Create an admin session after successful authentication
 */
export async function createAdminSession(userId: string, email: string): Promise<void> {
  const session: AdminSession = {
    userId,
    email,
    loginTime: Date.now(),
    lastActivity: Date.now(),
    portalKeyVerified: true
  }

  const cookieStore = await cookies()
  cookieStore.set(ADMIN_SESSION_COOKIE, JSON.stringify(session), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 1800, // 30 minutes
    path: '/'
  })
}

/**
 * Verify admin session from cookies
 */
export async function verifyAdminSession(): Promise<AdminSession | null> {
  const cookieStore = await cookies()
  const sessionCookie = cookieStore.get(ADMIN_SESSION_COOKIE)

  if (!sessionCookie) {
    return null
  }

  try {
    const session: AdminSession = JSON.parse(sessionCookie.value)

    // Check if session has expired (30 minutes)
    const now = Date.now()
    if (now - session.lastActivity > ADMIN_SESSION_TIMEOUT) {
      await destroyAdminSession()
      return null
    }

    // Update last activity time
    session.lastActivity = now
    cookieStore.set(ADMIN_SESSION_COOKIE, JSON.stringify(session), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 1800,
      path: '/'
    })

    return session
  } catch (error) {
    console.error('[AdminSession] Error parsing session:', error)
    await destroyAdminSession()
    return null
  }
}

/**
 * Verify admin session from request (for middleware)
 */
export function verifyAdminSessionFromRequest(request: NextRequest): AdminSession | null {
  const sessionCookie = request.cookies.get(ADMIN_SESSION_COOKIE)

  if (!sessionCookie) {
    return null
  }

  try {
    const session: AdminSession = JSON.parse(sessionCookie.value)

    // Check if session has expired
    const now = Date.now()
    if (now - session.lastActivity > ADMIN_SESSION_TIMEOUT) {
      return null
    }

    return session
  } catch (error) {
    console.error('[AdminSession] Error parsing session from request:', error)
    return null
  }
}

/**
 * Destroy admin session (logout)
 */
export async function destroyAdminSession(): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.delete(ADMIN_SESSION_COOKIE)
}

/**
 * Verify admin credentials and portal key
 */
export async function verifyAdminCredentials(
  email: string,
  password: string,
  portalKey: string
): Promise<{ success: boolean; userId?: string; error?: string }> {
  // Verify portal key
  const expectedPortalKey = process.env.ADMIN_PORTAL_KEY
  if (!expectedPortalKey || portalKey !== expectedPortalKey) {
    return { success: false, error: 'Invalid admin portal key' }
  }

  // Verify credentials
  const expectedEmail = process.env.ADMIN_EMAIL
  const expectedPassword = process.env.ADMIN_PASSWORD

  if (!expectedEmail || !expectedPassword) {
    console.error('[AdminAuth] Admin credentials not configured')
    return { success: false, error: 'Admin authentication not configured' }
  }

  if (email !== expectedEmail || password !== expectedPassword) {
    return { success: false, error: 'Invalid admin credentials' }
  }

  // Get admin user ID from database
  const supabase = await createClient()
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('id, role')
    .eq('email', email)
    .eq('role', 'admin')
    .single()

  if (error || !profile) {
    console.error('[AdminAuth] Admin profile not found:', error)
    return { success: false, error: 'Admin account not found' }
  }

  return { success: true, userId: profile.id }
}

/**
 * Verify admin role from database
 */
export async function verifyAdminRole(userId: string): Promise<boolean> {
  const supabase = await createClient()
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', userId)
    .single()

  return profile?.role === 'admin'
}

/**
 * Get admin session info
 */
export async function getAdminSession(): Promise<AdminSession | null> {
  return await verifyAdminSession()
}

/**
 * Check if current user is authenticated admin
 */
export async function isAdminAuthenticated(): Promise<boolean> {
  const session = await verifyAdminSession()
  if (!session) {
    return false
  }

  // Double-check role in database
  return await verifyAdminRole(session.userId)
}

/**
 * Check if current admin is a super admin
 */
export async function isSuperAdmin(): Promise<boolean> {
  const session = await verifyAdminSession()
  if (!session) {
    return false
  }

  const supabase = await createClient()
  const { data: profile } = await supabase
    .from('profiles')
    .select('role, is_super_user')
    .eq('id', session.userId)
    .single()

  return profile?.role === 'admin' && profile?.is_super_user === true
}

/**
 * Get admin session with role information
 */
export async function getAdminSessionWithRole(): Promise<{
  session: AdminSession | null
  isSuperUser: boolean
  role: string | null
}> {
  const session = await verifyAdminSession()

  if (!session) {
    return { session: null, isSuperUser: false, role: null }
  }

  const supabase = await createClient()
  const { data: profile } = await supabase
    .from('profiles')
    .select('role, is_super_user')
    .eq('id', session.userId)
    .single()

  return {
    session,
    isSuperUser: profile?.is_super_user === true,
    role: profile?.role || null
  }
}

/**
 * Require admin authentication for API routes (any admin type)
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

/**
 * Require super admin authentication for API routes
 */
export async function requireSuperAdminAuth(): Promise<NextResponse | undefined> {
  const authenticated = await isAdminAuthenticated()

  if (!authenticated) {
    return NextResponse.json(
      { error: 'Admin authentication required' },
      { status: 401 }
    )
  }

  const superAdmin = await isSuperAdmin()

  if (!superAdmin) {
    return NextResponse.json(
      { error: 'Super admin privileges required' },
      { status: 403 }
    )
  }

  return undefined
}
