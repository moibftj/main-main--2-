import { createClient } from "@/lib/supabase/server"
import { openai } from "@ai-sdk/openai"
import { generateText } from "ai"
import { NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Authentication check
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Role check - must be admin
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single()

    if (profile?.role !== "admin") {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 })
    }

    const body = await request.json()
    const { letterId, content } = body

    if (!letterId || !content) {
      return NextResponse.json(
        { error: "Letter ID and content are required" },
        { status: 400 }
      )
    }

    // Fetch letter details for context
    const { data: letter, error: letterError } = await supabase
      .from("letters")
      .select("title, letter_type, intake_data")
      .eq("id", letterId)
      .single()

    if (letterError || !letter) {
      return NextResponse.json({ error: "Letter not found" }, { status: 404 })
    }

    // Improve letter content with AI
    const { text: improvedContent } = await generateText({
      model: openai("gpt-4-turbo"),
      system: `You are a professional legal editor. Your task is to improve legal letters while maintaining their core message and legal integrity.

      Your improvements should:
      - Enhance clarity and professionalism
      - Strengthen legal arguments where appropriate
      - Improve organization and flow
      - Fix any grammatical or stylistic issues
      - Ensure proper legal letter format
      - Add appropriate legal language and terminology
      - Maintain the original intent and factual claims

      Do NOT:
      - Change the fundamental legal claims
      - Add new facts or allegations not in the original
      - Make promises about legal outcomes
      - Change the letter type or purpose

      Return ONLY the improved letter content, no additional commentary.`,
      prompt: `Please improve the following legal letter:\n\nLetter Title: ${letter.title}\nLetter Type: ${letter.letter_type}\nContext: ${JSON.stringify(letter.intake_data || {})}\n\nCurrent Content:\n${content}\n\nImproved version:`,
      temperature: 0.3,
      maxOutputTokens: 4000,
    })

    return NextResponse.json({
      success: true,
      improvedContent
    })

  } catch (error: any) {
    console.error("[Letter Improve] Error:", error)
    return NextResponse.json(
      { error: error.message || "Failed to improve letter" },
      { status: 500 }
    )
  }
}