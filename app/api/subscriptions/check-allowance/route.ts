import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Call check_letter_allowance function
    const { data, error } = await supabase
      .rpc('check_letter_allowance', { u_id: user.id })
      .single();

    if (error) {
      console.error('[CheckAllowance] RPC error:', error);
      return NextResponse.json(
        { error: "Failed to check allowance" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      hasAllowance: data.has_allowance,
      remaining: data.remaining,
      plan: data.plan_name,
      isSuper: data.is_super
    });

  } catch (error) {
    console.error('[CheckAllowance] Error:', error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
