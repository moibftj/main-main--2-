import { getUser } from '@/lib/auth/get-user'
import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import { DashboardLayout } from '@/components/dashboard-layout'
import { Button } from '@/components/ui/button'
import { format } from 'date-fns'
import Link from 'next/link'
import { LetterActions } from '@/components/letter-actions'
import { ReviewStatusModal } from '@/components/review-status-modal'

export default async function LetterDetailPage({ params }: { params: { id: string } }) {
  const { id } = params
  const { profile } = await getUser()
  const supabase = await createClient()

  const { data: letter } = await supabase
    .from('letters')
    .select('*')
    .eq('id', id)
    .single()

  if (!letter) {
    notFound()
  }

  // Check ownership
  if (letter.user_id !== profile.id && profile.role !== 'admin') {
    redirect('/dashboard/letters')
  }

  const statusColors: Record<string, string> = {
    'draft': 'bg-muted text-muted-foreground',
    'pending_review': 'bg-warning/10 text-warning',
    'approved': 'bg-success/10 text-success',
    'rejected': 'bg-destructive/10 text-destructive'
  }

  const timelineSteps = [
    {
      label: 'Request Received',
      status: 'completed',
      icon: '✓',
      description: format(new Date(letter.created_at), 'MMM d, yyyy h:mm a')
    },
    {
      label: 'Under Attorney Review',
      status: ['pending_review', 'under_review'].includes(letter.status) 
        ? 'active' 
        : (['approved', 'rejected'].includes(letter.status) ? 'completed' : 'pending'),
      icon: ['pending_review', 'under_review'].includes(letter.status) ? '⏳' : '✓',
      description: letter.status === 'under_review' 
        ? 'Attorney is currently reviewing your letter' 
        : (letter.status === 'pending_review' ? 'Waiting for attorney review' : 'Review completed')
    },
    {
      label: letter.status === 'rejected' ? 'Rejected' : 'Approved',
      status: ['approved', 'rejected'].includes(letter.status) ? 'completed' : 'pending',
      icon: letter.status === 'approved' ? '✓' : (letter.status === 'rejected' ? '✗' : '○'),
      description: letter.approved_at 
        ? format(new Date(letter.approved_at), 'MMM d, yyyy h:mm a')
        : (letter.reviewed_at && letter.status === 'rejected' 
          ? format(new Date(letter.reviewed_at), 'MMM d, yyyy h:mm a')
          : 'Pending approval')
    },
    {
      label: 'Letter Ready',
      status: letter.status === 'approved' ? 'completed' : 'pending',
      icon: letter.status === 'approved' ? '✓' : '○',
      description: letter.status === 'approved' ? 'Ready to download and email' : 'Waiting for approval'
    }
  ]

  const showReviewModal = ['pending_review', 'under_review'].includes(letter.status)

  return (
    <DashboardLayout>
      <ReviewStatusModal show={showReviewModal} status={letter.status} />
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <Link href="/dashboard/letters" className="text-primary hover:text-primary/80 text-sm flex items-center gap-1 mb-4">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to My Letters
          </Link>
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold mb-2">{letter.title}</h1>
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <span>Created {format(new Date(letter.created_at), 'MMM d, yyyy')}</span>
                <span className={`px-2 py-1 rounded-full text-xs font-semibold ${statusColors[letter.status]}`}>
                  {letter.status.replace('_', ' ')}
                </span>
              </div>
            </div>
            <LetterActions letter={letter} />
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h2 className="text-lg font-semibold mb-6">Letter Progress</h2>
            <div className="relative">
              {timelineSteps.map((step, index) => (
                <div key={index} className="flex gap-4 mb-8 last:mb-0">
                  <div className="relative flex flex-col items-center">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg font-bold ${
                      step.status === 'completed' ? 'bg-success/20 text-success' :
                      step.status === 'active' ? 'bg-primary/20 text-primary' :
                      'bg-muted text-muted-foreground'
                    }`}>
                      {step.icon}
                    </div>
                    {index < timelineSteps.length - 1 && (
                      <div className={`w-0.5 h-full mt-2 ${
                        step.status === 'completed' ? 'bg-success/30' : 'bg-border'
                      }`} style={{ minHeight: '40px' }} />
                    )}
                  </div>
                  <div className="flex-1 pb-8">
                    <h3 className={`font-semibold ${
                      step.status === 'completed' ? 'text-success' :
                      step.status === 'active' ? 'text-primary' :
                      'text-muted-foreground'
                    }`}>
                      {step.label}
                    </h3>
                    <p className="text-sm text-muted-foreground mt-1">{step.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {letter.status === 'approved' && (
            <div className="bg-success/10 border border-success/20 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <svg className="w-5 h-5 text-success mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div>
                  <h3 className="font-semibold text-success">Approved</h3>
                  <p className="text-sm text-success/80">Your letter has been approved and is ready to use.</p>
                </div>
              </div>
            </div>
          )}

          {/* Status Information */}
          {letter.status === 'pending_review' && (
            <div className="bg-warning/10 border border-warning/20 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <svg className="w-5 h-5 text-warning mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div>
                  <h3 className="font-semibold text-warning">Under Review</h3>
                  <p className="text-sm text-warning/80">Your letter is being reviewed by our legal team. You'll be notified once it's approved.</p>
                </div>
              </div>
            </div>
          )}

          {letter.status === 'rejected' && letter.rejection_reason && (
            <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <svg className="w-5 h-5 text-destructive mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div>
                  <h3 className="font-semibold text-destructive">Rejected</h3>
                  <p className="text-sm text-destructive/80 mt-1">{letter.rejection_reason}</p>
                </div>
              </div>
            </div>
          )}

          {/* Show AI draft only to admins or after approval */}
          {(profile.role === 'admin' || letter.status === 'approved') && (
            <div className="bg-white rounded-lg shadow-sm border p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">
                  {profile.role === 'admin' ? 'Attorney Draft (Admin View)' : 'Attorney Draft'}
                </h2>
                <span className="text-xs text-muted-foreground">Saved automatically after generation</span>
              </div>
              {profile.role === 'admin' && letter.status !== 'approved' && (
                <div className="bg-amber-50 border border-amber-200 rounded p-3 text-sm text-amber-800">
                  <strong>Admin Note:</strong> This draft is hidden from the user until approval.
                </div>
              )}
              <div className="bg-muted/50 border rounded-lg p-4">
                <pre className="whitespace-pre-wrap text-sm leading-relaxed">{letter.ai_draft_content || 'No draft available yet.'}</pre>
              </div>
            </div>
          )}

          {/* Show placeholder for users when draft is not yet approved */}
          {profile.role !== 'admin' && letter.status !== 'approved' && letter.status !== 'rejected' && (
            <div className="bg-white rounded-lg shadow-sm border p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">Attorney Draft</h2>
                <span className="text-xs text-muted-foreground">In Review</span>
              </div>
              <div className="bg-muted/30 border rounded-lg p-8 text-center text-muted-foreground">
                <svg className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                <p className="text-sm">Your letter draft is currently under attorney review.</p>
                <p className="text-sm mt-1">The content will be visible here once approved.</p>
              </div>
            </div>
          )}

          {letter.final_content && letter.status === 'approved' && (
            <div className="bg-white rounded-lg shadow-sm border p-6 space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">Final Letter</h2>
                <span className="text-xs text-primary font-medium">Approved</span>
              </div>
              <div className="bg-muted/40 border rounded-lg p-4">
                <pre className="whitespace-pre-wrap text-sm leading-relaxed">{letter.final_content}</pre>
              </div>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  )
}
