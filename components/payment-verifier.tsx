'use client'

import { useEffect, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'

export function PaymentVerifier() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [verifying, setVerifying] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const sessionId = searchParams.get('session_id')

    if (sessionId && !verifying) {
      verifyPayment(sessionId)
    }
  }, [searchParams])

  const verifyPayment = async (sessionId: string) => {
    setVerifying(true)
    setError(null)

    try {
      const response = await fetch('/api/verify-payment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ sessionId }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to verify payment')
      }

      // Payment verified successfully, redirect to clean URL
      router.replace('/dashboard/subscription?success=true')
      router.refresh()
    } catch (err: any) {
      console.error('Payment verification error:', err)
      setError(err.message || 'Failed to verify payment')
    } finally {
      setVerifying(false)
    }
  }

  if (!searchParams.get('session_id')) {
    return null
  }

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center">
      <div className="bg-card border rounded-lg p-8 max-w-md w-full mx-4">
        {verifying ? (
          <div className="text-center">
            <div className="mb-4">
              <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent"></div>
            </div>
            <h3 className="text-xl font-semibold mb-2">Verifying Payment</h3>
            <p className="text-muted-foreground">Please wait while we confirm your payment...</p>
          </div>
        ) : error ? (
          <div className="text-center">
            <div className="mb-4 text-destructive">
              <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold mb-2">Verification Failed</h3>
            <p className="text-muted-foreground mb-4">{error}</p>
            <button
              onClick={() => router.push('/dashboard/subscription')}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90"
            >
              Return to Subscription
            </button>
          </div>
        ) : null}
      </div>
    </div>
  )
}
