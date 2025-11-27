import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { verifyAdminSessionFromRequest } from '@/lib/auth/admin-session'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

    if (!supabaseUrl || !supabaseAnonKey) {
      console.error('[v0] Missing Supabase environment variables in middleware')
      // Allow access to auth pages and home without Supabase
      if (request.nextUrl.pathname.startsWith('/auth') || request.nextUrl.pathname === '/') {
        return supabaseResponse
      }
      
      const url = request.nextUrl.clone()
      url.pathname = '/'
      return NextResponse.redirect(url)
    }

    const supabase = createServerClient(
      supabaseUrl,
      supabaseAnonKey,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll()
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value }) =>
              request.cookies.set(name, value)
            )
            supabaseResponse = NextResponse.next({
              request,
            })
            cookiesToSet.forEach(({ name, value, options }) =>
              supabaseResponse.cookies.set(name, value, options)
            )
          },
        },
      }
    )

    const {
      data: { user },
    } = await supabase.auth.getUser()

    // Get user role for route protection
    let userRole = null
    if (user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()
      
      userRole = profile?.role
    }

    const pathname = request.nextUrl.pathname

    // Admin Portal Protection (BEFORE regular auth checks)
    const adminPortalRoute = process.env.ADMIN_PORTAL_ROUTE || 'secure-admin-gateway'
    if (pathname.startsWith(`/${adminPortalRoute}`)) {
      // Allow login page
      if (pathname === `/${adminPortalRoute}/login`) {
        return supabaseResponse
      }

      // Verify admin session for all other admin portal routes
      const adminSession = verifyAdminSessionFromRequest(request)
      if (!adminSession) {
        const url = request.nextUrl.clone()
        url.pathname = `/${adminPortalRoute}/login`
        return NextResponse.redirect(url)
      }

      // Super admin route protection - specific routes that require super admin privileges
      const superAdminRoutes = [
        `/${adminPortalRoute}/dashboard/users`,
        `/${adminPortalRoute}/dashboard/analytics`,
        `/${adminPortalRoute}/dashboard/commissions`,
        `/${adminPortalRoute}/dashboard/all-letters`,
      ]

      // Allow dashboard root and letters routes for all admins
      // Main dashboard (/, /dashboard) and /dashboard/letters are accessible to all admins
      const isAdminRoute = pathname.startsWith(`/${adminPortalRoute}/dashboard`)
      const isSuperAdminRoute = superAdminRoutes.some(route => pathname.startsWith(route))

      if (isSuperAdminRoute) {
        // Verify super admin status
        const { data: profile } = await supabase
          .from('profiles')
          .select('role, is_super_user')
          .eq('id', adminSession.userId)
          .single()

        if (!profile || profile.role !== 'admin' || !profile.is_super_user) {
          // Redirect regular admins to Review Center
          const url = request.nextUrl.clone()
          url.pathname = `/${adminPortalRoute}/review`
          return NextResponse.redirect(url)
        }
      }

      return supabaseResponse
    }

    // Block access to old admin routes completely
    if (pathname.startsWith('/dashboard/admin')) {
      const url = request.nextUrl.clone()
      url.pathname = '/dashboard'
      return NextResponse.redirect(url)
    }

    // Public routes
    if (pathname === '/' || pathname.startsWith('/auth')) {
      return supabaseResponse
    }

    // Require auth for dashboard
    if (!user && pathname.startsWith('/dashboard')) {
      const url = request.nextUrl.clone()
      url.pathname = '/auth/login'
      return NextResponse.redirect(url)
    }

    // Role-based routing
    if (user && userRole) {
      if (userRole === 'employee' && (pathname.startsWith('/dashboard/letters') || pathname.startsWith('/dashboard/subscription'))) {
        const url = request.nextUrl.clone()
        url.pathname = '/dashboard/commissions'
        return NextResponse.redirect(url)
      }

      if ((pathname.startsWith('/dashboard/commissions') || pathname.startsWith('/dashboard/coupons')) && userRole === 'subscriber') {
        const url = request.nextUrl.clone()
        url.pathname = '/dashboard/letters'
        return NextResponse.redirect(url)
      }
    }

    return supabaseResponse
  } catch (error) {
    console.error('[v0] Middleware error:', error)
    
    // Allow access to auth pages even on error
    if (request.nextUrl.pathname.startsWith('/auth') || request.nextUrl.pathname === '/') {
      return supabaseResponse
    }
    
    // Redirect to home with error for other routes
    const url = request.nextUrl.clone()
    url.pathname = '/'
    return NextResponse.redirect(url)
  }
}
