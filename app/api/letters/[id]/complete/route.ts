import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { requireAdminAuth, getAdminSession } from '@/lib/auth/admin-session'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Verify admin authentication
    const authError = await requireAdminAuth()
    if (authError) return authError

    const { id } = await params
    const supabase = await createClient()
    const adminSession = await getAdminSession()

    // Get current letter status
    const { data: letter } = await supabase
      .from('letters')
      .select('status, user_id')
      .eq('id', id)
      .single()

    if (!letter) {
      return NextResponse.json({ error: 'Letter not found' }, { status: 404 })
    }

    // Can only complete approved letters
    if (letter.status !== 'approved') {
      return NextResponse.json({
        error: 'Letter must be approved before it can be completed'
      }, { status: 400 })
    }

    const { error: updateError } = await supabase
      .from('letters')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', id)

    if (updateError) throw updateError

    // Log the completion
    await supabase.rpc('log_letter_audit', {
      p_letter_id: id,
      p_action: 'completed',
      p_old_status: 'approved',
      p_new_status: 'completed',
      p_notes: 'Letter marked as completed'
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[v0] Complete letter error:', error)
    return NextResponse.json(
      { error: 'Failed to complete letter' },
      { status: 500 }
    )
  }
}