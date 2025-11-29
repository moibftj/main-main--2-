import { NextRequest, NextResponse } from 'next/server'
import { createClient } from './lib/supabase/server'
import { updateSession } from '@/lib/supabase/middleware'

// Rate limiting configuration
const RATE_LIMIT_WINDOW = 15 * 60 * 1000 // 15 minutes in milliseconds
const RATE_LIMIT_MAX_REQUESTS: Record<string, number> = {
  '/api/generate-letter': 5, // 5 letters per 15 minutes
  '/api/create-checkout': 10, // 10 checkout attempts per 15 minutes
  '/api/admin-auth/login': 5, // 5 admin login attempts per 15 minutes
  '/api/auth/signup': 3, // 3 signup attempts per 15 minutes
  '/api/auth/login': 10, // 10 login attempts per 15 minutes
  default: 100 // Default limit for other API routes
}

// In-memory rate limit storage (use Redis or database for production)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>()

function getClientId(request: NextRequest): string {
  // Try to get user ID from auth header for authenticated requests
  const authHeader = request.headers.get('authorization')
  if (authHeader?.startsWith('Bearer ')) {
    return `user:${authHeader.substring(7)}`
  }

  // Fall back to IP address
  const forwarded = request.headers.get('x-forwarded-for')
  const ip = forwarded ? forwarded.split(',')[0] : request.ip || 'unknown'
  return `ip:${ip}`
}

function isRateLimited(request: NextRequest): { limited: boolean; resetTime?: number; remaining?: number } {
  const path = new URL(request.url).pathname

  // Only rate limit API routes
  if (!path.startsWith('/api/')) {
    return { limited: false }
  }

  const clientId = getClientId(request)
  const now = Date.now()

  // Get rate limit for this specific endpoint
  const maxRequests = RATE_LIMIT_MAX_REQUESTS[path] || RATE_LIMIT_MAX_REQUESTS.default

  // Get or create rate limit entry
  let entry = rateLimitStore.get(clientId)
  if (!entry || now > entry.resetTime) {
    entry = { count: 0, resetTime: now + RATE_LIMIT_WINDOW }
    rateLimitStore.set(clientId, entry)
  }

  entry.count++

  // Set expiration to clean up old entries
  setTimeout(() => {
    const current = rateLimitStore.get(clientId)
    if (current && current.resetTime <= now) {
      rateLimitStore.delete(clientId)
    }
  }, RATE_LIMIT_WINDOW + 1000)

  const remaining = Math.max(0, maxRequests - entry.count)

  return {
    limited: entry.count > maxRequests,
    resetTime: entry.resetTime,
    remaining
  }
}

