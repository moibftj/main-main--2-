import { createClient } from '@/lib/supabase/server'
import { isAdminAuthenticated } from '@/lib/auth/admin-session'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Clock, FileText, User } from 'lucide-react'
import { format } from 'date-fns'

export default async function ReviewCenterPage() {
  // Verify admin authentication
  const authenticated = await isAdminAuthenticated()
  if (!authenticated) {
    redirect('/secure-admin-gateway/login')
  }

  const supabase = await createClient()

  // Fetch all letters needing review (pending_review and under_review)
  const { data: letters, error } = await supabase
    .from('letters')
    .select(`
      *,
      profiles!letters_user_id_fkey (
        id,
        full_name,
        email
      )
    `)
    .in('status', ['pending_review', 'under_review'])
    .order('created_at', { ascending: true }) // FIFO: Oldest first
    .limit(100)

  if (error) {
    console.error('[ReviewCenter] Error fetching letters:', error)
  }

  const pendingCount = letters?.filter(l => l.status === 'pending_review').length || 0
  const underReviewCount = letters?.filter(l => l.status === 'under_review').length || 0

  const statusColors: Record<string, string> = {
    'pending_review': 'bg-yellow-100 text-yellow-800 border-yellow-300',
    'under_review': 'bg-blue-100 text-blue-800 border-blue-300'
  }

  const statusLabels: Record<string, string> = {
    'pending_review': 'Pending Review',
    'under_review': 'Under Review'
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">Review Center</h1>
        <p className="text-muted-foreground mt-2">
          Review and approve legal letters submitted by subscribers
        </p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Pending Review</p>
                <p className="text-3xl font-bold text-yellow-600">{pendingCount}</p>
              </div>
              <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center">
                <Clock className="w-6 h-6 text-yellow-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Under Review</p>
                <p className="text-3xl font-bold text-blue-600">{underReviewCount}</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                <FileText className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Letters List */}
      <div className="space-y-3">
        <h2 className="text-xl font-semibold">Letters Awaiting Review</h2>

        {!letters || letters.length === 0 ? (
          <Card className="bg-muted/30">
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <div className="w-16 h-16 bg-success/20 rounded-full flex items-center justify-center mb-4">
                <svg className="w-8 h-8 text-success" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold mb-2">All Caught Up!</h3>
              <p className="text-muted-foreground">No letters pending review at the moment.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {letters.map((letter) => (
              <Card key={letter.id} className="hover:bg-muted/30 transition-colors border-l-4" style={{
                borderLeftColor: letter.status === 'pending_review' ? '#eab308' : '#3b82f6'
              }}>
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      {/* Title and Status */}
                      <div className="flex items-start gap-3 mb-3">
                        <div className="flex-1">
                          <h3 className="text-lg font-semibold text-foreground mb-1">
                            {letter.title || 'Untitled Letter'}
                          </h3>
                          <Badge variant="outline" className={statusColors[letter.status]}>
                            {statusLabels[letter.status]}
                          </Badge>
                        </div>
                      </div>

                      {/* Metadata */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm text-muted-foreground">
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4" />
                          <span className="truncate">
                            {letter.profiles?.full_name || letter.profiles?.email || 'Unknown User'}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <FileText className="w-4 h-4" />
                          <span className="capitalize">{letter.letter_type?.replace('_', ' ')}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4" />
                          <span>Submitted {format(new Date(letter.created_at), 'MMM d, yyyy')}</span>
                        </div>
                      </div>

                      {/* Waiting time indicator */}
                      {letter.status === 'pending_review' && (
                        <div className="mt-3 text-xs text-yellow-700 bg-yellow-50 px-2 py-1 rounded inline-block">
                          Waiting {Math.floor((Date.now() - new Date(letter.created_at).getTime()) / (1000 * 60 * 60))} hours
                        </div>
                      )}
                    </div>

                    {/* Action Button */}
                    <Link href={`/secure-admin-gateway/review/${letter.id}`}>
                      <Button>
                        {letter.status === 'pending_review' ? 'Start Review' : 'Continue Review'}
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
