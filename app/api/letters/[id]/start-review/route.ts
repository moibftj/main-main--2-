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

    const { data: letter } = await supabase
      .from('letters')
      .select('status')
      .eq('id', id)
      .single()

    if (!letter) {
      return NextResponse.json({ error: 'Letter not found' }, { status: 404 })
    }

    const { error: updateError } = await supabase
      .from('letters')
      .update({
        status: 'under_review',
        reviewed_by: adminSession?.userId,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)

    if (updateError) throw updateError

    await supabase.rpc('log_letter_audit', {
      p_letter_id: id,
      p_action: 'review_started',
      p_old_status: letter.status,
      p_new_status: 'under_review',
      p_notes: 'Admin started reviewing the letter'
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[v0] Start review error:', error)
    return NextResponse.json(
      { error: 'Failed to start review' },
      { status: 500 }
    )
  }
}
