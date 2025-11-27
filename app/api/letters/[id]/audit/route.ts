import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    // Verify user is admin or employee
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!profile || !['admin', 'employee'].includes(profile.role)) {
      return NextResponse.json(
        { error: "Admin or employee access required" },
        { status: 403 }
      );
    }

    const { id } = await params;

    // Get audit trail for the letter
    const { data: auditTrail, error } = await supabase
      .from('letter_audit_trail')
      .select(`
        *,
        performer:performed_by (
          id,
          email,
          full_name
        )
      `)
      .eq('letter_id', id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[AuditTrail] Query error:', error);
      return NextResponse.json(
        { error: "Failed to fetch audit trail" },
        { status: 500 }
      );
    }

    return NextResponse.json({ auditTrail });

  } catch (error) {
    console.error('[AuditTrail] Error:', error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
