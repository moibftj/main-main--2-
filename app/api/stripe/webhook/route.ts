import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import Stripe from 'stripe'

const stripe = process.env.STRIPE_SECRET_KEY ? new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2024-11-20.acacia',
}) : null

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET

// Use service role client for webhooks (no user session context)
function getSupabaseServiceClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseServiceRoleKey) {
    throw new Error('Missing Supabase service configuration')
  }

  return createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}

export async function POST(request: NextRequest) {
  if (!stripe || !webhookSecret) {
    console.error('[StripeWebhook] Stripe not configured')
    return NextResponse.json({ error: 'Webhook not configured' }, { status: 500 })
  }

  const body = await request.text()
  const sig = request.headers.get('stripe-signature')

  if (!sig) {
    console.error('[StripeWebhook] No signature')
    return NextResponse.json({ error: 'No signature' }, { status: 400 })
  }

  try {
    // Verify webhook signature
    const event = stripe.webhooks.constructEvent(body, sig, webhookSecret)
    console.log('[StripeWebhook] Event received:', event.type)

    const supabase = getSupabaseServiceClient()

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session

        // Verify session is paid
        if (session.payment_status !== 'paid') {
          console.log('[StripeWebhook] Payment not completed, skipping')
          return NextResponse.json({ received: true })
        }

        const metadata = session.metadata
        if (!metadata) {
          console.error('[StripeWebhook] No metadata in session')
          return NextResponse.json({ error: 'No metadata' }, { status: 400 })
        }

        const letters = parseInt(metadata.letters || '0')
        const finalPrice = parseFloat(metadata.final_price || '0')
        const basePrice = parseFloat(metadata.base_price || '0')
        const discount = parseFloat(metadata.discount || '0')
        const couponCode = metadata.coupon_code || null
        const employeeId = metadata.employee_id || null
        const isSuperUserCoupon = metadata.is_super_user_coupon === 'true'

        // Update subscription status to active and set credits
        const { data: subscription, error: updateError } = await supabase
          .from('subscriptions')
          .update({
            status: 'active',
            credits_remaining: letters,
            remaining_letters: letters,
            stripe_session_id: session.id,
            stripe_customer_id: session.customer as string,
            updated_at: new Date().toISOString()
          })
          .eq('user_id', metadata.user_id)
          .eq('status', 'pending')
          .select()
          .single()

        if (updateError) {
          console.error('[StripeWebhook] Failed to update subscription:', updateError)
        }

        // Mark user as super user if applicable
        if (isSuperUserCoupon) {
          await supabase
            .from('profiles')
            .update({ is_super_user: true })
            .eq('id', metadata.user_id)
        }

        // Record coupon usage
        if (couponCode && subscription) {
          const couponUsageData = {
            user_id: metadata.user_id,
            coupon_code: couponCode,
            employee_id: employeeId,
            subscription_id: subscription.id,
            plan_type: metadata.plan_type || 'unknown',
            discount_percent: basePrice > 0 ? Math.round((discount / basePrice) * 100) : 0,
            amount_before: basePrice,
            amount_after: finalPrice
          }

          console.log('[StripeWebhook] Recording coupon usage:', couponUsageData)

          const { error: usageError } = await supabase
            .from('coupon_usage')
            .insert(couponUsageData)

          if (usageError) {
            console.error('[StripeWebhook] Failed to record coupon usage:', usageError)
            // Don't fail the webhook, but log for monitoring
          } else {
            console.log('[StripeWebhook] Coupon usage recorded successfully for code:', couponCode)
          }
        }

        // Create commission if employee referral (and not a super user coupon with 0 payment)
        if (employeeId && subscription && finalPrice > 0 && !isSuperUserCoupon) {
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
            console.error('[StripeWebhook] Failed to create commission:', commissionError)
          } else {
            console.log(`[StripeWebhook] Created commission: $${commissionAmount.toFixed(2)} for employee ${employeeId}`)
          }

          // Update employee coupon usage count (skip for special promo codes)
          if (couponCode && couponCode !== 'TALK3') {
            const { data: currentCoupon } = await supabase
              .from('employee_coupons')
              .select('usage_count, employee_id')
              .eq('code', couponCode)
              .maybeSingle()

            // Only update usage count if this coupon belongs to the referring employee
            if (currentCoupon && currentCoupon.employee_id === employeeId) {
              const { error: updateError } = await supabase
                .from('employee_coupons')
                .update({
                  usage_count: (currentCoupon.usage_count || 0) + 1,
                  updated_at: new Date().toISOString()
                })
                .eq('code', couponCode)

              if (updateError) {
                console.error('[StripeWebhook] Failed to update coupon usage count:', updateError)
              } else {
                console.log(`[StripeWebhook] Updated usage count for coupon ${couponCode}: ${(currentCoupon.usage_count || 0) + 1}`)
              }
            }
          }
        }

        console.log('[StripeWebhook] Payment completed for user:', metadata.user_id)
        break
      }

      case 'checkout.session.expired': {
        const session = event.data.object as Stripe.Checkout.Session
        const metadata = session.metadata

        if (metadata) {
          // Update subscription status to canceled
          await supabase
            .from('subscriptions')
            .update({
              status: 'canceled',
              updated_at: new Date().toISOString()
            })
            .eq('user_id', metadata.user_id)
            .eq('status', 'pending')

          console.log('[StripeWebhook] Checkout expired for user:', metadata.user_id)
        }
        break
      }

      case 'payment_intent.succeeded': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent
        console.log('[StripeWebhook] Payment succeeded:', paymentIntent.id)
        // Additional payment success handling if needed
        break
      }

      case 'payment_intent.payment_failed': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent
        console.log('[StripeWebhook] Payment failed:', paymentIntent.id)

        // Update any pending subscription to failed
        if (paymentIntent.metadata?.user_id) {
          await supabase
            .from('subscriptions')
            .update({
              status: 'payment_failed',
              updated_at: new Date().toISOString()
            })
            .eq('user_id', paymentIntent.metadata.user_id)
            .eq('status', 'pending')
        }
        break
      }

      default: {
        console.log(`[StripeWebhook] Unhandled event type: ${event.type}`)
      }
    }

    return NextResponse.json({ received: true })

  } catch (err: any) {
    console.error('[StripeWebhook] Error:', err.message)

    if (err.type === 'StripeSignatureVerificationError') {
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 401 }
      )
    }

    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 500 }
    )
  }
}