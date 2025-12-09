import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Letter } from "@/lib/types/api"
import type { LetterStatus } from "@/lib/database.types"

type LetterWithProfile = {
  id: string
  title: string | null
  status: LetterStatus
  created_at: string
  profiles?: {
    email: string | null
  }[]
}
import {
  Mail,
  Users,
  DollarSign,
  TrendingUp,
  Eye,
  CheckCircle,
  Clock,
  AlertCircle
} from "lucide-react"
import Link from "next/link"

export default async function AdminDashboard() {
  const supabase = await createClient()

  // Fetch key metrics
  const [
    { count: totalLetters },
    { count: pendingLetters },
    { count: totalUsers },
    { count: activeSubscribers },
    { count: totalRevenue }
  ] = await Promise.all([
    supabase.from("letters").select("*", { count: "exact", head: true }),
    supabase.from("letters").select("*", { count: "exact", head: true }).in("status", ["pending_review", "under_review"]),
    supabase.from("profiles").select("*", { count: "exact", head: true }),
    supabase.from("profiles").select("*", { count: "exact", head: true }).eq("role", "subscriber"),
    supabase.from("subscriptions").select("*", { count: "exact", head: true }).eq("status", "active")
  ])

  // Get letter status breakdown
  const { data: letterStatuses } = await supabase
    .from("letters")
    .select("status")
    .then(({ data }) => {
      const statusCounts = data?.reduce((acc, letter) => {
        acc[letter.status] = (acc[letter.status] || 0) + 1
        return acc
      }, {} as Record<string, number>) || {}
      return { data: statusCounts }
    })

  // Get recent letters
  const { data: recentLetters } = await supabase
    .from("letters")
    .select("id, title, status, created_at, profiles!inner(email)")
    .order("created_at", { ascending: false })
    .limit(5)

  const metrics = [
    {
      title: "Total Letters",
      value: totalLetters || 0,
      description: "All time letters generated",
      icon: Mail,
      color: "text-blue-600",
      bgColor: "bg-blue-50"
    },
    {
      title: "Pending Review",
      value: pendingLetters || 0,
      description: "Letters awaiting review",
      icon: Clock,
      color: "text-yellow-600",
      bgColor: "bg-yellow-50"
    },
    {
      title: "Active Users",
      value: activeSubscribers || 0,
      description: "Active subscribers",
      icon: Users,
      color: "text-green-600",
      bgColor: "bg-green-50"
    },
    {
      title: "Total Revenue",
      value: `$${((totalRevenue || 0) * 299).toLocaleString()}`,
      description: "Estimated revenue",
      icon: DollarSign,
      color: "text-blue-600",
      bgColor: "bg-blue-50"
    }
  ]

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      draft: { variant: "secondary" as const, label: "Draft" },
      generating: { variant: "secondary" as const, label: "Generating" },
      pending_review: { variant: "default" as const, label: "Pending Review" },
      under_review: { variant: "secondary" as const, label: "Under Review" },
      approved: { variant: "default" as const, label: "Approved" },
      completed: { variant: "default" as const, label: "Completed" },
      rejected: { variant: "destructive" as const, label: "Rejected" }
    }
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.draft
    return <Badge variant={config.variant}>{config.label}</Badge>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">Admin Dashboard</h2>
          <p className="text-gray-600">Overview of your legal letter service</p>
        </div>
        <Link href="/admin/letters">
          <Button>
            <Eye className="mr-2 h-4 w-4" />
            Review Letters
          </Button>
        </Link>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {metrics.map((metric) => (
          <Card key={metric.title} className="hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                {metric.title}
              </CardTitle>
              <div className={`p-2 rounded-full ${metric.bgColor}`}>
                <metric.icon className={`h-4 w-4 ${metric.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metric.value}</div>
              <p className="text-xs text-gray-500">{metric.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Letter Status Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle>Letter Status Breakdown</CardTitle>
            <CardDescription>Current status of all letters</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {Object.entries(letterStatuses || {}).map(([status, count]) => (
              <div key={status} className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  {getStatusBadge(status)}
                </div>
                <span className="font-medium">{count}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Recent Letters */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Letters</CardTitle>
            <CardDescription>Latest letter submissions</CardDescription>
          </CardHeader>
          <CardContent>
            {recentLetters && recentLetters.length > 0 ? (
              <div className="space-y-3">
                {recentLetters.map((letter: LetterWithProfile) => (
                  <div key={letter.id} className="flex items-center justify-between">
                    <div className="flex-1">
                      <p className="text-sm font-medium truncate">{letter.title}</p>
                      <p className="text-xs text-gray-500">{letter.profiles?.[0]?.email ?? 'Unknown user'}</p>
                    </div>
                    <div className="flex items-center space-x-2">
                      {getStatusBadge(letter.status)}
                      <Link href={`/admin/letters/${letter.id}`}>
                        <Button variant="ghost" size="sm">View</Button>
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-gray-500 py-8">No letters yet</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>Frequently used admin functions</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Link href="/admin/letters?status=pending_review">
              <Button variant="outline" className="w-full justify-start">
                <AlertCircle className="mr-2 h-4 w-4" />
                Review Pending Letters
              </Button>
            </Link>
            <Link href="/admin/users">
              <Button variant="outline" className="w-full justify-start">
                <Users className="mr-2 h-4 w-4" />
                Manage Users
              </Button>
            </Link>
            <Link href="/admin/analytics">
              <Button variant="outline" className="w-full justify-start">
                <TrendingUp className="mr-2 h-4 w-4" />
                View Analytics
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}