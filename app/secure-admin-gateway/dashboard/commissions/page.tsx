import { getUser } from '@/lib/auth/get-user'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { DashboardLayout } from '@/components/dashboard-layout'
import { format } from 'date-fns'
import { PayCommissionButton } from '@/components/pay-commission-button'

export default async function AdminCommissionsPage() {
  const { profile } = await getUser()
  
  if (profile.role !== 'admin') {
    redirect('/dashboard')
  }

  const supabase = await createClient()
  const { data: commissions } = await supabase
    .from('commissions')
    .select(`
      *,
      profiles!commissions_employee_id_fkey (
        full_name,
        email
      ),
      subscriptions!inner (
        plan,
        price
      )
    `)
    .order('created_at', { ascending: false })

  // Calculate stats
  const totalPending = commissions?.filter(c => c.status === 'pending').reduce((sum, c) => sum + Number(c.commission_amount), 0) || 0
  const totalPaid = commissions?.filter(c => c.status === 'paid').reduce((sum, c) => sum + Number(c.commission_amount), 0) || 0
  const pendingCount = commissions?.filter(c => c.status === 'pending').length || 0

  return (
    <DashboardLayout>
      <h1 className="text-3xl font-bold text-slate-900 mb-6">Commission Management</h1>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="text-sm font-medium text-slate-500 mb-2">Pending Payouts</div>
          <div className="text-3xl font-bold text-yellow-600">${totalPending.toFixed(2)}</div>
          <div className="text-xs text-slate-500 mt-1">{pendingCount} commissions</div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="text-sm font-medium text-slate-500 mb-2">Total Paid</div>
          <div className="text-3xl font-bold text-green-600">${totalPaid.toFixed(2)}</div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="text-sm font-medium text-slate-500 mb-2">Total Commissions</div>
          <div className="text-3xl font-bold text-slate-900">{commissions?.length || 0}</div>
        </div>
      </div>

      {/* Commissions Table */}
      <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center">
          <h2 className="text-lg font-semibold">All Commissions</h2>
        </div>
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                Employee
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                Date
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                Plan
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                Subscription
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                Commission
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-slate-200">
            {commissions?.map((commission) => (
              <tr key={commission.id} className="hover:bg-slate-50">
                <td className="px-6 py-4">
                  <div className="text-sm font-medium text-slate-900">{commission.profiles?.full_name}</div>
                  <div className="text-xs text-slate-500">{commission.profiles?.email}</div>
                </td>
                <td className="px-6 py-4 text-sm text-slate-500">
                  {format(new Date(commission.created_at), 'MMM d, yyyy')}
                </td>
                <td className="px-6 py-4 text-sm text-slate-900">
                  {commission.subscriptions?.plan || 'N/A'}
                </td>
                <td className="px-6 py-4 text-sm text-slate-900">
                  ${Number(commission.subscription_amount).toFixed(2)}
                </td>
                <td className="px-6 py-4 text-sm font-medium text-green-600">
                  ${Number(commission.commission_amount).toFixed(2)}
                </td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                    commission.status === 'paid' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {commission.status}
                  </span>
                </td>
                <td className="px-6 py-4">
                  {commission.status === 'pending' && (
                    <PayCommissionButton commissionId={commission.id} />
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </DashboardLayout>
  )
}
