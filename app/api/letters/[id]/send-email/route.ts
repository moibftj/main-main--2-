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

    const body = await request.json()
    const { recipientEmail, message } = body

    const { data: letter, error: letterError } = await supabase
      .from('letters')
      .select('*, profiles(full_name, email)')
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    if (letterError || !letter) {
      return NextResponse.json({ error: 'Letter not found' }, { status: 404 })
    }

    if (letter.status !== 'approved') {
      return NextResponse.json({ error: 'Only approved letters can be sent' }, { status: 400 })
    }

    console.log('[v0] Email simulation:', {
      to: recipientEmail,
      from: letter.profiles?.email,
      subject: letter.title,
      content: letter.final_content,
      message: message
    })

    // For demo purposes, just return success
    return NextResponse.json({ 
      success: true,
      message: 'Email sent successfully (simulated)'
    })

  } catch (error) {
    console.error('[v0] Email sending error:', error)
    return NextResponse.json(
      { error: 'Failed to send email' },
      { status: 500 }
    )
  }
}
