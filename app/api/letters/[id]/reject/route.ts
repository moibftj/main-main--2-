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

    const body = await request.json()
    const { rejectionReason, reviewNotes } = body

    if (!rejectionReason) {
      return NextResponse.json({ error: 'Rejection reason is required' }, { status: 400 })
    }

    const { data: letter } = await supabase
      .from('letters')
      .select('status')
      .eq('id', id)
      .single()

    const { error: updateError } = await supabase
      .from('letters')
      .update({
        status: 'rejected',
        rejection_reason: rejectionReason,
        review_notes: reviewNotes,
        reviewed_by: adminSession?.userId,
        reviewed_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', id)

    if (updateError) throw updateError

    await supabase.rpc('log_letter_audit', {
      p_letter_id: id,
      p_action: 'rejected',
      p_old_status: letter?.status || 'unknown',
      p_new_status: 'rejected',
      p_notes: `Rejection reason: ${rejectionReason}`
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[v0] Letter rejection error:', error)
    return NextResponse.json(
      { error: 'Failed to reject letter' },
      { status: 500 }
    )
  }
}
