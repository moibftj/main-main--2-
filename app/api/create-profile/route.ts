import { createClient } from "@supabase/supabase-js"
import { createClient as createServerClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { createRateLimit } from "@/lib/rate-limit"

// Rate limiting for profile creation
const rateLimiter = createRateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 5, // 5 attempts per window
  message: "Too many profile creation attempts. Please try again later.",
})

export async function POST(request: Request) {
  try {
    // Apply rate limiting
    const rateLimitResult = await rateLimiter(request)
    if (rateLimitResult instanceof Response) {
      return rateLimitResult // Rate limit exceeded
    }

    // Verify user is authenticated
    const supabase = await createServerClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      console.error('[CreateProfile] Authentication error:', authError)
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    // Parse and validate input
    const body = await request.json()
    const { email, role, fullName } = body

    // Ensure the userId from the request matches the authenticated user
    if (body.userId && body.userId !== user.id) {
      console.error('[CreateProfile] User ID mismatch:', {
        requestUserId: body.userId,
        authenticatedUserId: user.id
      })
      return NextResponse.json(
        { error: "Unauthorized: Cannot create profile for another user" },
        { status: 403 }
      )
    }

    // Validate required fields
    if (!email || !role || !fullName) {
      return NextResponse.json(
        { error: "Missing required fields: email, role, fullName" },
        { status: 400 }
      )
    }

    // Validate role
    if (!['subscriber', 'employee', 'admin'].includes(role)) {
      return NextResponse.json(
        { error: "Invalid role. Must be subscriber, employee, or admin" },
        { status: 400 }
      )
    }

    // Use service role client for profile creation (elevated permissions)
    const serviceClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { data: profileData, error: profileError } = await serviceClient
      .from('profiles')
      .upsert({
        id: user.id,
        email: email.toLowerCase().trim(),
        role: role,
        full_name: fullName.trim()
      }, {
        onConflict: 'id',
        ignoreDuplicates: false
      })
      .select()
      .single()

    if (profileError) {
      console.error('[CreateProfile] Profile creation error:', profileError)
      return NextResponse.json(
        { error: "Failed to create profile" },
        { status: 500 }
      )
    }

    // If employee role, create coupon automatically
    if (role === 'employee') {
      const { error: couponError } = await serviceClient
        .from('employee_coupons')
        .insert({
          employee_id: user.id,
          code: `EMP${user.id.slice(0, 8).toUpperCase()}`,
          discount_percent: 20,
          is_active: true
        })

      if (couponError) {
        console.error('[CreateProfile] Employee coupon creation error:', couponError)
        // Don't fail the request, but log the error
      }
    }

    console.log('[CreateProfile] Profile created successfully', {
      userId: user.id,
      email,
      role
    })

    return NextResponse.json({
      success: true,
      profile: profileData,
      message: "Profile created successfully"
    })

  } catch (error: any) {
    console.error('[CreateProfile] Unexpected error:', error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}