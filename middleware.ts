import { createClient } from '@/lib/supabase/server'
import { updateSession } from '@/lib/supabase/middleware'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  // First update the session
  const response = await updateSession(request)

  // Skip middleware for API routes, static files, and auth routes
  const { pathname } = request.nextUrl
  if (
    pathname.startsWith('/api/') ||
    pathname.startsWith('/_next/') ||
    pathname.startsWith('/static/') ||
    pathname.startsWith('/auth/') ||
    pathname === '/'
  ) {
    return response
  }

  // Check if user is authenticated
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // If not authenticated and trying to access protected routes, redirect to login
  if (!user) {
    if (pathname.startsWith('/dashboard') || pathname.startsWith('/secure-admin-gateway')) {
      const loginUrl = new URL('/auth/login', request.url)
      loginUrl.searchParams.set('redirectTo', pathname)
      return NextResponse.redirect(loginUrl)
    }
  } else {
    // User is authenticated, get profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, created_at')
      .eq('id', user.id)
      .single()

    // If profile doesn't exist, create it (rare edge case)
    if (!profile) {
      const profileUrl = new URL('/api/create-profile', request.url)
      // We can't fetch in middleware, so just continue
    } else {
      // Admin portal protection
      if (pathname.startsWith('/secure-admin-gateway')) {
        if (profile.role !== 'admin') {
          return NextResponse.redirect(new URL('/dashboard', request.url))
        }
      }

      // Dashboard redirection based on role
      if (pathname === '/dashboard' || pathname === '/') {
        if (profile.role === 'admin') {
          return NextResponse.redirect(new URL('/dashboard/admin', request.url))
        } else if (profile.role === 'employee') {
          return NextResponse.redirect(new URL('/dashboard/coupons', request.url))
        } else {
          return NextResponse.redirect(new URL('/dashboard/letters', request.url))
        }
      }
    }
  }

  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public (public files)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|public).*)',
  ],
}