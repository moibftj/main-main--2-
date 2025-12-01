import { test, expect } from '@playwright/test'

test.describe('Letter Generation', () => {
  test.beforeEach(async ({ page }) => {
    // Log in as subscriber
    await page.goto('/auth/login')
    await page.fill('[data-testid="email-input"]', 'subscriber@example.com')
    await page.fill('[data-testid="password-input"]', 'password123')
    await page.click('[data-testid="login-button"]')
    await expect(page).toHaveURL('/dashboard/letters')
  })

  test('can create a new letter', async ({ page }) => {
    // Click "New Letter" button
    await page.click('[data-testid="new-letter-button"]')

    // Should be on letter type selection
    await expect(page).toHaveURL('/dashboard/letters/new')

    // Select letter type
    await page.click('[data-testid="letter-type-demand-letter"]')

    // Fill form
    await page.fill('[data-testid="recipient-name"]', 'John Doe')
    await page.fill('[data-testid="recipient-address"]', '123 Main St, City, State 12345')
    await page.fill('[data-testid="issue-description"]', 'Breach of contract for unpaid services')
    await page.fill('[data-testid="additional-details"]', 'Services were provided on January 1st but payment was never received.')

    // Submit form
    await page.click('[data-testid="generate-letter-button"]')

    // Should show generation progress
    await expect(page.locator('[data-testid="generation-modal"]')).toBeVisible()

    // Wait for generation to complete
    await expect(page.locator('text=Letter generated successfully')).toBeVisible({ timeout: 30000 })

    // Should redirect to letter details
    await expect(page).toHaveURL(/\/dashboard\/letters\/[a-f0-9-]+/)
  })

  test('first letter is free', async ({ page }) => {
    // New user with no letters
    await page.goto('/dashboard/letters/new')

    // Select letter type
    await page.click('[data-testid="letter-type-demand-letter"]')

    // Fill minimal form
    await page.fill('[data-testid="recipient-name"]', 'John Doe')
    await page.fill('[data-testid="issue-description"]', 'Test issue')

    // Should show free trial message
    await expect(page.locator('[data-testid="free-trial-badge"]')).toBeVisible()
    await expect(page.locator('text=First letter is free')).toBeVisible()
  })

  test('shows subscription upgrade when no credits', async ({ page }) => {
    // Mock user with no credits
    await page.route('/api/subscriptions/check-allowance', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          hasCredits: false,
          creditsRemaining: 0,
          isFirstLetter: false,
          canGenerate: false
        })
      })
    })

    await page.goto('/dashboard/letters/new')
    await page.click('[data-testid="letter-type-demand-letter"]')

    // Should show upgrade modal
    await expect(page.locator('[data-testid="upgrade-modal"]')).toBeVisible()
    await expect(page.locator('text=No letter credits remaining')).toBeVisible()

    // Click upgrade button
    await page.click('[data-testid="upgrade-button"]')

    // Should redirect to subscription page
    await expect(page).toHaveURL('/dashboard/subscription')
  })

  test('can save draft letter', async ({ page }) => {
    await page.goto('/dashboard/letters/new')
    await page.click('[data-testid="letter-type-demand-letter"]')

    // Fill form
    await page.fill('[data-testid="recipient-name"]', 'Jane Smith')
    await page.fill('[data-testid="issue-description"]', 'Copyright infringement')

    // Save as draft
    await page.click('[data-testid="save-draft-button"]')

    // Should show success message
    await expect(page.locator('[data-testid="toast-message"]')).toBeVisible()
    await expect(page.locator('text=Letter saved as draft')).toBeVisible()
  })

  test('validates required fields', async ({ page }) => {
    await page.goto('/dashboard/letters/new')
    await page.click('[data-testid="letter-type-demand-letter"]')

    // Try to generate without filling form
    await page.click('[data-testid="generate-letter-button"]')

    // Should show validation errors
    await expect(page.locator('[data-testid="field-error-recipient-name"]')).toBeVisible()
    await expect(page.locator('[data-testid="field-error-issue-description"]')).toBeVisible()
  })

  test('can edit letter after generation', async ({ page }) => {
    // Generate a letter first
    await page.goto('/dashboard/letters/new')
    await page.click('[data-testid="letter-type-demand-letter"]')
    await page.fill('[data-testid="recipient-name"]', 'Test Recipient')
    await page.fill('[data-testid="issue-description"]', 'Test issue')
    await page.click('[data-testid="generate-letter-button"]')

    // Wait for generation
    await expect(page.locator('text=Letter generated successfully')).toBeVisible({ timeout: 30000 })

    // Click edit button
    await page.click('[data-testid="edit-letter-button"]')

    // Should enable editing
    await expect(page.locator('[data-testid="letter-editor"]')).toBeVisible()
    await expect(page.locator('[data-testid="save-changes-button"]')).toBeVisible()
  })

  test('can download PDF', async ({ page }) => {
    // Generate a letter first
    await page.goto('/dashboard/letters/new')
    await page.click('[data-testid="letter-type-demand-letter"]')
    await page.fill('[data-testid="recipient-name"]', 'Test Recipient')
    await page.fill('[data-testid="issue-description"]', 'Test issue')
    await page.click('[data-testid="generate-letter-button"]')

    // Wait for generation and approval (mock approval)
    await expect(page.locator('text=Letter generated successfully')).toBeVisible({ timeout: 30000 })

    // Download PDF
    const downloadPromise = page.waitForEvent('download')
    await page.click('[data-testid="download-pdf-button"]')
    const download = await downloadPromise

    // Verify download
    expect(download.suggestedFilename()).toMatch(/\.pdf$/)
  })

  test('tracks letter credits correctly', async ({ page }) => {
    // Check initial credits
    await page.goto('/dashboard/subscription')
    await expect(page.locator('[data-testid="credits-remaining"]')).toContainText('4')

    // Generate a letter
    await page.goto('/dashboard/letters/new')
    await page.click('[data-testid="letter-type-demand-letter"]')
    await page.fill('[data-testid="recipient-name"]', 'Test Recipient')
    await page.fill('[data-testid="issue-description"]', 'Test issue')
    await page.click('[data-testid="generate-letter-button"]')

    // Wait for generation
    await expect(page.locator('text=Letter generated successfully')).toBeVisible({ timeout: 30000 })

    // Check credits decreased
    await page.goto('/dashboard/subscription')
    await expect(page.locator('[data-testid="credits-remaining"]')).toContainText('3')
  })
})