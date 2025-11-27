import { getUser } from '@/lib/auth/get-user'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { DashboardLayout } from '@/components/dashboard-layout'
import { CouponInsightsCard } from '@/components/coupon-insights-card'

export default async function CouponsPage() {
  const { profile } = await getUser()
  
  if (profile.role !== 'employee' && profile.role !== 'admin') {
    redirect('/dashboard/letters')
  }

  const supabase = await createClient()
  
  const { data: coupon } = await supabase
    .from('employee_coupons')
    .select('*')
    .eq('employee_id', profile.id)
    .single()

  const { data: usageStats } = await supabase
    .from('coupon_usage')
    .select('*')
    .eq('employee_id', profile.id)

  const { data: commissions } = await supabase
    .from('commissions')
    .select('*')
    .eq('employee_id', profile.id)

  const totalRedemptions = usageStats?.length || 0
  const totalRevenue = usageStats?.reduce((sum, usage) => sum + Number(usage.amount_after || 0), 0) || 0
  const totalCommission = commissions?.reduce((sum, c) => sum + Number(c.commission_amount || 0), 0) || 0
  const totalPoints = commissions?.length || 0 // 1 point per commission

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-foreground mb-2">My Coupon Code</h1>
        <p className="text-muted-foreground mb-8">
          Share your unique code to earn commissions on every subscription
        </p>

        {coupon ? (
          <CouponInsightsCard
            coupon={coupon}
            totalRedemptions={totalRedemptions}
            totalRevenue={totalRevenue}
            totalCommission={totalCommission}
            totalPoints={totalPoints}
          />
        ) : (
          <div className="bg-card rounded-lg shadow-sm border p-12 text-center">
            <svg className="mx-auto h-12 w-12 text-muted-foreground mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
            </svg>
            <h3 className="text-lg font-medium text-foreground mb-2">No coupon assigned</h3>
            <p className="text-muted-foreground">Contact an administrator to get your coupon code.</p>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
