import { createClient } from "@supabase/supabase-js"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SERVICE_ROLE_KEY!
    )

    const { userId, email, role, fullName } = await request.json()

    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .upsert({
        id: userId,
        email: email,
        role: role,
        full_name: fullName
      }, {
        onConflict: 'id'
      })
      .select()
      .single()

    if (profileError) {
      console.error('Profile creation error:', profileError)
      return NextResponse.json({ error: profileError }, { status: 500 })
    }

    return NextResponse.json({ success: true, profile: profileData })
  } catch (error: any) {
    console.error('Unexpected error during profile creation:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}