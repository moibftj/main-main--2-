import { NextRequest, NextResponse } from 'next/server'
import { destroyAdminSession, getAdminSession } from '@/lib/auth/admin-session'

export async function POST(request: NextRequest) {
  try {
    const session = await getAdminSession()

    if (session) {
      console.log('[AdminAuth] Admin logout:', {
        email: session.email,
        userId: session.userId,
        timestamp: new Date().toISOString()
      })
    }

    await destroyAdminSession()

    return NextResponse.json({
      success: true,
      message: 'Logged out successfully'
    })

  } catch (error) {
    console.error('[AdminAuth] Logout error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
