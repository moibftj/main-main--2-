import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  try {
    // Verify admin or cron authorization
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;
    
    if (authHeader !== `Bearer ${cronSecret}`) {
      const supabase = await createClient();
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError || !user) {
        return NextResponse.json(
          { error: "Unauthorized" },
          { status: 401 }
        );
      }

      // Check if user is admin
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      if (profile?.role !== 'admin') {
        return NextResponse.json(
          { error: "Admin access required" },
          { status: 403 }
        );
      }
    }

    // Call reset_monthly_allowances function
    const supabase = await createClient();
    const { error } = await supabase.rpc('reset_monthly_allowances');

    if (error) {
      console.error('[ResetMonthly] RPC error:', error);
      return NextResponse.json(
        { error: "Failed to reset allowances" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: "Monthly allowances reset successfully"
    });

  } catch (error) {
    console.error('[ResetMonthly] Error:', error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