export async function proxy(request: NextRequest) {
  const { pathname } = new URL(request.url)

  // Short-circuit CORS preflight requests for API routes
  if (request.method === 'OPTIONS' && pathname.startsWith('/api')) {
    return new NextResponse(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS, POST, PUT, DELETE',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    })
  }

  // Skip rate limiting for static assets and Next.js internals
  if (
    pathname.startsWith('/_next/') ||
    pathname.startsWith('/favicon.') ||
    pathname.startsWith('/public/') ||
    pathname.includes('.')
  ) {
    return updateSession(request)
  }

  // Apply rate limiting to API routes
  if (pathname.startsWith('/api/')) {
    const rateLimitResult = isRateLimited(request)

    if (rateLimitResult.limited) {
      const response = NextResponse.json(
        {
          error: 'Too many requests. Please try again later.',
          retryAfter: Math.ceil((rateLimitResult.resetTime! - Date.now()) / 1000)
        },
        { status: 429 }
      )

      // Add rate limit headers
      response.headers.set('X-RateLimit-Limit',
        String(RATE_LIMIT_MAX_REQUESTS[pathname] || RATE_LIMIT_MAX_REQUESTS.default))
      response.headers.set('X-RateLimit-Remaining', '0')
      response.headers.set('X-RateLimit-Reset',
        String(Math.ceil(rateLimitResult.resetTime! / 1000)))
      response.headers.set('Retry-After',
        String(Math.ceil((rateLimitResult.resetTime! - Date.now()) / 1000)))

      // Log rate limit violation
      console.warn('[RateLimit] Request blocked:', {
        path: pathname,
        clientId: getClientId(request),
        timestamp: new Date().toISOString()
      })

      return response
    }

    // Add rate limit headers for non-blocked requests
    const response = await updateSession(request)
    response.headers.set('X-RateLimit-Limit',
      String(RATE_LIMIT_MAX_REQUESTS[pathname] || RATE_LIMIT_MAX_REQUESTS.default))
    response.headers.set('X-RateLimit-Remaining',
      String(rateLimitResult.remaining || 0))
    response.headers.set('X-RateLimit-Reset',
      String(Math.ceil((rateLimitResult.resetTime || Date.now() + RATE_LIMIT_WINDOW) / 1000)))

    return response
  }

  // Admin auth middleware
  if (pathname.startsWith('/secure-admin-gateway') && !pathname.includes('/login')) {
    const supabase = await createClient()

    // Get admin session cookie
    const sessionCookie = request.cookies.get('admin_session')

    if (!sessionCookie) {
      // Redirect to login
      const loginUrl = new URL('/secure-admin-gateway/login', request.url)
      loginUrl.searchParams.set('redirect', pathname)
      return NextResponse.redirect(loginUrl)
    }

    try {
      const session = JSON.parse(sessionCookie.value)

      // Check if session has expired (30 minutes)
      const now = Date.now()
      if (now - session.lastActivity > 30 * 60 * 1000) {
        // Session expired, redirect to login
        const loginUrl = new URL('/secure-admin-gateway/login', request.url)
        loginUrl.searchParams.set('redirect', pathname)
        loginUrl.searchParams.set('expired', 'true')

        const response = NextResponse.redirect(loginUrl)
        response.cookies.delete('admin_session')
        return response
      }

      // Verify admin role in database
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', session.userId)
        .single()

      if (!profile || profile.role !== 'admin') {
        // Not an admin, redirect to login
        const loginUrl = new URL('/secure-admin-gateway/login', request.url)
        loginUrl.searchParams.set('redirect', pathname)
        return NextResponse.redirect(loginUrl)
      }

      // Update last activity
      session.lastActivity = now
      const response = await updateSession(request)
      response.cookies.set('admin_session', JSON.stringify(session), {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 1800, // 30 minutes
        path: '/'
      })

      return response

    } catch (error) {
      console.error('[AdminProxy] Error parsing session:', error)
      const loginUrl = new URL('/secure-admin-gateway/login', request.url)
      return NextResponse.redirect(loginUrl)
    }
  }

  // Admin auth middleware for /admin routes
  if (pathname.startsWith('/admin')) {
    const supabase = await createClient()

    // Refresh session if possible
    const { data: { session }, error } = await supabase.auth.getSession()

    if (!session || error) {
      // Redirect to login
      const loginUrl = new URL('/auth/login', request.url)
      loginUrl.searchParams.set('redirect', pathname)
      return NextResponse.redirect(loginUrl)
    }

    // Verify admin role
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', session.user.id)
      .single()

    if (!profile || profile.role !== 'admin') {
      // Not an admin, redirect with error
      const dashboardUrl = new URL('/dashboard?error=admin-access-required', request.url)
      return NextResponse.redirect(dashboardUrl)
    }
  }

  // Auth middleware for protected routes
  if (pathname.startsWith('/dashboard') || pathname.startsWith('/api/letters/')) {
    const supabase = await createClient()

    // Refresh session if possible
    const { data: { session }, error } = await supabase.auth.getSession()

    if (!session || error) {
      // Redirect to login for page routes
      if (pathname.startsWith('/dashboard')) {
        const loginUrl = new URL('/auth/login', request.url)
        loginUrl.searchParams.set('redirect', pathname)
        return NextResponse.redirect(loginUrl)
      }

      // Return 401 for API routes
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }

  return updateSession(request)
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
