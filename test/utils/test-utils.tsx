import { render, RenderOptions } from '@testing-library/react'
import { ReactElement } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { SupabaseClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/client'

// Create a test query client
const createTestQueryClient = () => {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0
      },
      mutations: {
        retry: false
      }
    }
  })
}

// Test wrapper component
interface AllTheProvidersProps {
  children: React.ReactNode
  queryClient?: QueryClient
  supabaseClient?: SupabaseClient
}

const AllTheProviders = ({ children, queryClient, supabaseClient }: AllTheProvidersProps) => {
  const testQueryClient = queryClient || createTestQueryClient()
  const testSupabaseClient = supabaseClient || createClient()

  return (
    <QueryClientProvider client={testQueryClient}>
      {children}
    </QueryClientProvider>
  )
}

// Custom render function
const customRender = (
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'> & {
    queryClient?: QueryClient
    supabaseClient?: SupabaseClient
  }
) => {
  const { queryClient, supabaseClient, ...renderOptions } = options || {}

  return render(ui, {
    wrapper: ({ children }) => (
      <AllTheProviders
        queryClient={queryClient}
        supabaseClient={supabaseClient}
      >
        {children}
      </AllTheProviders>
    ),
    ...renderOptions
  })
}

// Mock user data
export const mockUser = {
  id: 'test-user-id',
  email: 'test@example.com',
  role: 'subscriber' as const,
  full_name: 'Test User',
  created_at: '2024-01-01T00:00:00Z'
}

// Mock profiles data
export const mockProfiles = {
  subscriber: {
    ...mockUser,
    role: 'subscriber' as const,
    is_super_user: false
  },
  employee: {
    ...mockUser,
    id: 'employee-id',
    email: 'employee@example.com',
    role: 'employee' as const,
    is_super_user: false
  },
  admin: {
    ...mockUser,
    id: 'admin-id',
    email: 'admin@example.com',
    role: 'admin' as const,
    is_super_user: true
  }
}

// Mock letter data
export const mockLetter = {
  id: 'letter-1',
  user_id: mockUser.id,
  title: 'Test Letter',
  letter_type: 'Demand Letter',
  status: 'pending_review' as const,
  intake_data: {
    recipient: 'John Doe',
    address: '123 Main St',
    issue: 'Breach of contract'
  },
  ai_draft_content: 'Dear John Doe,\n\nThis is a test letter content.',
  final_content: null,
  reviewed_by: null,
  reviewed_at: null,
  review_notes: null,
  rejection_reason: null,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  completed_at: null
}

// Mock subscription data
export const mockSubscription = {
  id: 'sub-1',
  user_id: mockUser.id,
  plan: 'monthly' as const,
  status: 'active' as const,
  price: 299,
  discount: 0,
  coupon_code: null,
  employee_id: null,
  credits_remaining: 4,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  expires_at: '2024-02-01T00:00:00Z'
}

// Re-export everything from testing-library
export * from '@testing-library/react'
export { customRender as render }