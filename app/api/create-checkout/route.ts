import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { subscriptionRateLimit, safeApplyRateLimit } from '@/lib/rate-limit-redis'

const stripe = process.env.STRIPE_SECRET_KEY ? new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2025-11-17.clover',
}) : null

const TEST_MODE = process.env.ENABLE_TEST_MODE === 'true'

export async function POST(request: NextRequest) {
  console.log('[Checkout] Request received, TEST_MODE:', TEST_MODE)

  try {
    // Apply rate limiting
    const rateLimitResponse = await safeApplyRateLimit(request, subscriptionRateLimit, 3, "1 h")
    if (rateLimitResponse) {
      return rateLimitResponse
    }

    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    console.log('[Checkout] Auth check - user:', user?.id, 'error:', authError?.message)
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { planType, couponCode } = body

    let discount = 0
    let employeeId = null
    let isSuperUserCoupon = false
    let couponId = null

    if (couponCode) {
      // Special handling for TALK3 coupon (100% discount, no database lookup, no commission)
      if (couponCode.toUpperCase() === 'TALK3') {
        discount = 100
        employeeId = null // No commission for TALK3
        isSuperUserCoupon = false // Not a super user coupon
        couponId = null
      } else {
        // Check employee coupons in database (including special promo codes)
        const { data: coupon } = await supabase
          .from('employee_coupons')
          .select('*')
          .eq('code', couponCode)
          .eq('is_active', true)
          .single()

        if (coupon) {
          discount = coupon.discount_percent
          employeeId = coupon.employee_id
          couponId = coupon.id

          // If 100% discount, mark as super user
          if (discount === 100) {
            isSuperUserCoupon = true
          }
        }
      }
    }

    const planConfig: Record<string, { price: number, letters: number, planType: string, name: string }> = {
      'one_time': { price: 299, letters: 1, planType: 'one_time', name: 'Single Letter' },
      'standard_4_month': { price: 299, letters: 4, planType: 'standard_4_month', name: 'Monthly Plan' },
      'premium_8_month': { price: 599, letters: 8, planType: 'premium_8_month', name: 'Yearly Plan' }
    }

    const selectedPlan = planConfig[planType]
    if (!selectedPlan) {
      return NextResponse.json({ error: 'Invalid plan type' }, { status: 400 })
    }

    const basePrice = selectedPlan.price
    const discountAmount = (basePrice * discount) / 100
    const finalPrice = basePrice - discountAmount

    // Special handling for TALK3 coupon with test mode
    if (couponCode && couponCode.toUpperCase() === 'TALK3' && TEST_MODE) {
      console.log('[Checkout] TALK3 coupon in TEST MODE: Creating dummy subscription')

      // Create subscription directly as if payment succeeded
      const { data: subscription, error: subError } = await supabase
        .from('subscriptions')
        .insert({
          user_id: user.id,
          plan: planType,
          plan_type: planType,
          status: 'active',
          price: 0, // Free for TALK3
          discount: basePrice,
          coupon_code: 'TALK3',
          credits_remaining: selectedPlan.letters,
          remaining_letters: selectedPlan.letters,
          current_period_start: new Date().toISOString(),
          current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
        })
        .select()
        .single()

      if (subError) {
        console.error('[Checkout] TALK3 TEST MODE: Subscription creation error:', subError)
        throw new Error(`Failed to create subscription: ${subError.message}`)
      }

      // Track coupon usage for TALK3 (but no commission)
      await supabase
        .from('coupon_usage')
        .insert({
          user_id: user.id,
          coupon_code: 'TALK3',
          employee_id: null,
          discount_percent: 100,
          amount_before: basePrice,
          amount_after: 0
        })

      console.log('[Checkout] TALK3 TEST MODE: Dummy subscription created successfully')

      return NextResponse.json({
        success: true,
        testMode: true,
        talk3Coupon: true,
        subscriptionId: subscription.id,
        letters: selectedPlan.letters,
        message: 'TALK3 TEST MODE: Free subscription created successfully',
        redirectUrl: `/dashboard/subscription?success=true&test=true&talk3=true`
      })
    }

    // If 100% discount (non-TALK3), create subscription directly without payment
    if (finalPrice === 0) {
      const { data: subscription, error: subError } = await supabase
        .from('subscriptions')
        .insert({
          user_id: user.id,
          plan: planType,
          plan_type: planType,
          status: 'active',
          price: finalPrice,
          discount: discountAmount,
          coupon_code: couponCode || null,
          credits_remaining: selectedPlan.letters,
          remaining_letters: selectedPlan.letters,
          current_period_start: new Date().toISOString(),
          current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
        })
        .select()
        .single()

      if (subError) {
        console.error('[Checkout] Subscription creation error:', subError)
        throw new Error(`Failed to create subscription: ${subError.message}`)
      }

      if (isSuperUserCoupon) {
        const { error: profileError } = await supabase
          .from('profiles')
          .update({ is_super_user: true })
          .eq('id', user.id)

        if (profileError) {
          console.error('[Checkout] Profile update error:', profileError)
        }
      }

      if (couponCode) {
        const { error: usageError } = await supabase
          .from('coupon_usage')
          .insert({
            user_id: user.id,
            coupon_code: couponCode,
            employee_id: employeeId,
            discount_percent: discount,
            amount_before: basePrice,
            amount_after: finalPrice
          })

        if (usageError) {
          console.error('[Checkout] Coupon usage tracking error:', usageError)
          // Don't fail the checkout if usage tracking fails
        }
      }

      if (employeeId && subscription && !isSuperUserCoupon) {
        const commissionAmount = finalPrice * 0.05

        const { error: commissionError } = await supabase
          .from('commissions')
          .insert({
            employee_id: employeeId,
            subscription_id: subscription.id,
            subscription_amount: finalPrice,
            commission_rate: 0.05,
            commission_amount: commissionAmount,
            status: 'pending'
          })

        if (commissionError) {
          console.error('[Checkout] Commission creation error:', commissionError)
        }

        // Update coupon usage count
        const { data: currentCoupon } = await supabase
          .from('employee_coupons')
          .select('usage_count')
          .eq('code', couponCode)
          .maybeSingle()

        const { error: updateError } = await supabase
          .from('employee_coupons')
          .update({
            usage_count: (currentCoupon?.usage_count || 0) + 1,
            updated_at: new Date().toISOString()
          })
          .eq('code', couponCode)

        if (updateError) {
          console.error('[Checkout] Coupon update error:', updateError)
        }
      }

      return NextResponse.json({
        success: true,
        subscriptionId: subscription.id,
        letters: selectedPlan.letters,
        message: 'Subscription created successfully'
      })
    }

    // ===== TEST MODE: Simulate successful payment without Stripe =====
    if (TEST_MODE) {
      console.log('[Checkout] TEST MODE: Simulating payment for user:', user.id)
      
      // Create subscription directly as if payment succeeded
      const { data: subscription, error: subError } = await supabase
        .from('subscriptions')
        .insert({
          user_id: user.id,
          plan: planType,
          plan_type: planType,
          status: 'active',
          price: finalPrice,
          discount: discountAmount,
          coupon_code: couponCode || null,
          credits_remaining: selectedPlan.letters,
          remaining_letters: selectedPlan.letters,
          current_period_start: new Date().toISOString(),
          current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
        })
        .select()
        .single()

      if (subError) {
        console.error('[Checkout] TEST MODE: Subscription creation error:', subError)
        throw new Error(`Failed to create subscription: ${subError.message}`)
      }

      // Track coupon usage
      if (couponCode) {
        await supabase
          .from('coupon_usage')
          .insert({
            user_id: user.id,
            coupon_code: couponCode,
            employee_id: employeeId,
            discount_percent: discount,
            amount_before: basePrice,
            amount_after: finalPrice
          })
      }

      // Create commission if employee referral
      if (employeeId && subscription) {
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
          .maybeSingle()

        await supabase
          .from('employee_coupons')
          .update({
            usage_count: (currentCoupon?.usage_count || 0) + 1,
            updated_at: new Date().toISOString()
          })
          .eq('code', couponCode)
      }

      console.log('[Checkout] TEST MODE: Payment simulated successfully')
      
      return NextResponse.json({
        success: true,
        testMode: true,
        subscriptionId: subscription.id,
        letters: selectedPlan.letters,
        message: 'TEST MODE: Subscription created successfully (simulated payment)',
        redirectUrl: `/dashboard/subscription?success=true&test=true`
      })
    }

    // ===== PRODUCTION MODE: Use Stripe for real payments =====
    if (!stripe) {
      throw new Error('Stripe is not configured. Please set STRIPE_SECRET_KEY environment variable.')
    }

    // Create subscription record as 'pending' before payment
    const { data: pendingSubscription, error: subError } = await supabase
      .from('subscriptions')
      .insert({
        user_id: user.id,
        plan: planType,
        plan_type: planType,
        status: 'pending',
        price: finalPrice,
        discount: discountAmount,
        coupon_code: couponCode || null,
        credits_remaining: 0, // No credits until payment confirmed
        remaining_letters: 0,
        current_period_start: new Date().toISOString(),
        current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
      })
      .select()
      .single()

    if (subError) {
      console.error('[Checkout] Failed to create pending subscription:', subError)
      throw new Error(`Failed to create subscription: ${subError.message}`)
    }

    // Create Stripe Checkout Session for paid plans
    const origin = request.headers.get('origin') || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: selectedPlan.name,
              description: `${selectedPlan.letters} Legal ${selectedPlan.letters === 1 ? 'Letter' : 'Letters'}`,
            },
            unit_amount: Math.round(finalPrice * 100), // Convert to cents
          },
          quantity: 1,
        },
      ],
      success_url: `${origin}/dashboard/subscription?success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/dashboard/subscription?canceled=true`,
      client_reference_id: user.id,
      metadata: {
        user_id: user.id,
        subscription_id: pendingSubscription.id,
        plan_type: planType,
        letters: selectedPlan.letters.toString(),
        base_price: basePrice.toString(),
        discount: discountAmount.toString(),
        final_price: finalPrice.toString(),
        coupon_code: couponCode || '',
        employee_id: employeeId || '',
        is_super_user_coupon: isSuperUserCoupon.toString(),
        coupon_id: couponId || ''
      }
    })

    return NextResponse.json({
      sessionId: session.id,
      url: session.url
    })

  } catch (error: any) {
    console.error('[Checkout] Error:', error)
    return NextResponse.json(
      {
        error: 'Failed to create checkout',
        details: error.message || 'Unknown error'
      },
      { status: 500 }
    )
  }
}
