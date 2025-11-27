import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { requireAdminAuth } from '@/lib/auth/admin-session'
import { openai } from '@ai-sdk/openai'
import { generateText } from 'ai'

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

    const body = await request.json()
    const { content, instruction } = body

    if (!content || !instruction) {
      return NextResponse.json({ error: 'Content and instruction are required' }, { status: 400 })
    }

    if (!process.env.OPENAI_API_KEY) {
      console.error('[v0] Missing OPENAI_API_KEY')
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
    }

    // Call OpenAI API for content improvement using AI SDK
    const prompt = buildImprovementPrompt(content, instruction)

    const { text: improvedContent } = await generateText({
      model: openai("gpt-4-turbo"),
      system: "You are a professional legal attorney improving formal legal letters. Always maintain professional legal tone and proper formatting.",
      prompt,
      temperature: 0.7,
      maxTokens: 2048,
    })

    if (!improvedContent) {
      console.error('[v0] OpenAI returned empty content')
      return NextResponse.json({ error: 'AI returned empty content' }, { status: 500 })
    }

    return NextResponse.json({ improvedContent }, { status: 200 })
  } catch (error: any) {
    console.error('[v0] Letter improvement error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to improve letter content' },
      { status: 500 }
    )
  }
}

function buildImprovementPrompt(content: string, instruction: string): string {
  return `You are a professional legal attorney improving a formal legal letter.

Current letter content:
${content}

Improvement instruction: ${instruction}

Please improve the letter according to the instruction while maintaining:
- Professional legal tone and language
- Proper letter structure and formatting
- All critical facts and details from the original
- Legal accuracy and effectiveness

Return ONLY the improved letter content, with no additional commentary or explanations.`
}
