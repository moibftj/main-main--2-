import { getUser } from '@/lib/auth/get-user'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { DashboardLayout } from '@/components/dashboard-layout'
import { format } from 'date-fns'

export default async function UsersPage() {
  const { profile } = await getUser()
  
  if (profile.role !== 'admin') {
    redirect('/dashboard')
  }

  const supabase = await createClient()
  const { data: users } = await supabase
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: false })

  // Get user stats
  const subscribers = users?.filter(u => u.role === 'subscriber').length || 0
  const employees = users?.filter(u => u.role === 'employee').length || 0
  const admins = users?.filter(u => u.role === 'admin').length || 0

  const roleColors: Record<string, string> = {
    'subscriber': 'bg-blue-100 text-blue-800',
    'employee': 'bg-purple-100 text-purple-800',
    'admin': 'bg-red-100 text-red-800'
  }

  return (
    <DashboardLayout>
      <h1 className="text-3xl font-bold text-slate-900 mb-6">User Management</h1>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="text-sm font-medium text-slate-500 mb-2">Subscribers</div>
          <div className="text-3xl font-bold text-blue-600">{subscribers}</div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="text-sm font-medium text-slate-500 mb-2">Employees</div>
          <div className="text-3xl font-bold text-purple-600">{employees}</div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="text-sm font-medium text-slate-500 mb-2">Admins</div>
          <div className="text-3xl font-bold text-red-600">{admins}</div>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                Name
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                Email
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                Role
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                Joined
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-slate-200">
            {users?.map((user) => (
              <tr key={user.id} className="hover:bg-slate-50">
                <td className="px-6 py-4">
                  <div className="text-sm font-medium text-slate-900">{user.full_name || 'N/A'}</div>
                </td>
                <td className="px-6 py-4">
                  <div className="text-sm text-slate-900">{user.email}</div>
                </td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${roleColors[user.role]}`}>
                    {user.role}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm text-slate-500">
                  {format(new Date(user.created_at), 'MMM d, yyyy')}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </DashboardLayout>
  )
}
