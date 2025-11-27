import { getAdminSession, isSuperAdmin } from '@/lib/auth/admin-session'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { FileText, Users, DollarSign, BarChart3, Shield, Gavel } from 'lucide-react'
import { AdminLogoutButton } from '@/components/admin-logout-button'

export default async function AdminDashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getAdminSession()

  if (!session) {
    redirect('/secure-admin-gateway/login')
  }

  const superAdmin = await isSuperAdmin()

  // Regular admins only see Review Center
  const regularAdminNav = [
    {
      name: 'Review Center',
      href: '/secure-admin-gateway/review',
      icon: Gavel,
      superAdminOnly: false
    }
  ]

  // Super admins see everything
  const superAdminNav = [
    {
      name: 'Dashboard',
      href: '/secure-admin-gateway/dashboard',
      icon: BarChart3,
      superAdminOnly: true
    },
    {
      name: 'Review Center',
      href: '/secure-admin-gateway/review',
      icon: Gavel,
      superAdminOnly: false
    },
    {
      name: 'Review Queue',
      href: '/secure-admin-gateway/dashboard/letters',
      icon: FileText,
      superAdminOnly: true
    },
    {
      name: 'All Letters',
      href: '/secure-admin-gateway/dashboard/all-letters',
      icon: FileText,
      superAdminOnly: true
    },
    {
      name: 'Users',
      href: '/secure-admin-gateway/dashboard/users',
      icon: Users,
      superAdminOnly: true
    },
    {
      name: 'Commissions',
      href: '/secure-admin-gateway/dashboard/commissions',
      icon: DollarSign,
      superAdminOnly: true
    },
    {
      name: 'Analytics',
      href: '/secure-admin-gateway/dashboard/analytics',
      icon: BarChart3,
      superAdminOnly: true
    }
  ]

  const navigation = superAdmin ? superAdminNav : regularAdminNav

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <div className="flex h-screen">
        {/* Sidebar */}
        <div className="w-64 bg-slate-800/50 backdrop-blur border-r border-slate-700 flex flex-col">
          {/* Header */}
          <div className="p-4 border-b border-slate-700">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 bg-red-600 rounded-lg flex items-center justify-center">
                <Shield className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-sm font-bold text-white">Admin Portal</h1>
                <p className="text-xs text-slate-400">Secure Access</p>
              </div>
            </div>
          </div>

          {/* Admin Info */}
          <div className="p-4 border-b border-slate-700 bg-slate-900/50">
            <div className="flex items-center gap-2 text-sm">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-slate-300">{session.email}</span>
            </div>
            {superAdmin && (
              <div className="flex items-center gap-1 mt-1">
                <Shield className="h-3 w-3 text-amber-500" />
                <span className="text-xs text-amber-500 font-semibold">Super Admin</span>
              </div>
            )}
            {!superAdmin && (
              <div className="mt-1">
                <span className="text-xs text-slate-500">Reviewer</span>
              </div>
            )}
            <p className="text-xs text-slate-500 mt-1">
              Session expires in {Math.round((1800000 - (Date.now() - session.lastActivity)) / 60000)} min
            </p>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-1">
            {navigation.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-slate-300 hover:text-white hover:bg-slate-700 transition-colors"
              >
                <item.icon className="h-4 w-4" />
                <span className="text-sm">{item.name}</span>
              </Link>
            ))}
          </nav>

          {/* Logout */}
          <div className="p-4 border-t border-slate-700">
            <AdminLogoutButton />
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-y-auto">
          <div className="container mx-auto p-8 max-w-7xl">
            <div className="bg-white rounded-lg shadow-sm border p-6 min-h-full">
              {children}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
