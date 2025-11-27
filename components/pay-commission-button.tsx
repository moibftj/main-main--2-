'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from './ui/button'

export function PayCommissionButton({ commissionId }: { commissionId: string }) {
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const handlePay = async () => {
    if (!confirm('Mark this commission as paid?')) return
    
    setLoading(true)
    try {
      const { error } = await supabase
        .from('commissions')
        .update({ 
          status: 'paid',
          paid_at: new Date().toISOString()
        })
        .eq('id', commissionId)

      if (error) throw error

      router.refresh()
    } catch (error: any) {
      console.error('Error:', error)
      alert('Failed to update commission status')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button size="sm" onClick={handlePay} disabled={loading} className="bg-green-600 hover:bg-green-700">
      {loading ? 'Processing...' : 'Mark Paid'}
    </Button>
  )
}
