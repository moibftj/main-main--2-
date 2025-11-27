import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import OpenAI from 'https://deno.land/x/openai@v4.24.0/mod.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': 'https://www.talk-to-my-lawyers.com',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      status: 200,
      headers: corsHeaders
    })
  }

  try {
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY')
    if (!openaiApiKey) {
      throw new Error('OPENAI_API_KEY not configured')
    }

    const { letterType, formData, prompt } = await req.json()

    const systemPrompt = `You are a professional legal letter writer. Generate a formal, professional legal letter based on the provided information. The letter should be:
- Formal and professional in tone
- Legally sound and appropriate
- Clear and direct
- Properly formatted with proper salutations and closings
- Specific to the letter type requested

Letter Type: ${letterType || 'Professional Legal Letter'}

Format the response as a complete letter ready to send.`

    const openai = new OpenAI({
      apiKey: openaiApiKey,
    })

    const completion = await openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [
        {
          role: 'system',
          content: systemPrompt
        },
        {
          role: 'user',
          content: prompt || JSON.stringify(formData)
        }
      ],
      temperature: 0.7,
      max_tokens: 2000,
    })

    const generatedLetter = completion.choices[0]?.message?.content

    if (!generatedLetter) {
      throw new Error('No content generated from OpenAI')
    }

    return new Response(
      JSON.stringify({
        success: true,
        content: generatedLetter,
        model: 'gpt-4-turbo-preview',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )

  } catch (error) {
    console.error('Error:', error)
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'An error occurred generating the letter',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})
