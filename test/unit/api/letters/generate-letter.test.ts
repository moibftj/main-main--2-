import { describe, it, expect, vi, beforeEach } from 'vitest'
import { POST } from '@/app/api/generate-letter/route'
import { NextRequest } from 'next/server'
import { generateText } from 'ai'

// Mock dependencies
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn()
}))

vi.mock('ai', () => ({
  generateText: vi.fn()
}))

vi.mock('@ai-sdk/openai', () => ({
  openai: vi.fn(() => ({}))
}))

vi.mock('@/lib/rate-limit-redis', () => ({
  letterGenerationRateLimit: {
    limit: vi.fn().mockResolvedValue({
      success: true,
      limit: 5,
      remaining: 4,
      reset: Date.now() + 3600000
    })
  }
}))

describe('/api/generate-letter', () => {
  let mockSupabase: any

  beforeEach(() => {
    vi.clearAllMocks()

    mockSupabase = {
      auth: {
        getUser: vi.fn()
      },
      from: vi.fn()
    }

    const { createClient } = require('@/lib/supabase/server')
    createClient.mockResolvedValue(mockSupabase)

    // Mock generateText success
    ;(generateText as any).mockResolvedValue({
      text: 'Generated letter content'
    })
  })

  describe('Authentication & Authorization', () => {
    it('should reject unauthenticated requests', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'Not authenticated' }
      })

      const request = new NextRequest('http://localhost:3000/api/generate-letter', {
        method: 'POST',
        body: JSON.stringify({
          title: 'Test Letter',
          letterType: 'Demand Letter',
          intakeData: {
            recipient: 'John Doe',
            issue: 'Breach of contract'
          }
        })
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
    })

    it('should reject non-subscriber role', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'employee-id' } },
        error: null
      })

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { role: 'employee' },
              error: null
            })
          })
        })
      })

      const request = new NextRequest('http://localhost:3000/api/generate-letter', {
        method: 'POST',
        body: JSON.stringify({
          title: 'Test Letter',
          letterType: 'Demand Letter',
          intakeData: {
            recipient: 'John Doe',
            issue: 'Breach of contract'
          }
        })
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(403)
      expect(data.error).toBe('Only subscribers can generate letters')
    })
  })

  describe('Letter Generation', () => {
    it('should generate letter for new subscriber (free trial)', async () => {
      // Mock authenticated user
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'subscriber-id' } },
        error: null
      })

      // Mock subscriber profile
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'profiles') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: { role: 'subscriber' },
                  error: null
                })
              })
            })
          }
        }
        if (table === 'letters') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({
                data: [], // No existing letters
                error: null
              })
            })
          }
        }
        if (table === 'subscriptions') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({
                data: null, // No subscription yet
                error: null
              })
            })
          }
        }
        return { insert: vi.fn() }
      })

      const request = new NextRequest('http://localhost:3000/api/generate-letter', {
        method: 'POST',
        body: JSON.stringify({
          title: 'Test Letter',
          letterType: 'Demand Letter',
          intakeData: {
            recipient: 'John Doe',
            address: '123 Main St',
            issue: 'Breach of contract',
            details: 'Failed to deliver goods'
          }
        })
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.content).toBe('Generated letter content')
      expect(data.isFirstLetter).toBe(true)
      expect(generateText).toHaveBeenCalledWith(
        expect.objectContaining({
          model: expect.any(Function),
          system: expect.stringContaining('professional legal attorney'),
          prompt: expect.stringContaining('Generate a professional legal letter'),
          temperature: 0.7,
          maxTokens: 2048
        })
      )
    })

    it('should check subscription credits for existing subscriber', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'subscriber-id' } },
        error: null
      })

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'profiles') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: { role: 'subscriber' },
                  error: null
                })
              })
            })
          }
        }
        if (table === 'letters') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({
                data: [{ id: '1' }], // Has existing letters
                error: null
              })
            })
          }
        }
        if (table === 'subscriptions') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: {
                    status: 'active',
                    credits_remaining: 2
                  },
                  error: null
                })
              })
            })
          }
        }
        return { insert: vi.fn(), rpc: vi.fn() }
      })

      const request = new NextRequest('http://localhost:3000/api/generate-letter', {
        method: 'POST',
        body: JSON.stringify({
          title: 'Test Letter',
          letterType: 'Cease and Desist',
          intakeData: {
            recipient: 'Jane Smith',
            issue: 'Copyright infringement'
          }
        })
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.isFirstLetter).toBe(false)
    })

    it('should reject when no credits available', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'subscriber-id' } },
        error: null
      })

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'profiles') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: { role: 'subscriber' },
                  error: null
                })
              })
            })
          }
        }
        if (table === 'letters') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({
                data: [{ id: '1' }], // Has existing letters
                error: null
              })
            })
          }
        }
        if (table === 'subscriptions') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: {
                    status: 'active',
                    credits_remaining: 0
                  },
                  error: null
                })
              })
            })
          }
        }
        return { insert: vi.fn() }
      })

      const request = new NextRequest('http://localhost:3000/api/generate-letter', {
        method: 'POST',
        body: JSON.stringify({
          title: 'Test Letter',
          letterType: 'Demand Letter',
          intakeData: {
            recipient: 'John Doe',
            issue: 'Breach of contract'
          }
        })
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('No letter credits remaining')
    })
  })

  describe('Rate Limiting', () => {
    it('should apply rate limiting', async () => {
      const { letterGenerationRateLimit } = require('@/lib/rate-limit-redis')

      // Mock rate limit exceeded
      letterGenerationRateLimit.limit.mockResolvedValue({
        success: false,
        limit: 5,
        remaining: 0,
        reset: Date.now() + 3600000
      })

      const request = new NextRequest('http://localhost:3000/api/generate-letter', {
        method: 'POST',
        body: JSON.stringify({
          title: 'Test Letter',
          letterType: 'Demand Letter',
          intakeData: {
            recipient: 'John Doe',
            issue: 'Breach of contract'
          }
        })
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(429)
      expect(data.error).toContain('Rate limit exceeded')
    })
  })

  describe('Input Validation', () => {
    it('should validate required fields', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'subscriber-id' } },
        error: null
      })

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { role: 'subscriber' },
              error: null
            })
          })
        })
      })

      const request = new NextRequest('http://localhost:3000/api/generate-letter', {
        method: 'POST',
        body: JSON.stringify({
          // Missing title, letterType, intakeData
        })
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Missing required fields')
    })
  })
})