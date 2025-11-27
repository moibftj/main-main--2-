import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireSuperAdminAuth, getAdminSession } from '@/lib/auth/admin-session';

export async function POST(request: NextRequest) {
  try {
    // Verify super admin authentication
    const authError = await requireSuperAdminAuth();
    if (authError) return authError;

    const supabase = await createClient();
    const adminSession = await getAdminSession();

    const body = await request.json();
    const { userId, isSuperUser } = body;

    if (!userId || typeof isSuperUser !== 'boolean') {
      return NextResponse.json(
        { error: "Missing userId or isSuperUser" },
        { status: 400 }
      );
    }

    // Prevent self-modification
    if (userId === adminSession?.userId) {
      return NextResponse.json(
        { error: "Cannot modify your own super admin status" },
        { status: 403 }
      );
    }

    // If revoking super admin status, check if this is the last one
    if (!isSuperUser) {
      const { count } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('is_super_user', true);

      if ((count || 0) <= 1) {
        return NextResponse.json(
          { error: "Cannot revoke super admin status from the last super admin. Promote another admin first." },
          { status: 400 }
        );
      }
    }

    // Update super user status
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ is_super_user: isSuperUser })
      .eq('id', userId);

    if (updateError) {
      console.error('[SuperUser] Update error:', updateError);
      return NextResponse.json(
        { error: "Failed to update super user status" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: `User ${isSuperUser ? 'granted' : 'revoked'} super user status`,
      userId,
      isSuperUser
    });

  } catch (error) {
    console.error('[SuperUser] Error:', error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    // Verify super admin authentication
    const authError = await requireSuperAdminAuth();
    if (authError) return authError;

    const supabase = await createClient();

    // Get all super users
    const { data: superUsers, error } = await supabase
      .from('profiles')
      .select('id, email, full_name, is_super_user')
      .eq('is_super_user', true);

    if (error) {
      console.error('[SuperUser] Query error:', error);
      return NextResponse.json(
        { error: "Failed to fetch super users" },
        { status: 500 }
      );
    }

    return NextResponse.json({ superUsers });

  } catch (error) {
    console.error('[SuperUser] Error:', error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
