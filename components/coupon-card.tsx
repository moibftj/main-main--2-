'use client'

import { useState } from 'react'
import { Button } from './ui/button'
import type { EmployeeCoupon } from '@/lib/database.types'

export function CouponCard({ coupon }: { coupon: EmployeeCoupon }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    navigator.clipboard.writeText(coupon.code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const shareUrl = `${window.location.origin}/auth/signup?coupon=${coupon.code}`

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: 'Get 20% off Talk-To-My-Lawyer',
        text: `Use my coupon code ${coupon.code} to get 20% off your subscription to Talk-To-My-Lawyer!`,
        url: shareUrl
      })
    } else {
      navigator.clipboard.writeText(shareUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <div className="bg-white border-2 border-blue-200 rounded-lg p-6 hover:border-blue-300 transition-colors">
      <div className="flex justify-between items-start mb-4">
        <div>
          <div className="font-mono text-2xl font-bold text-blue-600 mb-1">{coupon.code}</div>
          <div className="text-sm text-slate-600">
            {coupon.discount_percent}% off subscription
          </div>
        </div>
        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
          coupon.is_active ? 'bg-green-100' : 'bg-slate-100'
        }`}>
          <svg className={`w-5 h-5 ${coupon.is_active ? 'text-green-600' : 'text-slate-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
      </div>

      <div className="space-y-2 mb-4">
        <div className="flex justify-between text-sm">
          <span className="text-slate-600">Used</span>
          <span className="font-semibold">{coupon.usage_count} times</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-slate-600">Commission per use</span>
          <span className="font-semibold text-green-600">5%</span>
        </div>
      </div>

      <div className="flex gap-2">
        <Button onClick={handleCopy} variant="outline" className="flex-1">
          {copied ? (
            <>
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Copied!
            </>
          ) : (
            <>
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              Copy Code
            </>
          )}
        </Button>
        <Button onClick={handleShare} className="flex-1">
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
          </svg>
          Share
        </Button>
      </div>

      <div className="mt-4 text-xs text-slate-500 text-center">
        Share this code to earn 5% commission on each subscription
      </div>
    </div>
  )
}
