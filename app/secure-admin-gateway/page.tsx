import { getAdminSessionWithRole } from '@/lib/auth/admin-session'
import { redirect } from 'next/navigation'

export default async function AdminGatewayPage() {
  const { session, isSuperUser, role } = await getAdminSessionWithRole()

  // If no session, redirect to login
  if (!session || role !== 'admin') {
    redirect('/secure-admin-gateway/login')
  }

  // Role-based redirection
  if (isSuperUser) {
    // Super admin gets full dashboard
    redirect('/secure-admin-gateway/dashboard')
  } else {
    // Regular admin gets review center
    redirect('/secure-admin-gateway/review')
  }
}