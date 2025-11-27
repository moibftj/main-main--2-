import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-01-27.acacia',
})

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  try {
    const { sessionId } = await request.json()

    if (!sessionId) {
      return NextResponse.json({ error: 'Session ID required' }, { status: 400 })
    }

    // Retrieve the session from Stripe
    const session = await stripe.checkout.sessions.retrieve(sessionId)

    if (session.payment_status !== 'paid') {
      return NextResponse.json({ error: 'Payment not completed' }, { status: 400 })
    }

    // Check if subscription already exists for this session
    const { data: existingSub } = await supabase
      .from('subscriptions')
      .select('id')
      .eq('stripe_session_id', sessionId)
      .single()

    if (existingSub) {
      return NextResponse.json({
        success: true,
        subscriptionId: existingSub.id,
        message: 'Subscription already created'
      })
    }

    const metadata = session.metadata!
    const userId = metadata.user_id
    const planType = metadata.plan_type
    const letters = parseInt(metadata.letters)
    const basePrice = parseFloat(metadata.base_price)
    const discount = parseFloat(metadata.discount)
    const finalPrice = parseFloat(metadata.final_price)
    const couponCode = metadata.coupon_code || null
    const employeeId = metadata.employee_id || null
    const isSuperUserCoupon = metadata.is_super_user_coupon === 'true'

    // Create subscription in database
    const { data: subscription, error: subError } = await supabase
      .from('subscriptions')
      .insert({
        user_id: userId,
        plan: planType,
        plan_type: planType,
        status: 'active',
        price: finalPrice,
        discount: discount,
        coupon_code: couponCode,
        remaining_letters: letters,
        credits_remaining: letters,
        last_reset_at: new Date().toISOString(),
        current_period_start: new Date().toISOString(),
        current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        stripe_session_id: sessionId
      })
      .select()
      .single()

    if (subError) {
      console.error('Error creating subscription:', subError)
      throw subError
    }

    // Mark user as super user if applicable
    if (isSuperUserCoupon) {
      await supabase
        .from('profiles')
        .update({ is_super_user: true })
        .eq('id', userId)
    }

    // Record coupon usage
    if (couponCode) {
      await supabase
        .from('coupon_usage')
        .insert({
          user_id: userId,
          coupon_code: couponCode,
          employee_id: employeeId,
          discount_percent: (discount / basePrice) * 100,
          amount_before: basePrice,
          amount_after: finalPrice
        })
    }

    // Create commission for employee
    if (employeeId && subscription && !isSuperUserCoupon) {
      const commissionAmount = finalPrice * 0.05

      await supabase
        .from('commissions')
        .insert({
          employee_id: employeeId,
          subscription_id: subscription.id,
          subscription_amount: finalPrice,
          commission_rate: 0.05,
          commission_amount: commissionAmount,
          status: 'pending'
        })

      // Update coupon usage count
      const { data: currentCoupon } = await supabase
        .from('employee_coupons')
        .select('usage_count')
        .eq('code', couponCode)
        .single()

      await supabase
        .from('employee_coupons')
        .update({
          usage_count: (currentCoupon?.usage_count || 0) + 1,
          updated_at: new Date().toISOString()
        })
        .eq('code', couponCode)
    }

    return NextResponse.json({
      success: true,
      subscriptionId: subscription.id,
      letters: letters,
      message: 'Subscription created successfully'
    })

  } catch (error) {
    console.error('[Verify Payment] Error:', error)
    return NextResponse.json(
      { error: 'Failed to verify payment' },
      { status: 500 }
    )
  }
}
