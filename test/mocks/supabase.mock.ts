import { vi } from 'vitest'
import { SupabaseClient } from '@supabase/supabase-js'

export const createMockSupabaseClient = (overrides?: Partial<SupabaseClient>) => {
  return {
    auth: {
      getUser: vi.fn(),
      signInWithPassword: vi.fn(),
      signUp: vi.fn(),
      signOut: vi.fn(),
      resetPasswordForEmail: vi.fn(),
      updateUser: vi.fn(),
      onAuthStateChange: vi.fn(() => ({
        data: { subscription: { unsubscribe: vi.fn() } }
      }))
    },
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(),
          data: null,
          error: null
        })),
        in: vi.fn(() => ({
          data: [],
          error: null
        })),
        order: vi.fn(() => ({
          data: [],
          error: null
        })),
        limit: vi.fn(() => ({
          data: [],
          error: null
        }))
      })),
      insert: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      upsert: vi.fn(),
      data: null,
      error: null
    })),
    rpc: vi.fn(),
    storage: {
      from: vi.fn(() => ({
        upload: vi.fn(),
        download: vi.fn(),
        getPublicUrl: vi.fn(),
        remove: vi.fn()
      }))
    },
    channel: vi.fn(() => ({
      on: vi.fn(),
      subscribe: vi.fn(),
      unsubscribe: vi.fn()
    })),
    functions: {
      invoke: vi.fn()
    },
    ...overrides
  } as any
}

// Helper to mock successful auth
export const mockAuthSuccess = (user: any = null) => ({
  data: { user },
  error: null
})

// Helper to mock auth error
export const mockAuthError = (error: string = 'Authentication failed') => ({
  data: { user: null },
  error: { message: error }
})

// Helper to mock database query success
export const mockQuerySuccess = (data: any = []) => ({
  data,
  error: null
})

// Helper to mock database query error
export const mockQueryError = (error: string = 'Query failed') => ({
  data: null,
  error: { message: error }
})