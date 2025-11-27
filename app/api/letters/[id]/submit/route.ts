import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()
    
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { count: letterCount } = await supabase
      .from('letters')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)

    const isFreeTrial = (letterCount || 0) === 0

    if (!isFreeTrial) {
      const { data: canDeduct, error: deductError } = await supabase
        .rpc('deduct_letter_allowance', { u_id: user.id })

      if (deductError || !canDeduct) {
        return NextResponse.json({ 
          error: 'No letter allowances remaining. Please purchase more letters or upgrade your plan.',
          needsSubscription: true 
        }, { status: 403 })
      }
    }

    const { error: updateError } = await supabase
      .from('letters')
      .update({
        status: 'pending_review',
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .eq('user_id', user.id)

    if (updateError) throw updateError

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[v0] Letter submission error:', error)
    return NextResponse.json(
      { error: 'Failed to submit letter' },
      { status: 500 }
    )
  }
}
