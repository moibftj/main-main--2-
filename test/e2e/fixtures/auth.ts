import { test as base, expect } from '@playwright/test'

// Define custom fixtures
export const test = base.extend({
  authenticatedPage: async ({ page }, use) => {
    // Log in as subscriber
    await page.goto('/auth/login')
    await page.fill('[data-testid="email-input"]', 'subscriber@example.com')
    await page.fill('[data-testid="password-input"]', 'password123')
    await page.click('[data-testid="login-button"]')
    await expect(page).toHaveURL('/dashboard/letters')

    await use(page)
  },

  adminPage: async ({ page }, use) => {
    // Log in as admin
    await page.goto('/secure-admin-gateway/login')
    await page.fill('[data-testid="admin-email-input"]', 'admin@lawfirm.com')
    await page.fill('[data-testid="admin-password-input"]', 'admin123!')
    await page.fill('[data-testid="portal-key-input"]', 'ADMIN-PORTAL-KEY-123')
    await page.click('[data-testid="admin-login-button"]')
    await expect(page).toHaveURL('/secure-admin-gateway/review')

    await use(page)
  }
})

export { expect }