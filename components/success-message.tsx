'use client'

import { useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'

export default function SuccessMessage() {
  const searchParams = useSearchParams()
  const [message, setMessage] = useState<string | null>(null)
  const [type, setType] = useState<'success' | 'test' | 'talk3'>('success')

  useEffect(() => {
    const success = searchParams.get('success')
    const test = searchParams.get('test')
    const talk3 = searchParams.get('talk3')

    if (success === 'true') {
      if (talk3 === 'true') {
        setMessage('🎉 TALK3 coupon applied! Your free subscription is now active.')
        setType('talk3')
      } else if (test === 'true') {
        setMessage('✅ TEST MODE: Subscription created successfully! (This is a test transaction)')
        setType('test')
      } else {
        setMessage('🎉 Payment successful! Your subscription is now active.')
        setType('success')
      }

      // Clean up the URL after 3 seconds
      const timer = setTimeout(() => {
        const url = new URL(window.location.href)
        url.searchParams.delete('success')
        url.searchParams.delete('test')
        url.searchParams.delete('talk3')
        window.history.replaceState({}, '', url.toString())
      }, 3000)

      return () => clearTimeout(timer)
    }

    return undefined
  }, [searchParams])

  if (!message) return null

  const bgColor = type === 'talk3'
    ? 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white'
    : type === 'test'
    ? 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white'
    : 'bg-gradient-to-r from-green-500 to-emerald-500 text-white'

  return (
    <div className={`${bgColor} rounded-lg shadow-lg p-6 mb-6 animate-in slide-in-from-top-2`}>
      <div className="flex items-center">
        <div className="flex-shrink-0">
          <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <div className="ml-3">
          <p className="text-sm font-medium">{message}</p>
          {type === 'test' && (
            <p className="text-xs opacity-90 mt-1">No actual payment was processed</p>
          )}
        </div>
      </div>
    </div>
  )
}