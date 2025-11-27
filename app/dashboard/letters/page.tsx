import { getUser } from '@/lib/auth/get-user'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { DashboardLayout } from '@/components/dashboard-layout'
import { GenerateButton } from '@/components/generate-button'
import { format } from 'date-fns'

export default async function MyLettersPage() {
  const { profile } = await getUser()
  
  if (profile.role === 'employee') {
    redirect('/dashboard/commissions')
  }

  const supabase = await createClient()
  
  const query = supabase
    .from('letters')
    .select('*')
    .order('created_at', { ascending: false })
  
  if (profile.role === 'subscriber') {
    query.eq('user_id', profile.id)
  } else if (profile.role === 'admin') {
    // Admins see all letters
  }
  
  const { data: letters } = await query

  const approvedLetters = (letters || []).filter(l => l.status === 'approved')
  const inProgressLetters = (letters || []).filter(l => l.status !== 'approved')

  const statusColors: Record<string, string> = {
    'draft': 'bg-muted text-muted-foreground',
    'generating': 'bg-primary/10 text-primary',
    'pending_review': 'bg-warning/10 text-warning',
    'under_review': 'bg-amber-100 text-amber-800',
    'approved': 'bg-success/10 text-success',
    'rejected': 'bg-destructive/10 text-destructive',
    'completed': 'bg-primary/10 text-primary',
    'failed': 'bg-destructive/10 text-destructive'
  }

  const statusLabels: Record<string, string> = {
    'draft': 'Draft',
    'generating': 'Generating',
    'pending_review': 'Awaiting Review',
    'under_review': 'Under Review',
    'approved': 'Approved',
    'rejected': 'Rejected',
    'completed': 'Completed',
    'failed': 'Failed'
  }

  const LetterTable = ({ letters, title }: { letters: typeof approvedLetters, title: string }) => (
    <div className="mb-8">
      <h2 className="text-xl font-semibold text-slate-900 mb-4">{title}</h2>
      {letters.length > 0 ? (
        <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
          <table className="min-w-full divide-y divide-border">
            <thead className="bg-muted/50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Title
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Created
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-card divide-y divide-border">
              {letters.map((letter) => (
                <tr key={letter.id} className="hover:bg-muted/30">
                  <td className="px-6 py-4">
                    <div className="text-sm font-medium">{letter.title}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-muted-foreground">{letter.letter_type || 'N/A'}</div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${statusColors[letter.status]}`}>
                      {statusLabels[letter.status] || letter.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-muted-foreground">
                    {format(new Date(letter.created_at), 'MMM d, yyyy')}
                  </td>
                  <td className="px-6 py-4 text-sm">
                    <Link href={`/dashboard/letters/${letter.id}`} className="text-primary hover:text-primary/80 font-medium">
                      View
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm border p-8 text-center">
          <p className="text-slate-500">No {title.toLowerCase()} yet</p>
        </div>
      )}
    </div>
  )

  return (
    <DashboardLayout>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-slate-900">My Letters</h1>
        <Link href="/dashboard/letters/new">
          <GenerateButton hasSubscription={true} />
        </Link>
      </div>

      {letters && letters.length > 0 ? (
        <>
          <LetterTable letters={approvedLetters} title="My Approved Letters" />
          
          {inProgressLetters.length > 0 && (
            <LetterTable letters={inProgressLetters} title="In Progress / Under Review" />
          )}
        </>
      ) : (
        <div className="bg-card rounded-lg shadow-sm border p-12 text-center">
          <svg className="mx-auto h-12 w-12 text-muted-foreground mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <h3 className="text-lg font-medium mb-2">No letters yet</h3>
          <p className="text-muted-foreground mb-6">
            {profile.role === 'subscriber' ? 'Create a letter and submit it for review. Once approved, it will appear here.' : 'You have no letters to display.'}
          </p>
          <Link href="/dashboard/letters/new">
            <GenerateButton hasSubscription={true} />
          </Link>
        </div>
      )}
    </DashboardLayout>
  )
}
