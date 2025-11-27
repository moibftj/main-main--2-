'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from './ui/button'
import { Input } from './ui/input'

const PLANS = [
  {
    id: 'one_time',
    name: 'Single Letter',
    price: 299,
    credits: 1,
    description: 'One-time purchase',
    features: ['1 Legal Letter', 'Attorney Review', 'PDF Download', 'Email Delivery']
  },
  {
    id: 'standard_4_month',
    name: 'Monthly Plan',
    price: 299,
    credits: 4,
    description: '4 letters per month',
    features: ['4 Legal Letters per month', 'Attorney Review', 'Priority Support', 'Monthly billing'],
    popular: true
  },
  {
    id: 'premium_8_month',
    name: 'Yearly Plan',
    price: 599,
    credits: 8,
    description: '8 letters per year',
    features: ['8 Legal Letters per year', 'Attorney Review', 'Priority Support', 'Annual billing (Save $1988)', 'Best Value']
  }
]

export function SubscriptionCard() {
  const [selectedPlan, setSelectedPlan] = useState('standard_4_month')
  const [couponCode, setCouponCode] = useState('')
  const [couponApplied, setCouponApplied] = useState(false)
  const [discount, setDiscount] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()

  useState(() => {
    const urlCoupon = searchParams.get('coupon')
    if (urlCoupon) {
      setCouponCode(urlCoupon)
      handleApplyCoupon(urlCoupon)
    }
  })

  const handleApplyCoupon = async (code?: string) => {
    const coupon = code || couponCode
    if (!coupon) return

    setLoading(true)
    setError(null)

    try {
      // Check employee coupons (supports special characters)
      const { data, error } = await supabase
        .from('employee_coupons')
        .select('*')
        .eq('code', coupon)
        .eq('is_active', true)
        .single()

      if (error || !data) {
        setError('Invalid coupon code')
        setCouponApplied(false)
        setDiscount(0)
        return
      }

      const plan = PLANS.find(p => p.id === selectedPlan)
      if (plan) {
        const discountAmount = (plan.price * data.discount_percent) / 100
        setDiscount(discountAmount)
        setCouponApplied(true)
        setError(null)
      }
    } catch (err) {
      setError('Failed to apply coupon')
      setCouponApplied(false)
    } finally {
      setLoading(false)
    }
  }

  const handleSubscribe = async () => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planType: selectedPlan,
          couponCode: couponApplied ? couponCode : null
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to create subscription')
      }

      const data = await response.json()

      // If Stripe checkout URL is returned, redirect to it
      if (data.url) {
        window.location.href = data.url
        return
      }

      // For free subscriptions (100% discount), redirect to success page
      router.push('/dashboard/subscription?success=true')
      router.refresh()
    } catch (err: any) {
      setError(err.message || 'Failed to create subscription')
    } finally {
      setLoading(false)
    }
  }

  const selectedPlanData = PLANS.find(p => p.id === selectedPlan)
  const finalPrice = selectedPlanData ? selectedPlanData.price - discount : 0

  return (
    <div className="space-y-8">
      <div className="grid md:grid-cols-3 gap-6">
        {PLANS.map((plan) => (
          <button
            key={plan.id}
            onClick={() => setSelectedPlan(plan.id)}
            className={`text-left p-6 rounded-lg border-2 transition-all ${
              selectedPlan === plan.id
                ? 'border-blue-600 bg-blue-50'
                : 'border-slate-200 bg-white hover:border-blue-300'
            } ${plan.popular ? 'ring-2 ring-blue-600' : ''}`}
          >
            {plan.popular && (
              <div className="inline-block px-3 py-1 text-xs font-semibold bg-blue-600 text-white rounded-full mb-2">
                Most Popular
              </div>
            )}
            <h3 className="text-xl font-semibold mb-2">{plan.name}</h3>
            <div className="text-3xl font-bold mb-1">${plan.price}</div>
            <div className="text-sm font-medium text-blue-600 mb-2">{plan.credits} {plan.credits === 1 ? 'Letter' : 'Letters'}</div>
            <p className="text-sm text-slate-600 mb-4">{plan.description}</p>
            <ul className="space-y-2">
              {plan.features.map((feature, idx) => (
                <li key={idx} className="flex items-start gap-2 text-sm">
                  <svg className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
          </button>
        ))}
      </div>

      {/* Coupon Code */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="flex gap-4">
          <div className="flex-1">
            <Input
              placeholder="Enter coupon code"
              value={couponCode}
              onChange={(e) => setCouponCode(e.target.value)}
              disabled={couponApplied}
            />
          </div>
          <Button
            onClick={() => handleApplyCoupon()}
            disabled={loading || !couponCode || couponApplied}
            variant="outline"
          >
            {couponApplied ? 'Applied' : 'Apply'}
          </Button>
        </div>
        {couponApplied && (
          <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-800">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Coupon applied! You save ${discount.toFixed(2)}
            </div>
          </div>
        )}
        {error && (
          <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800">
            {error}
          </div>
        )}
      </div>

      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h3 className="font-semibold mb-4">Order Summary</h3>
        <div className="space-y-2 text-sm mb-4">
          <div className="flex justify-between">
            <span>Selected Plan</span>
            <span className="font-medium">{selectedPlanData?.name}</span>
          </div>
          <div className="flex justify-between">
            <span>Credits Included</span>
            <span className="font-medium text-blue-600">{selectedPlanData?.credits} {selectedPlanData?.credits === 1 ? 'Letter' : 'Letters'}</span>
          </div>
          <div className="flex justify-between">
            <span>Plan Price</span>
            <span className="font-medium">${selectedPlanData?.price}</span>
          </div>
          {discount > 0 && (
            <div className="flex justify-between text-green-600">
              <span>Discount</span>
              <span className="font-medium">-${discount.toFixed(2)}</span>
            </div>
          )}
          <div className="flex justify-between text-lg font-bold pt-2 border-t">
            <span>Total</span>
            <span>${finalPrice.toFixed(2)}</span>
          </div>
        </div>
        <Button onClick={handleSubscribe} disabled={loading} className="w-full" size="lg">
          {loading ? 'Processing...' : 'Subscribe Now'}
        </Button>
        <p className="text-xs text-slate-500 text-center mt-3">
          By subscribing, you agree to our terms of service
        </p>
      </div>
    </div>
  )
}
