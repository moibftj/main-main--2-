import { test, expect } from '@playwright/test'

test.describe('Admin Portal', () => {
  test.beforeEach(async ({ page }) => {
    // Go to admin login
    await page.goto('/secure-admin-gateway/login')
  })

  test('admin can log in to admin portal', async ({ page }) => {
    await page.fill('[data-testid="admin-email-input"]', 'admin@lawfirm.com')
    await page.fill('[data-testid="admin-password-input"]', 'admin123!')
    await page.fill('[data-testid="portal-key-input"]', 'ADMIN-PORTAL-KEY-123')
    await page.click('[data-testid="admin-login-button"]')

    // Should redirect to admin dashboard
    await expect(page).toHaveURL('/secure-admin-gateway/review')
    await expect(page.locator('[data-testid="admin-header"]')).toBeVisible()
  })

  test('rejects invalid admin credentials', async ({ page }) => {
    await page.fill('[data-testid="admin-email-input"]', 'admin@lawfirm.com')
    await page.fill('[data-testid="admin-password-input"]', 'wrongpassword')
    await page.fill('[data-testid="portal-key-input"]', 'ADMIN-PORTAL-KEY-123')
    await page.click('[data-testid="admin-login-button"]')

    await expect(page.locator('[data-testid="error-message"]')).toBeVisible()
    await expect(page.locator('text=Invalid credentials')).toBeVisible()
  })

  test('requires portal key', async ({ page }) => {
    await page.fill('[data-testid="admin-email-input"]', 'admin@lawfirm.com')
    await page.fill('[data-testid="admin-password-input"]', 'admin123!')
    await page.click('[data-testid="admin-login-button"]')

    await expect(page.locator('[data-testid="error-message"]')).toBeVisible()
    await expect(page.locator('text=Portal key is required')).toBeVisible()
  })

  test('can review pending letters', async ({ page }) => {
    // Log in as admin
    await page.fill('[data-testid="admin-email-input"]', 'admin@lawfirm.com')
    await page.fill('[data-testid="admin-password-input"]', 'admin123!')
    await page.fill('[data-testid="portal-key-input"]', 'ADMIN-PORTAL-KEY-123')
    await page.click('[data-testid="admin-login-button"]')

    // Should see pending letters
    await expect(page.locator('[data-testid="pending-letters-list"]')).toBeVisible()
    await expect(page.locator('[data-testid="letter-card"]')).toHaveCount.greaterThan(0)

    // Click on first letter
    await page.click('[data-testid="letter-card"]:first-child')

    // Should see letter details
    await expect(page.locator('[data-testid="letter-content"]')).toBeVisible()
    await expect(page.locator('[data-testid="approve-button"]')).toBeVisible()
    await expect(page.locator('[data-testid="reject-button"]')).toBeVisible()
  })

  test('can approve letter', async ({ page }) => {
    // Log in as admin
    await page.fill('[data-testid="admin-email-input"]', 'admin@lawfirm.com')
    await page.fill('[data-testid="admin-password-input"]', 'admin123!')
    await page.fill('[data-testid="portal-key-input"]', 'ADMIN-PORTAL-KEY-123')
    await page.click('[data-testid="admin-login-button"]')

    // Click on first letter
    await page.click('[data-testid="letter-card"]:first-child')

    // Approve letter
    await page.click('[data-testid="approve-button"]')
    await page.fill('[data-testid="review-notes"]', 'Looks good. Approved.')
    await page.click('[data-testid="confirm-approve-button"]')

    // Should show success message
    await expect(page.locator('[data-testid="toast-message"]')).toBeVisible()
    await expect(page.locator('text=Letter approved')).toBeVisible()

    // Letter should move from pending
    await expect(page.locator('[data-testid="letter-card"]')).toHaveCount(0)
  })

  test('can reject letter with reason', async ({ page }) => {
    // Log in as admin
    await page.fill('[data-testid="admin-email-input"]', 'admin@lawfirm.com')
    await page.fill('[data-testid="admin-password-input"]', 'admin123!')
    await page.fill('[data-testid="portal-key-input"]', 'ADMIN-PORTAL-KEY-123')
    await page.click('[data-testid="admin-login-button"]')

    // Click on first letter
    await page.click('[data-testid="letter-card"]:first-child')

    // Reject letter
    await page.click('[data-testid="reject-button"]')
    await page.fill('[data-testid="rejection-reason"]', 'Insufficient information. Please provide more details.')
    await page.click('[data-testid="confirm-reject-button"]')

    // Should show success message
    await expect(page.locator('[data-testid="toast-message"]')).toBeVisible()
    await expect(page.locator('text=Letter rejected')).toBeVisible()
  })

  test('can improve letter with AI', async ({ page }) => {
    // Log in as admin
    await page.fill('[data-testid="admin-email-input"]', 'admin@lawfirm.com')
    await page.fill('[data-testid="admin-password-input"]', 'admin123!')
    await page.fill('[data-testid="portal-key-input"]', 'ADMIN-PORTAL-KEY-123')
    await page.click('[data-testid="admin-login-button"]')

    // Click on first letter
    await page.click('[data-testid="letter-card"]:first-child')

    // Switch to edit tab
    await page.click('[data-testid="edit-tab"]')

    // Select text and improve
    await page.fill('[data-testid="improvement-prompt"]', 'Make this more professional and add legal citations')
    await page.click('[data-testid="improve-button"]')

    // Should show improvement progress
    await expect(page.locator('[data-testid="improvement-loading"]')).toBeVisible()

    // Wait for improvement
    await expect(page.locator('[data-testid="improved-content"]')).toBeVisible({ timeout: 30000 })
  })

  test('can access user management', async ({ page }) => {
    // Log in as super admin
    await page.fill('[data-testid="admin-email-input"]', 'superadmin@lawfirm.com')
    await page.fill('[data-testid="admin-password-input"]', 'superadmin123!')
    await page.fill('[data-testid="portal-key-input"]', 'SUPER-ADMIN-KEY')
    await page.click('[data-testid="admin-login-button"]')

    // Navigate to users
    await page.click('[data-testid="users-menu-item"]')

    // Should see users list
    await expect(page).toHaveURL('/secure-admin-gateway/dashboard/users')
    await expect(page.locator('[data-testid="users-table"]')).toBeVisible()
    await expect(page.locator('[data-testid="user-row"]')).toHaveCount.greaterThan(0)

    // Can promote user
    await page.click('[data-testid="promote-user-button"]:first-child')
    await page.selectOption('[data-testid="role-select"]', 'admin')
    await page.click('[data-testid="confirm-promote-button"]')

    // Should show success
    await expect(page.locator('[data-testid="toast-message"]')).toBeVisible()
  })

  test('can view analytics', async ({ page }) => {
    // Log in as admin
    await page.fill('[data-testid="admin-email-input"]', 'admin@lawfirm.com')
    await page.fill('[data-testid="admin-password-input"]', 'admin123!')
    await page.fill('[data-testid="portal-key-input"]', 'ADMIN-PORTAL-KEY-123')
    await page.click('[data-testid="admin-login-button"]')

    // Navigate to analytics
    await page.click('[data-testid="analytics-menu-item"]')

    // Should see analytics dashboard
    await expect(page).toHaveURL('/secure-admin-gateway/dashboard/analytics')
    await expect(page.locator('[data-testid="stats-cards"]')).toBeVisible()
    await expect(page.locator('[data-testid="revenue-chart"]')).toBeVisible()
    await expect(page.locator('[data-testid="letters-chart"]')).toBeVisible()
  })

  test('session times out after inactivity', async ({ page }) => {
    // Log in as admin
    await page.fill('[data-testid="admin-email-input"]', 'admin@lawfirm.com')
    await page.fill('[data-testid="admin-password-input"]', 'admin123!')
    await page.fill('[data-testid="portal-key-input"]', 'ADMIN-PORTAL-KEY-123')
    await page.click('[data-testid="admin-login-button"]')

    // Wait for session timeout (speed up time)
    await page.evaluate(() => {
      // Mock session timeout
      window.dispatchEvent(new Event('session-timeout'))
    })

    // Should redirect to login
    await expect(page).toHaveURL('/secure-admin-gateway/login')
    await expect(page.locator('[data-testid="timeout-message"]')).toBeVisible()
  })
})