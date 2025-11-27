import { createClient } from "@/lib/supabase/server"
import { type NextRequest, NextResponse } from "next/server"
import { openai } from "@ai-sdk/openai"
import { generateText } from "ai"

export const runtime = "nodejs"

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // 1. Auth Check
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // 2. Role Check
    const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single()

    if (profile?.role !== "subscriber") {
      return NextResponse.json({ error: "Only subscribers can generate letters" }, { status: 403 })
    }

    // 3. Subscription & Limit Check
    // Check if user has generated any letters before (Free Trial Check)
    const { count } = await supabase.from("letters").select("*", { count: "exact", head: true }).eq("user_id", user.id)

    const isFreeTrial = (count || 0) === 0

    // If not free trial, ensure active subscription has credits available before generating
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
          { status: 403 },
        )
      }
    }

    const body = await request.json()
    const { letterType, intakeData } = body

    if (!letterType || !intakeData) {
      return NextResponse.json({ error: "letterType and intakeData are required" }, { status: 400 })
    }

    if (!process.env.OPENAI_API_KEY) {
      console.error("[GenerateLetter] Missing OPENAI_API_KEY")
      return NextResponse.json({ error: "Server configuration error" }, { status: 500 })
    }

    // 4. Create letter record with 'generating' status
    const { data: newLetter, error: insertError } = await supabase
      .from("letters")
      .insert({
        user_id: user.id,
        letter_type: letterType,
        title: `${letterType} - ${new Date().toLocaleDateString()}`,
        intake_data: intakeData,
        status: "generating",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (insertError) {
      console.error("[GenerateLetter] Database insert error:", insertError)
      return NextResponse.json({ error: "Failed to create letter record" }, { status: 500 })
    }

    try {
      // 5. Generate letter using AI SDK with OpenAI
      const prompt = buildPrompt(letterType, intakeData)

      const { text: generatedContent } = await generateText({
        model: openai("gpt-4-turbo"),
        system: "You are a professional legal attorney drafting formal legal letters. Always produce professional, legally sound content with proper formatting.",
        prompt,
        temperature: 0.7,
        maxTokens: 2048,
      })

      if (!generatedContent) {
        console.error("[GenerateLetter] AI returned empty content")
        throw new Error("AI returned empty content")
      }

      // 6. Update letter with generated content and move to pending_review
      const { error: updateError } = await supabase
        .from("letters")
        .update({
          ai_draft_content: generatedContent,
          status: "pending_review",
          updated_at: new Date().toISOString(),
        })
        .eq("id", newLetter.id)

      if (updateError) {
        console.error("[GenerateLetter] Failed to update letter with content:", updateError)
        throw updateError
      }

      // 7. Deduct allowance once we've successfully generated the letter (skip for free trial)
      if (!isFreeTrial) {
        const { data: canDeduct, error: deductError } = await supabase.rpc("deduct_letter_allowance", {
          u_id: user.id,
        })

        if (deductError || !canDeduct) {
          // Mark as failed instead of deleting
          await supabase
            .from("letters")
            .update({ status: "failed", updated_at: new Date().toISOString() })
            .eq("id", newLetter.id)
          
          return NextResponse.json(
            {
              error: "No letter allowances remaining. Please upgrade your plan.",
              needsSubscription: true,
            },
            { status: 403 },
          )
        }
      }

      // 8. Log audit trail for letter creation
      await supabase.rpc('log_letter_audit', {
        p_letter_id: newLetter.id,
        p_action: 'created',
        p_old_status: 'generating',
        p_new_status: 'pending_review',
        p_notes: 'Letter generated successfully by AI'
      })

      return NextResponse.json(
        {
          success: true,
          letterId: newLetter.id,
          status: "pending_review",
          isFreeTrial,
          aiDraft: generatedContent,
        },
        { status: 200 },
      )
    } catch (generationError: any) {
      console.error("[GenerateLetter] Generation failed:", generationError)
      
      // Update letter status to failed
      await supabase
        .from("letters")
        .update({ 
          status: "failed",
          updated_at: new Date().toISOString()
        })
        .eq("id", newLetter.id)
      
      // Log audit trail for failure
      await supabase.rpc('log_letter_audit', {
        p_letter_id: newLetter.id,
        p_action: 'generation_failed',
        p_old_status: 'generating',
        p_new_status: 'failed',
        p_notes: `Generation failed: ${generationError.message}`
      })
      
      return NextResponse.json(
        { error: generationError.message || "AI generation failed" },
        { status: 500 }
      )
    }
  } catch (error: any) {
    console.error("[GenerateLetter] Letter generation error:", error)
    return NextResponse.json({ error: error.message || "Failed to generate letter" }, { status: 500 })
  }
}

function buildPrompt(letterType: string, intakeData: Record<string, unknown>) {
  const fields = (key: string) => `${key.replace(/_/g, " ")}: ${String(intakeData[key] ?? "")}`
  const amountField = intakeData["amountDemanded"] ? `Amount: $${intakeData["amountDemanded"]}` : ""

  return [
    `Draft a professional ${letterType} letter with the following details:`,
    "",
    fields("senderName"),
    fields("senderAddress"),
    fields("recipientName"),
    fields("recipientAddress"),
    fields("issueDescription"),
    fields("desiredOutcome"),
    amountField,
    "",
    "Requirements:",
    "- Write a professional, legally sound letter (300-500 words)",
    "- Include proper date and addresses",
    "- Present facts clearly",
    "- State clear demands with deadlines",
    "- Maintain professional legal tone throughout",
    "- Format as a complete letter with proper structure",
    "",
    "Return only the letter content, no additional commentary or explanations."
  ]
    .filter(Boolean)
    .join("\n")
}
