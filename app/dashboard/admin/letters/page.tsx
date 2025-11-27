import { getUser } from '@/lib/auth/get-user'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { DashboardLayout } from '@/components/dashboard-layout'
import { ReviewLetterModal } from '@/components/review-letter-modal'
import { format } from 'date-fns'

export default async function AdminLettersPage() {
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
    .in('status', ['pending_review', 'under_review'])
    .order('created_at', { ascending: true })

  return (
    <DashboardLayout>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-slate-900">Review Queue</h1>
        <div className="text-sm text-slate-600">
          {letters?.length || 0} letters pending review
        </div>
      </div>

      {letters && letters.length > 0 ? (
        <div className="space-y-4">
          {letters.map((letter) => (
            <div key={letter.id} className="bg-white rounded-lg shadow-sm border p-6">
              <div className="flex justify-between items-start mb-4">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-slate-900 mb-1">{letter.title}</h3>
                  <div className="text-sm text-slate-600 space-y-1">
                    <p>From: {letter.profiles?.full_name} ({letter.profiles?.email})</p>
                    <p>Type: {letter.letter_type}</p>
                    <p>Submitted: {format(new Date(letter.created_at), 'MMM d, yyyy h:mm a')}</p>
                    <p className="font-medium">
                      Status: <span className={
                        letter.status === 'under_review' 
                          ? 'text-orange-600' 
                          : 'text-yellow-600'
                      }>
                        {letter.status === 'under_review' ? 'Under Review' : 'Pending Review'}
                      </span>
                    </p>
                  </div>
                </div>
                <ReviewLetterModal letter={letter} />
              </div>
              
              <div className="mt-4 p-4 bg-slate-50 rounded-lg">
                <h4 className="text-sm font-medium text-slate-700 mb-2">Draft Preview</h4>
                <p className="text-sm text-slate-600 whitespace-pre-line line-clamp-6">
                  {letter.ai_draft_content}
                </p>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm border p-12 text-center">
          <svg className="mx-auto h-12 w-12 text-slate-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <h3 className="text-lg font-medium text-slate-900 mb-2">No letters pending review</h3>
          <p className="text-slate-600">All letters have been reviewed</p>
        </div>
      )}
    </DashboardLayout>
  )
}
