import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { generateText } from 'ai'
import { openai } from '@ai-sdk/openai'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()

    // Authenticate user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get the letter and verify ownership
    const { data: letter, error: letterError } = await supabase
      .from('letters')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    if (letterError || !letter) {
      return NextResponse.json({ error: 'Letter not found' }, { status: 404 })
    }

    // Can only resubmit rejected letters
    if (letter.status !== 'rejected') {
      return NextResponse.json({
        error: 'Only rejected letters can be resubmitted'
      }, { status: 400 })
    }

    // Check subscription/credits (same logic as generate-letter)
    const { count } = await supabase.from("letters").select("*", { count: "exact", head: true }).eq("user_id", user.id)
    const isFreeTrial = (count || 0) === 0

    if (!isFreeTrial) {
      const { data: subscription } = await supabase
        .from("subscriptions")
        .select("credits_remaining, status")
        .eq("user_id", user.id)
        .eq("status", "active")
        .single()

      if (!subscription || (subscription.credits_remaining || 0) <= 0) {
        return NextResponse.json(
          {
            error: "No letter credits remaining. Please upgrade your plan.",
            needsSubscription: true,
          },
          { status: 403 }
        )
      }
    }

    // Update letter status back to generating
    const { error: updateError } = await supabase
      .from('letters')
      .update({
        status: 'generating',
        rejection_reason: null, // Clear rejection reason
        updated_at: new Date().toISOString()
      })
      .eq('id', id)

    if (updateError) throw updateError

    try {
      // Regenerate letter with rejection feedback
      const prompt = buildResubmitPrompt(letter, letter.rejection_reason)

      const { text: generatedContent } = await generateText({
        model: openai("gpt-4-turbo"),
        system: "You are a professional legal attorney revising a formal legal letter based on feedback. Incorporate the rejection feedback to create an improved, professional letter.",
        prompt,
        temperature: 0.7,
        maxTokens: 2048,
      })

      if (!generatedContent) {
        throw new Error("AI returned empty content")
      }

      // Update letter with new content and move to pending_review
      const { error: finalUpdateError } = await supabase
        .from('letters')
        .update({
          ai_draft_content: generatedContent,
          status: 'pending_review',
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)

      if (finalUpdateError) throw finalUpdateError

      // Deduct credit if not free trial
      if (!isFreeTrial) {
        const { data: canDeduct, error: deductError } = await supabase.rpc("deduct_letter_allowance", {
          u_id: user.id,
        })

        if (deductError || !canDeduct) {
          // Mark as failed if can't deduct
          await supabase
            .from('letters')
            .update({ status: 'failed', updated_at: new Date().toISOString() })
            .eq('id', id)

          return NextResponse.json(
            { error: 'No letter credits remaining. Please upgrade your plan.' },
            { status: 403 }
          )
        }
      }

      // Log audit trail
      await supabase.rpc('log_letter_audit', {
        p_letter_id: id,
        p_action: 'resubmitted',
        p_old_status: 'rejected',
        p_new_status: 'pending_review',
        p_notes: 'Letter resubmitted after addressing rejection feedback'
      })

      return NextResponse.json({
        success: true,
        letterId: id,
        status: 'pending_review',
        aiDraft: generatedContent,
      })

    } catch (generationError: any) {
      console.error('[Resubmit] Generation failed:', generationError)

      // Update letter status to failed
      await supabase
        .from('letters')
        .update({
          status: 'failed',
          updated_at: new Date().toISOString()
        })
        .eq('id', id)

      // Log audit trail
      await supabase.rpc('log_letter_audit', {
        p_letter_id: id,
        p_action: 'resubmit_failed',
        p_old_status: 'rejected',
        p_new_status: 'failed',
        p_notes: `Resubmission failed: ${generationError.message}`
      })

      return NextResponse.json(
        { error: generationError.message || 'Failed to regenerate letter' },
        { status: 500 }
      )
    }

  } catch (error: any) {
    console.error('[Resubmit] Error:', error)
    return NextResponse.json({ error: error.message || 'Failed to resubmit letter' }, { status: 500 })
  }
}

function buildResubmitPrompt(letter: any, rejectionReason: string): string {
  const intakeData = letter.intake_data || {}

  return `Please revise and improve this legal letter based on the rejection feedback:

ORIGINAL LETTER:
${letter.ai_draft_content}

REJECTION FEEDBACK:
${rejectionReason}

ORIGINAL INTAKE DATA:
${Object.entries(intakeData).map(([key, value]) => `${key}: ${value}`).join('\n')}

Requirements:
- Address all the points in the rejection feedback
- Maintain professional legal tone and proper formatting
- Keep all the original facts and details from the intake data
- Ensure legal accuracy and effectiveness
- Format as a complete letter with proper structure

Return ONLY the revised letter content, no additional commentary or explanations.`
}