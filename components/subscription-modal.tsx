'use client'

import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'

interface SubscriptionModalProps {
  show: boolean
  onClose: () => void
  message?: string
}

export function SubscriptionModal({ show, onClose, message }: SubscriptionModalProps) {
  const router = useRouter()

  if (!show) return null

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-card border rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 space-y-6">
          <div className="text-center">
            <h2 className="text-2xl font-bold mb-2">Subscription Required</h2>
            <p className="text-muted-foreground">
              {message || 'Continue with attorney review and approval by choosing a subscription plan'}
            </p>
          </div>

          <div className="grid gap-4">
            <div className="border rounded-lg p-4 hover:border-primary/50 transition-colors">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h3 className="font-semibold text-lg">Single Letter</h3>
                  <p className="text-sm text-muted-foreground">One-time attorney review</p>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold">$299</div>
                  <div className="text-xs text-muted-foreground">one-time</div>
                </div>
              </div>
              <ul className="space-y-2 text-sm mb-4">
                <li className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-success" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  1 Legal Letter
                </li>
                <li className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-success" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Attorney Review & Approval
                </li>
                <li className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-success" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Email Delivery
                </li>
              </ul>
              <Button
                className="w-full"
                onClick={() => router.push('/dashboard/subscription?plan=one_time')}
              >
                Choose Single Letter
              </Button>
            </div>

            <div className="border-2 border-primary rounded-lg p-4 bg-primary/5 relative">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground px-3 py-1 rounded-full text-xs font-semibold">
                Most Popular
              </div>
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h3 className="font-semibold text-lg">Monthly Plan</h3>
                  <p className="text-sm text-muted-foreground">4 letters per month</p>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold">$299</div>
                  <div className="text-xs text-muted-foreground">per month</div>
                </div>
              </div>
              <ul className="space-y-2 text-sm mb-4">
                <li className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-success" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  4 Legal Letters per Month
                </li>
                <li className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-success" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Attorney Review & Approval
                </li>
                <li className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-success" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Email Delivery
                </li>
                <li className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-success" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Monthly Billing
                </li>
              </ul>
              <Button
                className="w-full"
                onClick={() => router.push('/dashboard/subscription?plan=standard_4_month')}
              >
                Choose Monthly Plan
              </Button>
            </div>

            <div className="border rounded-lg p-4 hover:border-primary/50 transition-colors">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h3 className="font-semibold text-lg">Yearly Plan</h3>
                  <p className="text-sm text-muted-foreground">8 letters per year</p>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold">$599</div>
                  <div className="text-xs text-muted-foreground">per year</div>
                </div>
              </div>
              <ul className="space-y-2 text-sm mb-4">
                <li className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-success" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  8 Legal Letters per Year
                </li>
                <li className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-success" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Attorney Review & Approval
                </li>
                <li className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-success" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Email Delivery
                </li>
                <li className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-success" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Best Value
                </li>
              </ul>
              <Button
                className="w-full"
                onClick={() => router.push('/dashboard/subscription?plan=premium_8_month')}
              >
                Choose Yearly Plan
              </Button>
            </div>
          </div>

          <div className="flex justify-center pt-4 border-t">
            <Button variant="ghost" onClick={onClose}>
              Cancel
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
