import { NextRequest, NextResponse } from 'next/server'
import { requireSuperAdminAuth, getAdminSession } from '@/lib/auth/admin-session'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    // Verify super admin authentication
    const authError = await requireSuperAdminAuth()
    if (authError) return authError

    const body = await request.json()
    const { userId, role } = body

    if (!userId || !role) {
      return NextResponse.json(
        { error: 'userId and role are required' },
        { status: 400 }
      )
    }

    // Validate role
    const validRoles = ['subscriber', 'employee', 'admin']
    if (!validRoles.includes(role)) {
      return NextResponse.json(
        { error: 'Invalid role. Must be subscriber, employee, or admin' },
        { status: 400 }
      )
    }

    const supabase = await createClient()
    const adminSession = await getAdminSession()

    // Check if user exists
    const { data: existingUser, error: userError } = await supabase
      .from('profiles')
      .select('id, email, role, full_name')
      .eq('id', userId)
      .single()

    if (userError || !existingUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Prevent promoting self
    if (userId === adminSession?.userId) {
      return NextResponse.json(
        { error: 'Cannot modify your own role' },
        { status: 403 }
      )
    }

    // Update user role
    // When promoting to admin, set is_super_user to false
    const updateData: any = {
      role,
      updated_at: new Date().toISOString()
    }

    if (role === 'admin') {
      updateData.is_super_user = false
    }

    const { error: updateError } = await supabase
      .from('profiles')
      .update(updateData)
      .eq('id', userId)

    if (updateError) {
      console.error('[PromoteUser] Error updating user:', updateError)
      return NextResponse.json(
        { error: 'Failed to update user role' },
        { status: 500 }
      )
    }

    // Log the action
    console.log('[PromoteUser] User role updated:', {
      userId,
      oldRole: existingUser.role,
      newRole: role,
      promotedBy: adminSession?.userId,
      timestamp: new Date().toISOString()
    })

    return NextResponse.json({
      success: true,
      message: `User promoted to ${role}`,
      user: {
        id: userId,
        email: existingUser.email,
        role: role
      }
    })

  } catch (error) {
    console.error('[PromoteUser] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
