import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// Test authentication flow across multiple API routes
describe('Authentication Flow Integration', () => {
  let mockSupabase: any

  beforeEach(() => {
    vi.clearAllMocks()

    // Reset all mocks
    vi.doMock('@/lib/supabase/server', () => ({
      createClient: vi.fn(() => mockSupabase)
    }))
  })

  describe('Complete User Registration Flow', () => {
    it('should register user and create profile', async () => {
      // Mock signup success
      mockSupabase = {
        auth: {
          signUp: vi.fn().mockResolvedValue({
            data: { user: { id: 'new-user-id', email: 'newuser@example.com' } },
            error: null
          }),
          getUser: vi.fn().mockResolvedValue({
            data: { user: { id: 'new-user-id', email: 'newuser@example.com' } },
            error: null
          })
        }
      }

      const { POST: signupRoute } = await import('@/app/api/auth/signup/route')

      // 1. Sign up new user
      const signupRequest = new NextRequest('http://localhost:3000/api/auth/signup', {
        method: 'POST',
        body: JSON.stringify({
          email: 'newuser@example.com',
          password: 'password123',
          fullName: 'New User',
          role: 'subscriber'
        })
      })

      const signupResponse = await signupRoute(signupRequest)
      const signupData = await signupResponse.json()

      expect(signupResponse.status).toBe(200)
      expect(signupData.success).toBe(true)
      expect(signupData.message).toContain('Confirmation email sent')

      // 2. After email confirmation, user logs in
      mockSupabase.auth.signInWithPassword = vi.fn().mockResolvedValue({
        data: { user: { id: 'new-user-id', email: 'newuser@example.com' } },
        error: null
      })

      const { POST: loginRoute } = await import('@/app/api/auth/login/route')

      const loginRequest = new NextRequest('http://localhost:3000/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          email: 'newuser@example.com',
          password: 'password123'
        })
      })

      const loginResponse = await loginRoute(loginRequest)
      const loginData = await loginResponse.json()

      expect(loginResponse.status).toBe(200)
      expect(loginData.success).toBe(true)

      // 3. Profile should be created automatically
      mockSupabase.from = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: {
                id: 'new-user-id',
                email: 'newuser@example.com',
                role: 'subscriber',
                full_name: 'New User'
              },
              error: null
            })
          })
        })
      })

      const { POST: createProfileRoute } = await import('@/app/api/create-profile/route')

      const profileRequest = new NextRequest('http://localhost:3000/api/create-profile', {
        method: 'POST',
        body: JSON.stringify({
          email: 'newuser@example.com',
          role: 'subscriber',
          fullName: 'New User'
        })
      })

      const profileResponse = await createProfileRoute(profileRequest)
      const profileData = await profileResponse.json()

      expect(profileResponse.status).toBe(200)
      expect(profileData.success).toBe(true)
    })
  })

  describe('Role-Based Access Control', () => {
    it('should enforce employee cannot access letters', async () => {
      // Mock employee user
      mockSupabase = {
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: { id: 'employee-id' } },
            error: null
          })
        },
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: { role: 'employee' },
                error: null
              })
            })
          })
        })
      }

      // Try to generate a letter
      const { POST: generateLetterRoute } = await import('@/app/api/generate-letter/route')

      const request = new NextRequest('http://localhost:3000/api/generate-letter', {
        method: 'POST',
        body: JSON.stringify({
          title: 'Test Letter',
          letterType: 'Demand Letter',
          intakeData: {
            recipient: 'John Doe',
            issue: 'Test issue'
          }
        })
      })

      const response = await generateLetterRoute(request)
      const data = await response.json()

      expect(response.status).toBe(403)
      expect(data.error).toBe('Only subscribers can generate letters')
    })

    it('should allow admin to access user management', async () => {
      // Mock admin user
      mockSupabase = {
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: { id: 'admin-id' } },
            error: null
          })
        },
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: { role: 'admin', is_super_user: true },
                error: null
              })
            })
          })
        })
      }

      // Access user list
      const { GET: getUsersRoute } = await import('@/app/api/admin/users/route')

      const request = new NextRequest('http://localhost:3000/api/admin/users')
      const response = await getUsersRoute(request)

      // Should not return unauthorized error
      expect(response.status).not.toBe(403)
    })
  })

  describe('Session Management', () => {
    it('should handle session expiration', async () => {
      // Mock expired session
      mockSupabase = {
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: null },
            error: { message: 'Invalid token' }
          })
        }
      }

      // Try to access protected route
      const { GET: checkSubscriptionRoute } = await import('@/app/api/subscriptions/check-allowance/route')

      const request = new NextRequest('http://localhost:3000/api/subscriptions/check-allowance')
      const response = await checkSubscriptionRoute(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
    })
  })

  describe('Password Reset Flow', () => {
    it('should complete full password reset flow', async () => {
      // 1. Request password reset
      mockSupabase = {
        auth: {
          resetPasswordForEmail: vi.fn().mockResolvedValue({
            data: {},
            error: null
          })
        }
      }

      const { POST: resetRequestRoute } = await import('@/app/api/auth/reset-password/route')

      const resetRequest = new NextRequest('http://localhost:3000/api/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({
          email: 'test@example.com'
        })
      })

      const resetResponse = await resetRequestRoute(resetRequest)
      const resetData = await resetResponse.json()

      expect(resetResponse.status).toBe(200)
      expect(resetData.success).toBe(true)

      // 2. Update password with valid token
      mockSupabase.auth.updateUser = vi.fn().mockResolvedValue({
        data: { user: { id: 'test-user-id' } },
        error: null
      })

      const { POST: updatePasswordRoute } = await import('@/app/api/auth/update-password/route')

      const updateRequest = new NextRequest('http://localhost:3000/api/auth/update-password', {
        method: 'POST',
        body: JSON.stringify({
          token: 'valid-reset-token',
          password: 'newPassword123'
        })
      })

      const updateResponse = await updatePasswordRoute(updateRequest)
      const updateData = await updateResponse.json()

      expect(updateResponse.status).toBe(200)
      expect(updateData.success).toBe(true)
    })
  })
})