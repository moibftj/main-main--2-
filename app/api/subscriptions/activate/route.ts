import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
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

    const body = await request.json();
    const { subscriptionId, planType } = body;

    if (!subscriptionId || !planType) {
      return NextResponse.json(
        { error: "Missing subscriptionId or planType" },
        { status: 400 }
      );
    }

    // Verify subscription belongs to user
    const { data: subscription, error: subError } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('id', subscriptionId)
      .eq('user_id', user.id)
      .single();

    if (subError || !subscription) {
      return NextResponse.json(
        { error: "Subscription not found" },
        { status: 404 }
      );
    }

    // Call add_letter_allowances function
    const { error: rpcError } = await supabase
      .rpc('add_letter_allowances', {
        sub_id: subscriptionId,
        plan_name: planType
      });

    if (rpcError) {
      console.error('[ActivateSubscription] RPC error:', rpcError);
      return NextResponse.json(
        { error: "Failed to add allowances" },
        { status: 500 }
      );
    }

    // Update subscription status to active
    const { error: updateError } = await supabase
      .from('subscriptions')
      .update({ status: 'active', updated_at: new Date().toISOString() })
      .eq('id', subscriptionId);

    if (updateError) {
      console.error('[ActivateSubscription] Update error:', updateError);
      return NextResponse.json(
        { error: "Failed to activate subscription" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: "Subscription activated successfully",
      subscriptionId
    });

  } catch (error) {
    console.error('[ActivateSubscription] Error:', error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
