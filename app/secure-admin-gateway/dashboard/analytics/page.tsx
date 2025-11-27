import { getUser } from '@/lib/auth/get-user'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { DashboardLayout } from '@/components/dashboard-layout'

export default async function AnalyticsPage() {
  const { profile } = await getUser()
  
  if (profile.role !== 'admin') {
    redirect('/dashboard')
  }

  const supabase = await createClient()

  const [
    { count: totalUsers },
    { count: totalLetters },
    { count: pendingReviews },
    { data: subscriptions },
    { data: recentLetters },
    { data: topEmployees }
  ] = await Promise.all([
    supabase.from('profiles').select('*', { count: 'exact', head: true }),
    supabase.from('letters').select('*', { count: 'exact', head: true }),
    supabase.from('letters').select('*', { count: 'exact', head: true }).in('status', ['pending_review', 'under_review']),
    supabase.from('subscriptions').select('*').eq('status', 'active'),
    supabase.from('letters').select('*, profiles(full_name, email)').order('created_at', { ascending: false }).limit(10),
    supabase.from('commissions').select('employee_id, commission_amount, employee_coupons(code), profiles(full_name)').eq('status', 'paid')
  ])

  // Calculate revenue metrics
  const totalRevenue = subscriptions?.reduce((sum, sub) => sum + (sub.price || 0), 0) || 0
  const activeSubscriptions = subscriptions?.length || 0

  // Calculate employee performance
  const employeeStats = topEmployees?.reduce((acc: any, comm: any) => {
    const empId = comm.employee_id
    if (!acc[empId]) {
      acc[empId] = {
        name: comm.profiles?.full_name || 'Unknown',
        totalCommission: 0,
        count: 0
      }
    }
    acc[empId].totalCommission += comm.commission_amount || 0
    acc[empId].count += 1
    return acc
  }, {})

  const topPerformers = Object.values(employeeStats || {})
    .sort((a: any, b: any) => b.totalCommission - a.totalCommission)
    .slice(0, 5)

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <h1 className="text-3xl font-bold text-slate-900">Analytics & Reporting</h1>

        {/* Key Metrics */}
        <div className="grid md:grid-cols-4 gap-6">
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="text-sm text-slate-600 mb-1">Total Users</div>
            <div className="text-3xl font-bold text-blue-600">{totalUsers || 0}</div>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="text-sm text-slate-600 mb-1">Total Letters</div>
            <div className="text-3xl font-bold text-green-600">{totalLetters || 0}</div>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="text-sm text-slate-600 mb-1">Pending Reviews</div>
            <div className="text-3xl font-bold text-orange-600">{pendingReviews || 0}</div>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="text-sm text-slate-600 mb-1">Active Subscriptions</div>
            <div className="text-3xl font-bold text-purple-600">{activeSubscriptions}</div>
          </div>
        </div>

        {/* Revenue Section */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h2 className="text-xl font-semibold mb-4">Revenue Overview</h2>
          <div className="grid md:grid-cols-3 gap-6">
            <div>
              <div className="text-sm text-slate-600 mb-1">Total Revenue</div>
              <div className="text-2xl font-bold text-green-600">${totalRevenue.toFixed(2)}</div>
            </div>
            <div>
              <div className="text-sm text-slate-600 mb-1">Average Order Value</div>
              <div className="text-2xl font-bold text-blue-600">
                ${activeSubscriptions > 0 ? (totalRevenue / activeSubscriptions).toFixed(2) : '0.00'}
              </div>
            </div>
            <div>
              <div className="text-sm text-slate-600 mb-1">Monthly Recurring</div>
              <div className="text-2xl font-bold text-purple-600">
                ${subscriptions?.filter(s => s.plan === 'monthly').reduce((sum, s) => sum + s.price, 0).toFixed(2) || '0.00'}
              </div>
            </div>
          </div>
        </div>

        {/* Top Employees */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h2 className="text-xl font-semibold mb-4">Top Performing Employees</h2>
          {topPerformers.length > 0 ? (
            <div className="space-y-3">
              {topPerformers.map((emp: any, idx: number) => (
                <div key={idx} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white font-semibold">
                      {idx + 1}
                    </div>
                    <div>
                      <div className="font-medium">{emp.name}</div>
                      <div className="text-sm text-slate-600">{emp.count} sales</div>
                    </div>
                  </div>
                  <div className="text-lg font-semibold text-green-600">
                    ${emp.totalCommission.toFixed(2)}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-slate-600">No employee data available yet.</p>
          )}
        </div>

        {/* Recent Activity */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h2 className="text-xl font-semibold mb-4">Recent Letters</h2>
          <div className="space-y-3">
            {recentLetters && recentLetters.length > 0 ? (
              recentLetters.map((letter) => (
                <div key={letter.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <div className="font-medium">{letter.title}</div>
                    <div className="text-sm text-slate-600">
                      {letter.profiles?.full_name} - {letter.profiles?.email}
                    </div>
                  </div>
                  <div className="text-right">
                    <span className={`inline-block px-2 py-1 text-xs rounded-full ${
                      letter.status === 'approved' ? 'bg-green-100 text-green-800' :
                      letter.status === 'pending_review' || letter.status === 'under_review' ? 'bg-yellow-100 text-yellow-800' :
                      letter.status === 'rejected' ? 'bg-red-100 text-red-800' :
                      'bg-slate-100 text-slate-800'
                    }`}>
                      {letter.status === 'pending_review' ? 'Pending Review' :
                       letter.status === 'under_review' ? 'Under Review' :
                       letter.status}
                    </span>
                    <div className="text-xs text-slate-500 mt-1">
                      {new Date(letter.created_at).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-slate-600">No letters yet.</p>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
