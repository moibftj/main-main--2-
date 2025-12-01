import { describe, it, expect, vi, beforeEach } from 'vitest'
import { POST } from '@/app/api/create-profile/route'
import { NextRequest } from 'next/server'

// Mock dependencies
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn()
}))

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn()
}))

vi.mock('@/lib/rate-limit', () => ({
  createRateLimit: vi.fn(() => vi.fn().mockResolvedValue({
    headers: {},
    skipSuccessfulRequests: false
  }))
}))

describe('/api/create-profile', () => {
  let mockSupabaseServer: any
  let mockSupabaseService: any

  beforeEach(() => {
    vi.clearAllMocks()

    mockSupabaseServer = {
      auth: {
        getUser: vi.fn()
      }
    }

    mockSupabaseService = {
      from: vi.fn(() => ({
        upsert: vi.fn(),
        insert: vi.fn()
      }))
    }

    const { createClient } = require('@/lib/supabase/server')
    createClient.mockResolvedValue(mockSupabaseServer)

    const { createClient: createServiceClient } = require('@supabase/supabase-js')
    createServiceClient.mockReturnValue(mockSupabaseService)
  })

  describe('Authentication', () => {
    it('should reject unauthenticated requests', async () => {
      mockSupabaseServer.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'Not authenticated' }
      })

      const request = new NextRequest('http://localhost:3000/api/create-profile', {
        method: 'POST',
        body: JSON.stringify({
          userId: 'test-id',
          email: 'test@example.com',
          role: 'subscriber',
          fullName: 'Test User'
        })
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
    })

    it('should reject requests with mismatched user IDs', async () => {
      mockSupabaseServer.auth.getUser.mockResolvedValue({
        data: { user: { id: 'authenticated-user-id' } },
        error: null
      })

      const request = new NextRequest('http://localhost:3000/api/create-profile', {
        method: 'POST',
        body: JSON.stringify({
          userId: 'different-user-id',
          email: 'test@example.com',
          role: 'subscriber',
          fullName: 'Test User'
        })
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(403)
      expect(data.error).toBe('Unauthorized: Cannot create profile for another user')
    })
  })

  describe('Validation', () => {
    it('should validate required fields', async () => {
      mockSupabaseServer.auth.getUser.mockResolvedValue({
        data: { user: { id: 'test-id' } },
        error: null
      })

      const request = new NextRequest('http://localhost:3000/api/create-profile', {
        method: 'POST',
        body: JSON.stringify({
          // Missing email, role, fullName
          userId: 'test-id'
        })
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Missing required fields: email, role, fullName')
    })

    it('should validate role values', async () => {
      mockSupabaseServer.auth.getUser.mockResolvedValue({
        data: { user: { id: 'test-id' } },
        error: null
      })

      const request = new NextRequest('http://localhost:3000/api/create-profile', {
        method: 'POST',
        body: JSON.stringify({
          userId: 'test-id',
          email: 'test@example.com',
          role: 'invalid-role',
          fullName: 'Test User'
        })
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Invalid role. Must be subscriber, employee, or admin')
    })
  })

  describe('Profile Creation', () => {
    it('should create a subscriber profile successfully', async () => {
      mockSupabaseServer.auth.getUser.mockResolvedValue({
        data: { user: { id: 'test-id' } },
        error: null
      })

      const mockProfileData = {
        id: 'test-id',
        email: 'test@example.com',
        role: 'subscriber',
        full_name: 'Test User'
      }

      mockSupabaseService.from.mockReturnValue({
        upsert: vi.fn().mockResolvedValue({
          data: mockProfileData,
          error: null
        })
      })

      const request = new NextRequest('http://localhost:3000/api/create-profile', {
        method: 'POST',
        body: JSON.stringify({
          email: 'test@example.com',
          role: 'subscriber',
          fullName: 'Test User'
        })
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.profile).toEqual(mockProfileData)
      expect(data.message).toBe('Profile created successfully')
    })

    it('should create an employee profile with coupon', async () => {
      mockSupabaseServer.auth.getUser.mockResolvedValue({
        data: { user: { id: 'employee-id' } },
        error: null
      })

      const mockProfileData = {
        id: 'employee-id',
        email: 'employee@example.com',
        role: 'employee',
        full_name: 'Employee User'
      }

      const upsertMock = vi.fn().mockResolvedValue({
        data: mockProfileData,
        error: null
      })

      mockSupabaseService.from.mockReturnValue({
        upsert: upsertMock,
        insert: vi.fn().mockResolvedValue({
          data: null,
          error: null
        })
      })

      const request = new NextRequest('http://localhost:3000/api/create-profile', {
        method: 'POST',
        body: JSON.stringify({
          email: 'employee@example.com',
          role: 'employee',
          fullName: 'Employee User'
        })
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)

      // Verify coupon creation was attempted
      expect(mockSupabaseService.from).toHaveBeenCalledWith('employee_coupons')
    })

    it('should handle database errors gracefully', async () => {
      mockSupabaseServer.auth.getUser.mockResolvedValue({
        data: { user: { id: 'test-id' } },
        error: null
      })

      mockSupabaseService.from.mockReturnValue({
        upsert: vi.fn().mockResolvedValue({
          data: null,
          error: { message: 'Database constraint violation' }
        })
      })

      const request = new NextRequest('http://localhost:3000/api/create-profile', {
        method: 'POST',
        body: JSON.stringify({
          email: 'test@example.com',
          role: 'subscriber',
          fullName: 'Test User'
        })
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Failed to create profile')
    })
  })

  describe('Security', () => {
    it('should sanitize email input', async () => {
      mockSupabaseServer.auth.getUser.mockResolvedValue({
        data: { user: { id: 'test-id' } },
        error: null
      })

      const upsertMock = vi.fn().mockResolvedValue({
        data: { id: 'test-id' },
        error: null
      })

      mockSupabaseService.from.mockReturnValue({
        upsert: upsertMock
      })

      const request = new NextRequest('http://localhost:3000/api/create-profile', {
        method: 'POST',
        body: JSON.stringify({
          email: '  TEST@EXAMPLE.COM  ',
          role: 'subscriber',
          fullName: '  Test User  '
        })
      })

      await POST(request)

      expect(upsertMock).toHaveBeenCalledWith(
        expect.objectContaining({
          email: 'test@example.com', // Should be lowercase and trimmed
          full_name: 'Test User' // Should be trimmed
        }),
        expect.any(Object)
      )
    })
  })
})