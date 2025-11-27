import { getUser } from '@/lib/auth/get-user'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { DashboardLayout } from '@/components/dashboard-layout'
import { format } from 'date-fns'
import Link from 'next/link'

export default async function AllLettersPage() {
  const { profile } = await getUser()
  
  if (profile.role !== 'admin') {
    redirect('/dashboard')
  }

  const supabase = await createClient()
  const { data: letters } = await supabase
    .from('letters')
    .select(`
      *,
      profiles!letters_user_id_fkey (
        full_name,
        email
      )
    `)
    .order('created_at', { ascending: false })
    .limit(100)

  const statusColors: Record<string, string> = {
    'draft': 'bg-slate-100 text-slate-800',
    'pending_review': 'bg-yellow-100 text-yellow-800',
    'approved': 'bg-green-100 text-green-800',
    'rejected': 'bg-red-100 text-red-800'
  }

  return (
    <DashboardLayout>
      <h1 className="text-3xl font-bold text-slate-900 mb-6">All Letters</h1>

      <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                Title
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                User
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                Type
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                Created
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-slate-200">
            {letters?.map((letter) => (
              <tr key={letter.id} className="hover:bg-slate-50">
                <td className="px-6 py-4">
                  <div className="text-sm font-medium text-slate-900">{letter.title}</div>
                </td>
                <td className="px-6 py-4">
                  <div className="text-sm text-slate-900">{letter.profiles?.full_name}</div>
                  <div className="text-xs text-slate-500">{letter.profiles?.email}</div>
                </td>
                <td className="px-6 py-4 text-sm text-slate-500">
                  {letter.letter_type || 'N/A'}
                </td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${statusColors[letter.status]}`}>
                    {letter.status.replace('_', ' ')}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm text-slate-500">
                  {format(new Date(letter.created_at), 'MMM d, yyyy')}
                </td>
                <td className="px-6 py-4 text-sm">
                  <Link href={`/dashboard/letters/${letter.id}`} className="text-blue-600 hover:text-blue-800 font-medium">
                    View
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </DashboardLayout>
  )
}
