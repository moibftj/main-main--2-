import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { verifyAdminSessionFromRequest } from '@/lib/auth/admin-session'

const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS, POST, PUT, DELETE',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

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
  const forwarded = request.headers.get('x-forwarded-for')
  const realIP = request.headers.get('x-real-ip')
  const cfConnectingIP = request.headers.get('cf-connecting-ip')

  if (forwarded) {
    return forwarded.split(',')[0].trim()
  }

  if (realIP) {
    return realIP
  }

  if (cfConnectingIP) {
    return cfConnectingIP
  }

  return 'unknown'
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

  // Clean up old entries periodically
  if (rateLimitStore.size > 10000) {
    for (const [key, value] of rateLimitStore.entries()) {
      if (now > value.resetTime) {
        rateLimitStore.delete(key)
      }
    }
  }

  const remaining = Math.max(0, maxRequests - entry.count)

  return {
    limited: entry.count > maxRequests,
    resetTime: entry.resetTime,
    remaining
  }
}

// ============================================================================
// SUPABASE SESSION UPDATE
// ============================================================================
async function updateSession(request: NextRequest): Promise<NextResponse> {
  let supabaseResponse = NextResponse.next({ request })

  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

    if (!supabaseUrl || !supabaseAnonKey) {
      console.error('[Proxy] Missing Supabase environment variables')
      return supabaseResponse
    }

    const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    })

    // Refresh the session
    await supabase.auth.getUser()
    return supabaseResponse
  } catch (error) {
    console.error('[Proxy] Session update error:', error)
    return supabaseResponse
  }
}

