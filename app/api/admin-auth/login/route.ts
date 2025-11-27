import { NextRequest, NextResponse } from 'next/server'
import { verifyAdminCredentials, createAdminSession } from '@/lib/auth/admin-session'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, password, portalKey } = body

    if (!email || !password || !portalKey) {
      return NextResponse.json(
        { error: 'Email, password, and portal key are required' },
        { status: 400 }
      )
    }

    // Verify credentials and portal key
    const result = await verifyAdminCredentials(email, password, portalKey)

    if (!result.success) {
      // Log failed login attempt
      console.warn('[AdminAuth] Failed login attempt:', {
        email,
        timestamp: new Date().toISOString(),
        error: result.error
      })

      return NextResponse.json(
        { error: result.error || 'Authentication failed' },
        { status: 401 }
      )
    }

    // Create admin session
    await createAdminSession(result.userId!, email)

    // Get super admin status
    const supabase = await createClient()
    const { data: profile } = await supabase
      .from('profiles')
      .select('is_super_user')
      .eq('id', result.userId)
      .single()

    const isSuperAdmin = profile?.is_super_user === true

    // Log successful login
    console.log('[AdminAuth] Successful admin login:', {
      email,
      userId: result.userId,
      isSuperAdmin,
      timestamp: new Date().toISOString()
    })

    return NextResponse.json({
      success: true,
      message: 'Admin authentication successful',
      isSuperAdmin
    })

  } catch (error) {
    console.error('[AdminAuth] Login error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
