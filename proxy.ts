import { NextRequest, NextResponse } from 'next/server'
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
    return NextResponse.next()
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

  // Delegate auth and routing to updateSession from lib/supabase/middleware
  // This handles:
  // 1. Supabase session refresh
  // 2. Admin Portal protection (/secure-admin-gateway)
  // 3. Dashboard auth checks
  // 4. Role-based routing
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
