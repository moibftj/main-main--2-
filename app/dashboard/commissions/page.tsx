import { getUser } from '@/lib/auth/get-user'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { DashboardLayout } from '@/components/dashboard-layout'
import { format } from 'date-fns'

export default async function CommissionsPage() {
  const { profile } = await getUser()
  
  if (profile.role !== 'employee' && profile.role !== 'admin') {
    redirect('/dashboard/letters')
  }

  const supabase = await createClient()
  
  // Get commission records
  const { data: commissions } = await supabase
    .from('commissions')
    .select(`
      *,
      subscriptions!inner (
        user_id,
        plan,
        price
      )
    `)
    .eq('employee_id', profile.id)
    .order('created_at', { ascending: false })

  // Calculate stats
  const totalEarned = commissions?.reduce((sum, c) => sum + Number(c.commission_amount), 0) || 0
  const pendingAmount = commissions?.filter(c => c.status === 'pending').reduce((sum, c) => sum + Number(c.commission_amount), 0) || 0
  const paidAmount = commissions?.filter(c => c.status === 'paid').reduce((sum, c) => sum + Number(c.commission_amount), 0) || 0
  
  const thisMonth = commissions?.filter(c => {
    const date = new Date(c.created_at)
    const now = new Date()
    return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear()
  }).reduce((sum, c) => sum + Number(c.commission_amount), 0) || 0

  return (
    <DashboardLayout>
      <h1 className="text-3xl font-bold text-foreground mb-8">Commission Dashboard</h1>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-card p-6 rounded-lg shadow-sm border">
          <div className="text-sm font-medium text-muted-foreground mb-2">Total Earned</div>
          <div className="text-3xl font-bold text-foreground">${totalEarned.toFixed(2)}</div>
        </div>
        <div className="bg-card p-6 rounded-lg shadow-sm border">
          <div className="text-sm font-medium text-muted-foreground mb-2">This Month</div>
          <div className="text-3xl font-bold text-primary">${thisMonth.toFixed(2)}</div>
        </div>
        <div className="bg-card p-6 rounded-lg shadow-sm border">
          <div className="text-sm font-medium text-muted-foreground mb-2">Pending</div>
          <div className="text-3xl font-bold text-warning">${pendingAmount.toFixed(2)}</div>
        </div>
        <div className="bg-card p-6 rounded-lg shadow-sm border">
          <div className="text-sm font-medium text-muted-foreground mb-2">Paid Out</div>
          <div className="text-3xl font-bold text-success">${paidAmount.toFixed(2)}</div>
        </div>
      </div>

      {/* Commission History */}
      <div className="bg-card shadow-sm rounded-lg overflow-hidden border">
        <div className="px-6 py-4 border-b">
          <h2 className="text-xl font-semibold">Commission History</h2>
        </div>
        {commissions && commissions.length > 0 ? (
          <table className="min-w-full divide-y divide-border">
            <thead className="bg-muted">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Subscription Plan
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Subscription Amount
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Commission (5%)
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="bg-card divide-y divide-border">
              {commissions.map((commission) => (
                <tr key={commission.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                    {format(new Date(commission.created_at), 'MMM d, yyyy')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground">
                    {commission.subscriptions?.plan || 'N/A'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground">
                    ${Number(commission.subscription_amount).toFixed(2)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-success">
                    ${Number(commission.commission_amount).toFixed(2)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      commission.status === 'paid' ? 'bg-success/10 text-success' : 'bg-warning/10 text-warning'
                    }`}>
                      {commission.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="p-8 text-center text-muted-foreground">
            No commissions yet. Share your coupon code to start earning!
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
