import { test, expect } from '@playwright/test'

test.describe('Authentication', () => {
  test.beforeEach(async ({ page }) => {
    // Clear cookies and localStorage before each test
    await page.context().clearCookies()
    await page.evaluate(() => localStorage.clear())
  })

  test('user can sign up', async ({ page }) => {
    await page.goto('/auth/signup')

    // Fill signup form
    await page.fill('[data-testid="email-input"]', 'newuser@example.com')
    await page.fill('[data-testid="password-input"]', 'Password123!')
    await page.fill('[data-testid="confirm-password-input"]', 'Password123!')
    await page.fill('[data-testid="full-name-input"]', 'New User')
    await page.selectOption('[data-testid="role-select"]', 'subscriber')

    // Submit form
    await page.click('[data-testid="signup-button"]')

    // Should show confirmation message
    await expect(page.locator('[data-testid="success-message"]')).toBeVisible()
    await expect(page.locator('text=Confirmation email sent')).toBeVisible()
  })

  test('user can log in', async ({ page }) => {
    // First login
    await page.goto('/auth/login')

    await page.fill('[data-testid="email-input"]', 'test@example.com')
    await page.fill('[data-testid="password-input"]', 'password123')
    await page.click('[data-testid="login-button"]')

    // Should redirect to dashboard
    await expect(page).toHaveURL('/dashboard/letters')
    await expect(page.locator('[data-testid="user-menu"]')).toBeVisible()
  })

  test('shows error for invalid credentials', async ({ page }) => {
    await page.goto('/auth/login')

    await page.fill('[data-testid="email-input"]', 'test@example.com')
    await page.fill('[data-testid="password-input"]', 'wrongpassword')
    await page.click('[data-testid="login-button"]')

    await expect(page.locator('[data-testid="error-message"]')).toBeVisible()
    await expect(page.locator('text=Invalid login credentials')).toBeVisible()
  })

  test('user can reset password', async ({ page }) => {
    await page.goto('/auth/forgot-password')

    await page.fill('[data-testid="email-input"]', 'test@example.com')
    await page.click('[data-testid="reset-button"]')

    await expect(page.locator('[data-testid="success-message"]')).toBeVisible()
    await expect(page.locator('text=Password reset email sent')).toBeVisible()
  })

  test('redirects unauthenticated user from protected routes', async ({ page }) => {
    // Try to access dashboard without authentication
    await page.goto('/dashboard/letters')

    // Should redirect to login
    await expect(page).toHaveURL('/auth/login?redirectTo=%2Fdashboard%2Fletters')
  })

  test('maintains session after page reload', async ({ page }) => {
    // Log in first
    await page.goto('/auth/login')
    await page.fill('[data-testid="email-input"]', 'test@example.com')
    await page.fill('[data-testid="password-input"]', 'password123')
    await page.click('[data-testid="login-button"]')

    // Verify logged in
    await expect(page).toHaveURL('/dashboard/letters')

    // Reload page
    await page.reload()

    // Should still be logged in
    await expect(page).toHaveURL('/dashboard/letters')
    await expect(page.locator('[data-testid="user-menu"]')).toBeVisible()
  })

  test('user can log out', async ({ page }) => {
    // Log in first
    await page.goto('/auth/login')
    await page.fill('[data-testid="email-input"]', 'test@example.com')
    await page.fill('[data-testid="password-input"]', 'password123')
    await page.click('[data-testid="login-button"]')

    // Click user menu and logout
    await page.click('[data-testid="user-menu"]')
    await page.click('[data-testid="logout-button"]')

    // Should redirect to login
    await expect(page).toHaveURL('/auth/login')

    // Try to access protected route
    await page.goto('/dashboard/letters')
    await expect(page).toHaveURL('/auth/login')
  })
})