'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

export default function SignUpPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [role, setRole] = useState<'subscriber' | 'employee'>('subscriber')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    if (password !== confirmPassword) {
      setError('Passwords do not match')
      setLoading(false)
      return
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters')
      setLoading(false)
      return
    }

    try {
      let redirectUrl = '/dashboard'
      if (process.env.NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL) {
        redirectUrl = process.env.NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL
      } else if (typeof window !== 'undefined') {
        // Redirect to role-specific dashboard after email confirmation
        const roleRedirects: Record<string, string> = {
          'subscriber': '/dashboard/letters',
          'employee': '/dashboard/commissions'
        }
        redirectUrl = window.location.origin + roleRedirects[role]
      }

      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            full_name: fullName,
            role: role
          }
        }
      })

      if (signUpError) throw signUpError

      if (authData.user) {
        // Create profile using server API with service role
        try {
          const response = await fetch('/api/create-profile', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              userId: authData.user.id,
              email: authData.user.email || email,
              role: role,
              fullName: fullName
            })
          })

          const result = await response.json()

          if (!response.ok) {
            console.error('Profile creation error:', result.error)
            // Don't throw error immediately - try to continue
            console.warn('Profile creation failed, but continuing with signup process')
          } else {
            console.log('Profile created successfully:', result.profile)
          }
        } catch (err) {
          console.error('Unexpected error during profile creation:', err)
          // Continue with signup even if profile creation fails
          console.warn('Continuing with signup despite profile error')
        }

        // If employee, create a coupon code
        if (role === 'employee') {
          try {
            const couponCode = `TTML${Math.random().toString(36).substring(2, 8).toUpperCase()}`
            const { error: couponError } = await supabase
              .from('employee_coupons')
              .insert({
                employee_id: authData.user.id,
                code: couponCode,
                discount_percent: 20,
                is_active: true
              })

            if (couponError) {
              console.error('Coupon creation error:', couponError)
              console.warn('Failed to create employee coupon, but continuing signup')
            } else {
              console.log('Employee coupon created successfully:', couponCode)
            }
          } catch (err) {
            console.error('Unexpected error during coupon creation:', err)
            console.warn('Continuing with signup despite coupon error')
          }
        }
      }

      router.push('/auth/check-email')
    } catch (err: any) {
      setError(err.message || 'Failed to create account')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-muted/30 to-muted p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold">Create Account</CardTitle>
          <CardDescription>
            Join Talk-To-My-Lawyer as a subscriber or employee
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSignUp} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="fullName">Full Name</Label>
              <Input
                id="fullName"
                type="text"
                placeholder="John Doe"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                disabled={loading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="role">Account Type</Label>
              <Select value={role} onValueChange={(value: any) => setRole(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="subscriber">Subscriber - Generate Letters</SelectItem>
                  <SelectItem value="employee">Employee - Earn Commissions</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                disabled={loading}
              />
            </div>
            {error && (
              <div className="p-3 text-sm text-destructive bg-destructive/10 rounded-md">
                {error}
              </div>
            )}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Creating account...' : 'Sign Up'}
            </Button>
          </form>
          <div className="mt-4 text-center text-sm">
            Already have an account?{' '}
            <Link href="/auth/login" className="text-primary hover:text-primary/80 hover:underline">
              Sign in
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
