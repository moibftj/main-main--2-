import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@/test/utils/test-utils'
import userEvent from '@testing-library/user-event'
import LoginForm from '@/app/auth/login/page'

// Mock the router
const mockPush = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: vi.fn(),
    refresh: vi.fn()
  }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/auth/login'
}))

// Mock Supabase auth
const mockSignIn = vi.fn()
vi.mock('@/lib/supabase/client', () => ({
  createClient: vi.fn(() => ({
    auth: {
      signInWithPassword: mockSignIn,
      getUser: vi.fn()
    }
  }))
}))

describe('LoginForm', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockPush.mockClear()
  })

  it('should render login form with all fields', () => {
    render(<LoginForm />)

    expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument()
    expect(screen.getByText(/forgot password\?/i)).toBeInTheDocument()
    expect(screen.getByText(/don't have an account\?/i)).toBeInTheDocument()
  })

  it('should show validation errors for empty fields', async () => {
    const user = userEvent.setup()
    render(<LoginForm />)

    const submitButton = screen.getByRole('button', { name: /sign in/i })
    await user.click(submitButton)

    // HTML5 validation should trigger
    const emailInput = screen.getByLabelText(/email/i)
    const passwordInput = screen.getByLabelText(/password/i)

    expect(emailInput).toBeInvalid()
    expect(passwordInput).toBeInvalid()
  })

  it('should handle successful login', async () => {
    const user = userEvent.setup()

    mockSignIn.mockResolvedValue({
      data: { user: { id: 'test-user-id', email: 'test@example.com' } },
      error: null
    })

    render(<LoginForm />)

    const emailInput = screen.getByLabelText(/email/i)
    const passwordInput = screen.getByLabelText(/password/i)
    const submitButton = screen.getByRole('button', { name: /sign in/i })

    await user.type(emailInput, 'test@example.com')
    await user.type(passwordInput, 'password123')
    await user.click(submitButton)

    await waitFor(() => {
      expect(mockSignIn).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123'
      })
    })

    expect(screen.getByText('Signing in...')).toBeInTheDocument()
  })

  it('should handle login error', async () => {
    const user = userEvent.setup()

    mockSignIn.mockResolvedValue({
      data: { user: null },
      error: { message: 'Invalid login credentials' }
    })

    render(<LoginForm />)

    const emailInput = screen.getByLabelText(/email/i)
    const passwordInput = screen.getByLabelText(/password/i)
    const submitButton = screen.getByRole('button', { name: /sign in/i })

    await user.type(emailInput, 'test@example.com')
    await user.type(passwordInput, 'wrongpassword')
    await user.click(submitButton)

    await waitFor(() => {
      expect(screen.getByText('Invalid login credentials')).toBeInTheDocument()
    })

    expect(mockPush).not.toHaveBeenCalled()
  })

  it('should show loading state during submission', async () => {
    const user = userEvent.setup()

    // Mock a slow response
    mockSignIn.mockImplementation(() => new Promise(resolve => {
      setTimeout(() => {
        resolve({
          data: { user: { id: 'test-user-id' } },
          error: null
        })
      }, 100)
    }))

    render(<LoginForm />)

    const emailInput = screen.getByLabelText(/email/i)
    const passwordInput = screen.getByLabelText(/password/i)
    const submitButton = screen.getByRole('button', { name: /sign in/i })

    await user.type(emailInput, 'test@example.com')
    await user.type(passwordInput, 'password123')
    await user.click(submitButton)

    // Check loading state
    expect(screen.getByText('Signing in...')).toBeInTheDocument()
    expect(submitButton).toBeDisabled()

    // Wait for completion
    await waitFor(() => {
      expect(screen.getByText('Sign in')).toBeInTheDocument()
    }, { timeout: 200 })
  })

  it('should redirect to specified URL after login', async () => {
    const user = userEvent.setup()

    mockSignIn.mockResolvedValue({
      data: { user: { id: 'test-user-id', email: 'test@example.com' } },
      error: null
    })

    // Mock search params with redirect URL
    vi.mocked(useSearchParams).mockReturnValue(
      new URLSearchParams('redirectTo=/dashboard/letters')
    )

    render(<LoginForm />)

    const emailInput = screen.getByLabelText(/email/i)
    const passwordInput = screen.getByLabelText(/password/i)
    const submitButton = screen.getByRole('button', { name: /sign in/i })

    await user.type(emailInput, 'test@example.com')
    await user.type(passwordInput, 'password123')
    await user.click(submitButton)

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/dashboard/letters')
    })
  })

  it('should handle profile creation after login', async () => {
    const user = userEvent.setup()

    mockSignIn.mockResolvedValue({
      data: { user: { id: 'test-user-id', email: 'test@example.com' } },
      error: null
    })

    // Mock fetch for profile creation
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true })
    }) as any

    render(<LoginForm />)

    const emailInput = screen.getByLabelText(/email/i)
    const passwordInput = screen.getByLabelText(/password/i)
    const submitButton = screen.getByRole('button', { name: /sign in/i })

    await user.type(emailInput, 'test@example.com')
    await user.type(passwordInput, 'password123')
    await user.click(submitButton)

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/create-profile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email: 'test@example.com',
          role: 'subscriber',
          fullName: 'Test User'
        })
      })
    })
  })

  it('should navigate to signup page', async () => {
    const user = userEvent.setup()
    render(<LoginForm />)

    const signupLink = screen.getByText(/don't have an account\?/i).closest('a')
    await user.click(signupLink!)

    // The link should have the correct href
    expect(signupLink).toHaveAttribute('href', '/auth/signup')
  })

  it('should navigate to forgot password page', async () => {
    const user = userEvent.setup()
    render(<LoginForm />)

    const forgotPasswordLink = screen.getByText(/forgot password\?/i).closest('a')
    await user.click(forgotPasswordLink!)

    expect(forgotPasswordLink).toHaveAttribute('href', '/auth/forgot-password')
  })
})