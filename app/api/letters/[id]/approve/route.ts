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
    const { finalContent, reviewNotes } = body

    if (!finalContent) {
      return NextResponse.json({ error: 'Final content is required for approval' }, { status: 400 })
    }

    const { data: letter } = await supabase
      .from('letters')
      .select('status')
      .eq('id', id)
      .single()

    const { error: updateError } = await supabase
      .from('letters')
      .update({
        status: 'approved',
        final_content: finalContent,
        review_notes: reviewNotes,
        reviewed_by: adminSession?.userId,
        reviewed_at: new Date().toISOString(),
        approved_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', id)

    if (updateError) throw updateError

    await supabase.rpc('log_letter_audit', {
      p_letter_id: id,
      p_action: 'approved',
      p_old_status: letter?.status || 'unknown',
      p_new_status: 'approved',
      p_notes: reviewNotes || 'Letter approved by admin'
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[v0] Letter approval error:', error)
    return NextResponse.json(
      { error: 'Failed to approve letter' },
      { status: 500 }
    )
  }
}