export async function proxy(request: NextRequest) {
  const { pathname } = new URL(request.url)

  // ------------------------------------------
  // 1. CORS Preflight for API routes
  // ------------------------------------------
  if (request.method === 'OPTIONS' && pathname.startsWith('/api')) {
    return new NextResponse(null, { status: 204, headers: CORS_HEADERS })
  }

  // ------------------------------------------
  // 2. Skip middleware for static assets
  // ------------------------------------------
  if (
    pathname.startsWith('/_next/') ||
    pathname.startsWith('/static/') ||
    pathname.startsWith('/public/') ||
    pathname.includes('.') // files with extensions
  ) {
    return NextResponse.next()
  }

  // ------------------------------------------
  // 3. Rate limiting for API routes
  // ------------------------------------------
  if (pathname.startsWith('/api/')) {
    const rateLimitResult = isRateLimited(request)

    if (rateLimitResult.limited) {
      console.warn('[RateLimit] Request blocked:', {
        path: pathname,
        clientId: getClientId(request),
        timestamp: new Date().toISOString()
      })

      const response = NextResponse.json(
        {
          error: 'Too many requests. Please try again later.',
          retryAfter: Math.ceil((rateLimitResult.resetTime! - Date.now()) / 1000)
        },
        { status: 429 }
      )

      // Add rate limit headers
      Object.entries(CORS_HEADERS).forEach(([key, value]) => response.headers.set(key, value))
      response.headers.set('X-RateLimit-Limit', String(RATE_LIMIT_MAX_REQUESTS[pathname] || RATE_LIMIT_MAX_REQUESTS.default))
      response.headers.set('X-RateLimit-Remaining', '0')
      response.headers.set('X-RateLimit-Reset', String(Math.ceil(rateLimitResult.resetTime! / 1000)))
      response.headers.set('Retry-After', String(Math.ceil((rateLimitResult.resetTime! - Date.now()) / 1000)))
      return response
    }

    // For non-blocked API requests, just add headers and continue
    const response = await updateSession(request)
    Object.entries(CORS_HEADERS).forEach(([key, value]) => response.headers.set(key, value))
    response.headers.set('X-RateLimit-Limit', String(RATE_LIMIT_MAX_REQUESTS[pathname] || RATE_LIMIT_MAX_REQUESTS.default))
    response.headers.set('X-RateLimit-Remaining', String(rateLimitResult.remaining || 0))
    response.headers.set('X-RateLimit-Reset', String(Math.ceil((rateLimitResult.resetTime || Date.now() + RATE_LIMIT_WINDOW) / 1000)))
    return response
  }

  // ------------------------------------------
  // 4. Update Supabase session
  // ------------------------------------------
  const response = await updateSession(request)

  // ------------------------------------------
  // 5. Public routes (no auth required)
  // ------------------------------------------
  if (pathname === '/' || pathname.startsWith('/auth')) {
    return response
  }

  // ------------------------------------------
  // 6. Get user and profile for protected routes
  // ------------------------------------------
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

  if (!supabaseUrl || !supabaseAnonKey) {
    return response
  }

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll() {}, // No-op for reading
    },
  })

  const { data: { user } } = await supabase.auth.getUser()

  let userRole: string | null = null
  let isSuperUser = false

  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, is_super_user')
      .eq('id', user.id)
      .single()

    userRole = profile?.role || null
    isSuperUser = profile?.is_super_user || false
  }

  // ------------------------------------------
  // 7. Admin Portal Protection (/secure-admin-gateway)
  // ------------------------------------------
  const adminPortalRoute = process.env.ADMIN_PORTAL_ROUTE || 'secure-admin-gateway'

  if (pathname.startsWith(`/${adminPortalRoute}`)) {
    // Allow login page
    if (pathname === `/${adminPortalRoute}/login`) {
      return response
    }

    // Verify admin session for all other admin portal routes
    const adminSession = verifyAdminSessionFromRequest(request)
    if (!adminSession) {
      const url = new URL(`/${adminPortalRoute}/login`, request.url)
      return NextResponse.redirect(url)
    }

    // Super admin route protection
    const superAdminRoutes = [
      `/${adminPortalRoute}/dashboard/users`,
      `/${adminPortalRoute}/dashboard/analytics`,
      `/${adminPortalRoute}/dashboard/commissions`,
      `/${adminPortalRoute}/dashboard/all-letters`,
    ]

    const isSuperAdminRoute = superAdminRoutes.some(route => pathname.startsWith(route))

    if (isSuperAdminRoute) {
      const { data: adminProfile } = await supabase
        .from('profiles')
        .select('role, is_super_user')
        .eq('id', adminSession.userId)
        .single()

      if (!adminProfile || adminProfile.role !== 'admin' || !adminProfile.is_super_user) {
        const url = new URL(`/${adminPortalRoute}/review`, request.url)
        return NextResponse.redirect(url)
      }
    }

    return response
  }

  // ------------------------------------------
  // 8. Block old admin routes
  // ------------------------------------------
  if (pathname.startsWith('/dashboard/admin')) {
    const url = new URL('/dashboard', request.url)
    return NextResponse.redirect(url)
  }

  // ------------------------------------------
  // 9. Dashboard authentication
  // ------------------------------------------
  if (!user && pathname.startsWith('/dashboard')) {
    const url = new URL('/auth/login', request.url)
    url.searchParams.set('redirectTo', pathname)
    return NextResponse.redirect(url)
  }

  // ------------------------------------------
  // 10. Role-based routing
  // ------------------------------------------
  if (user && userRole) {
    // Employees can't access subscriber routes
    if (userRole === 'employee') {
      if (pathname.startsWith('/dashboard/letters') || pathname.startsWith('/dashboard/subscription')) {
        const url = new URL('/dashboard/commissions', request.url)
        return NextResponse.redirect(url)
      }
    }

    // Subscribers can't access employee routes
    if (userRole === 'subscriber') {
      if (pathname.startsWith('/dashboard/commissions') || pathname.startsWith('/dashboard/coupons')) {
        const url = new URL('/dashboard/letters', request.url)
        return NextResponse.redirect(url)
      }
    }

    // Redirect dashboard root based on role
    if (pathname === '/dashboard') {
      const url = new URL(request.url)
      if (userRole === 'admin') {
        url.pathname = '/dashboard/admin'
      } else if (userRole === 'employee') {
        url.pathname = '/dashboard/coupons'
      } else {
        url.pathname = '/dashboard/letters'
      }
      return NextResponse.redirect(url)
    }
  }

  return response
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
