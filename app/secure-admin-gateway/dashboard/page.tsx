import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ArrowRight, FileText, Users, AlertCircle, CheckCircle, Clock } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { isAdminAuthenticated } from '@/lib/auth/admin-session'
import { redirect } from 'next/navigation'

export default async function AdminDashboardPage() {
  // Verify admin session
  const authenticated = await isAdminAuthenticated()
  if (!authenticated) {
    redirect('/secure-admin-gateway/login')
  }

  const supabase = await createClient()

  // Fetch metrics
  const { count: pendingCount } = await supabase
    .from('letters')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'pending_review')

  const { count: totalLetters } = await supabase
    .from('letters')
    .select('*', { count: 'exact', head: true })

  const { count: activeUsers } = await supabase
    .from('profiles')
    .select('*', { count: 'exact', head: true })
    .eq('role', 'subscriber')

  // Fetch recent pending letters
  const { data: recentPending } = await supabase
    .from('letters')
    .select('*, profiles(full_name, email)')
    .eq('status', 'pending_review')
    .order('created_at', { ascending: true })
    .limit(5)

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Admin Dashboard</h1>
        <p className="text-muted-foreground mt-2">Overview of system activity and review queue.</p>
      </div>

      {/* Metrics */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Reviews</CardTitle>
            <AlertCircle className="h-4 w-4 text-warning" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingCount || 0}</div>
            <p className="text-xs text-muted-foreground">Letters waiting for attorney review</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Letters</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalLetters || 0}</div>
            <p className="text-xs text-muted-foreground">All time letters generated</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Subscribers</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeUsers || 0}</div>
            <p className="text-xs text-muted-foreground">Total registered subscribers</p>
          </CardContent>
        </Card>
      </div>

      {/* Review Queue Preview */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-foreground">Review Queue</h2>
          <Link href="/secure-admin-gateway/dashboard/letters">
            <Button variant="outline" size="sm">View All <ArrowRight className="ml-2 h-4 w-4" /></Button>
          </Link>
        </div>

        {!recentPending || recentPending.length === 0 ? (
          <Card className="bg-muted/50 border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-8 text-center">
              <CheckCircle className="w-12 h-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium text-foreground">All caught up!</h3>
              <p className="text-muted-foreground">No pending letters to review.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {recentPending.map((letter) => (
              <Card key={letter.id} className="hover:bg-muted/50 transition-colors">
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="p-2 bg-warning/10 rounded-full">
                      <Clock className="w-5 h-5 text-warning" />
                    </div>
                    <div>
                      <h3 className="font-medium text-foreground">{letter.title || 'Untitled Letter'}</h3>
                      <p className="text-sm text-muted-foreground">
                        {letter.letter_type} • by {letter.profiles?.full_name || letter.profiles?.email || 'Unknown User'}
                      </p>
                    </div>
                  </div>
                  <Link href={`/secure-admin-gateway/dashboard/letters?id=${letter.id}`}>
                    <Button size="sm">Review</Button>
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
