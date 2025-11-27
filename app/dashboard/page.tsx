import { getUser } from '@/lib/auth/get-user'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Plus, FileText, Clock, CheckCircle, AlertCircle, ArrowRight } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

export default async function DashboardPage() {
  const { profile } = await getUser()

  if (profile.role === 'admin') redirect('/dashboard/admin')
  if (profile.role === 'employee') redirect('/dashboard/commissions')

  const supabase = await createClient()

  // Fetch recent letters
  const { data: recentLetters } = await supabase
    .from('letters')
    .select('*')
    .eq('user_id', profile.id)
    .order('created_at', { ascending: false })
    .limit(5)

  // Fetch subscription
  const { data: subscription } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('user_id', profile.id)
    .eq('status', 'active')
    .single()

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <Badge className="bg-success text-success-foreground hover:bg-success/90">Ready</Badge>
      case 'rejected':
        return <Badge variant="destructive">Rejected</Badge>
      case 'pending_review':
      case 'under_review':
        return <Badge className="bg-warning text-warning-foreground hover:bg-warning/90">In Review</Badge>
      default:
        return <Badge variant="secondary">Draft</Badge>
    }
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Welcome back, {profile.full_name?.split(' ')[0] || 'Subscriber'}</h1>
          <p className="text-muted-foreground mt-2">Track your legal letters and create new ones.</p>
        </div>
        <Link href="/dashboard/letters/new">
          <Button size="lg" className="w-full md:w-auto">
            <Plus className="mr-2 h-5 w-5" /> Create New Letter
          </Button>
        </Link>
      </div>

      {/* Subscription Status (if active) */}
      {subscription && (
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="flex items-center justify-between p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-primary/10 rounded-full">
                <FileText className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">Subscription Active</h3>
                <p className="text-sm text-muted-foreground">
                  You have <span className="font-bold text-foreground">{subscription.credits_remaining}</span> letter credits remaining this period.
                </p>
              </div>
            </div>
            <Link href="/dashboard/subscription">
              <Button variant="outline" size="sm">Manage Subscription</Button>
            </Link>
          </CardContent>
        </Card>
      )}

      {/* Recent Letters */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-foreground">Recent Letters</h2>
          {recentLetters && recentLetters.length > 0 && (
            <Link href="/dashboard/letters">
              <Button variant="ghost" size="sm">View All <ArrowRight className="ml-2 h-4 w-4" /></Button>
            </Link>
          )}
        </div>

        {!recentLetters || recentLetters.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
                <FileText className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold text-foreground">No letters created yet</h3>
              <p className="text-muted-foreground max-w-sm mt-2 mb-6">
                Get started by creating your first AI-powered legal letter. It only takes a few minutes.
              </p>
              <Link href="/dashboard/letters/new">
                <Button>Start Your First Letter</Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {recentLetters.map((letter) => (
              <Link key={letter.id} href={`/dashboard/letters/${letter.id}`}>
                <Card className="hover:bg-muted/50 transition-colors cursor-pointer">
                  <CardContent className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className={`p-2 rounded-full ${
                        letter.status === 'approved' ? 'bg-success/10' :
                        letter.status === 'rejected' ? 'bg-destructive/10' :
                        'bg-muted'
                      }`}>
                        {letter.status === 'approved' ? <CheckCircle className="w-5 h-5 text-success" /> :
                         letter.status === 'rejected' ? <AlertCircle className="w-5 h-5 text-destructive" /> :
                         <Clock className="w-5 h-5 text-muted-foreground" />}
                      </div>
                      <div>
                        <h3 className="font-medium text-foreground">{letter.title || 'Untitled Letter'}</h3>
                        <p className="text-sm text-muted-foreground">
                          {letter.letter_type} • {new Date(letter.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      {getStatusBadge(letter.status)}
                      <ArrowRight className="w-4 h-4 text-muted-foreground" />
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
