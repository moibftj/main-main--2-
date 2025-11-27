import { getUser } from '@/lib/auth/get-user'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Button } from './ui/button'
import { createClient } from '@/lib/supabase/server'
import { Home, FileText, Plus, CreditCard, DollarSign, Ticket } from 'lucide-react'

export async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { profile } = await getUser()
  const supabase = await createClient()

  const handleSignOut = async () => {
    'use server'
    const supabase = await createClient()
    await supabase.auth.signOut()
    redirect('/auth/login')
  }

  const navigation = {
    subscriber: [
      { name: 'Dashboard', href: '/dashboard', icon: Home },
      { name: 'My Letters', href: '/dashboard/letters', icon: FileText },
      { name: 'Create New Letter', href: '/dashboard/letters/new', icon: Plus },
      { name: 'Subscription', href: '/dashboard/subscription', icon: CreditCard },
    ],
    employee: [
      { name: 'Dashboard', href: '/dashboard', icon: Home },
      { name: 'Commissions', href: '/dashboard/commissions', icon: DollarSign },
      { name: 'My Coupons', href: '/dashboard/coupons', icon: Ticket },
    ]
  }

  const userNav = navigation[profile.role as keyof typeof navigation] || navigation.subscriber

  return (
    <div className="min-h-screen bg-background">
      <nav className="bg-card border-b sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link href="/dashboard" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-primary-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <span className="text-lg font-bold text-foreground">Talk-To-My-Lawyer</span>
            </Link>
            <div className="flex items-center gap-4">
              <div className="text-sm text-muted-foreground">
                {profile.full_name || profile.email}
                <span className="ml-2 px-2 py-1 text-xs bg-muted text-muted-foreground rounded capitalize">
                  {profile.role}
                </span>
              </div>
              <form action={handleSignOut}>
                <Button variant="ghost" size="sm" type="submit">
                  Sign Out
                </Button>
              </form>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex gap-2 mb-8 flex-wrap">
          {userNav.map((item) => {
            const Icon = item.icon
            return (
              <Link key={item.href} href={item.href}>
                <Button variant="ghost" className="flex items-center gap-2">
                  <Icon className="h-4 w-4" />
                  {item.name}
                </Button>
              </Link>
            )
          })}
        </div>

        {/* Main Content */}
        {children}
      </div>
    </div>
  )
}
