import { createClient } from '@/lib/supabase/server'
import { isAdminAuthenticated } from '@/lib/auth/admin-session'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, User, Mail, Phone, Building, FileText, Calendar, Clock } from 'lucide-react'
import { format } from 'date-fns'
import { ReviewLetterModal } from '@/components/review-letter-modal'

export default async function ReviewLetterDetailPage({ params }: { params: { id: string } }) {
  // Verify admin authentication
  const authenticated = await isAdminAuthenticated()
  if (!authenticated) {
    redirect('/secure-admin-gateway/login')
  }

  const { id } = params
  const supabase = await createClient()

  // Fetch letter with subscriber details
  const { data: letter, error } = await supabase
    .from('letters')
    .select(`
      *,
      profiles!letters_user_id_fkey (
        id,
        full_name,
        email,
        phone,
        company_name
      )
    `)
    .eq('id', id)
    .single()

  if (error || !letter) {
    console.error('[ReviewDetail] Error fetching letter:', error)
    notFound()
  }

  // Fetch audit trail
  const { data: auditTrail } = await supabase
    .from('letter_audit_trail')
    .select(`
      *,
      profiles!letter_audit_trail_performed_by_fkey (
        full_name,
        email
      )
    `)
    .eq('letter_id', id)
    .order('created_at', { ascending: false })

  const statusColors: Record<string, string> = {
    'draft': 'bg-gray-100 text-gray-800',
    'generating': 'bg-blue-100 text-blue-800',
    'pending_review': 'bg-yellow-100 text-yellow-800',
    'under_review': 'bg-blue-100 text-blue-800',
    'approved': 'bg-green-100 text-green-800',
    'rejected': 'bg-red-100 text-red-800',
    'completed': 'bg-green-100 text-green-800',
    'failed': 'bg-red-100 text-red-800'
  }

  // Parse intake data if it exists
  const intakeData = letter.intake_data as Record<string, any> || {}

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/secure-admin-gateway/review">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Review Queue
          </Button>
        </Link>
      </div>

      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">
            {letter.title || 'Untitled Letter'}
          </h1>
          <div className="flex items-center gap-3">
            <Badge className={statusColors[letter.status]}>
              {letter.status.replace('_', ' ').toUpperCase()}
            </Badge>
            <span className="text-sm text-muted-foreground">
              Created {format(new Date(letter.created_at), 'MMM d, yyyy h:mm a')}
            </span>
          </div>
        </div>

        {/* Review Actions */}
        <ReviewLetterModal letter={letter} />
      </div>

      {/* Subscriber Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="w-5 h-5" />
            Subscriber Information
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-start gap-3">
              <User className="w-4 h-4 text-muted-foreground mt-1" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Full Name</p>
                <p className="text-base">{letter.profiles?.full_name || 'Not provided'}</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Mail className="w-4 h-4 text-muted-foreground mt-1" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Email</p>
                <p className="text-base">{letter.profiles?.email}</p>
              </div>
            </div>

            {letter.profiles?.phone && (
              <div className="flex items-start gap-3">
                <Phone className="w-4 h-4 text-muted-foreground mt-1" />
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Phone</p>
                  <p className="text-base">{letter.profiles.phone}</p>
                </div>
              </div>
            )}

            {letter.profiles?.company_name && (
              <div className="flex items-start gap-3">
                <Building className="w-4 h-4 text-muted-foreground mt-1" />
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Company</p>
                  <p className="text-base">{letter.profiles.company_name}</p>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Letter Details */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Letter Details
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="text-sm font-medium text-muted-foreground mb-2">Letter Type</p>
            <p className="text-base capitalize">
              {letter.letter_type?.replace('_', ' ')}
            </p>
          </div>

          {/* Intake Data */}
          {Object.keys(intakeData).length > 0 && (
            <div className="border-t pt-4">
              <p className="text-sm font-medium text-muted-foreground mb-3">Case Information</p>
              <div className="space-y-3 bg-muted/30 p-4 rounded-lg">
                {Object.entries(intakeData).map(([key, value]) => {
                  if (!value) return null
                  return (
                    <div key={key}>
                      <p className="text-sm font-medium text-muted-foreground capitalize mb-1">
                        {key.replace(/([A-Z])/g, ' $1').trim()}
                      </p>
                      <p className="text-sm whitespace-pre-wrap">
                        {typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value)}
                      </p>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* AI Generated Draft */}
      <Card>
        <CardHeader>
          <CardTitle>AI Generated Draft</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="bg-muted/30 p-6 rounded-lg border">
            <pre className="whitespace-pre-wrap text-sm font-mono leading-relaxed">
              {letter.ai_draft_content || 'No draft content available.'}
            </pre>
          </div>
        </CardContent>
      </Card>

      {/* Final Content (if exists) */}
      {letter.final_content && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Final Reviewed Content
              <Badge variant="outline" className="bg-green-100 text-green-800">
                Approved
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-muted/30 p-6 rounded-lg border">
              <pre className="whitespace-pre-wrap text-sm font-mono leading-relaxed">
                {letter.final_content}
              </pre>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Review Notes */}
      {letter.review_notes && (
        <Card>
          <CardHeader>
            <CardTitle>Review Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm whitespace-pre-wrap">{letter.review_notes}</p>
          </CardContent>
        </Card>
      )}

      {/* Rejection Reason */}
      {letter.rejection_reason && (
        <Card className="border-destructive/50 bg-destructive/5">
          <CardHeader>
            <CardTitle className="text-destructive">Rejection Reason</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm whitespace-pre-wrap">{letter.rejection_reason}</p>
          </CardContent>
        </Card>
      )}

      {/* Audit Trail */}
      {auditTrail && auditTrail.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5" />
              Audit Trail
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {auditTrail.map((entry) => (
                <div key={entry.id} className="flex items-start gap-3 pb-3 border-b last:border-b-0">
                  <div className="w-2 h-2 bg-primary rounded-full mt-2"></div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium">
                        {entry.action.replace('_', ' ').toUpperCase()}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(entry.created_at), 'MMM d, yyyy h:mm a')}
                      </p>
                    </div>
                    {entry.notes && (
                      <p className="text-sm text-muted-foreground mt-1">{entry.notes}</p>
                    )}
                    {entry.profiles && (
                      <p className="text-xs text-muted-foreground mt-1">
                        By: {entry.profiles.full_name || entry.profiles.email}
                      </p>
                    )}
                    {entry.old_status && entry.new_status && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Status: {entry.old_status} → {entry.new_status}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
