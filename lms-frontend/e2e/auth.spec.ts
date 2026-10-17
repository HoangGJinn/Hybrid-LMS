import { test, expect } from '@playwright/test'

test.describe('Authentication & Navigation Flow', () => {
  test('should load login page successfully', async ({ page }) => {
    await page.goto('/login')

    // Verify title contains LMS
    await expect(page).toHaveTitle(/LMS|Hybrid/i)
  })

  test('should render email and password inputs on login page', async ({ page }) => {
    await page.goto('/login')

    const emailInput = page.locator('input[type="email"]')
    const passwordInput = page.locator('input[type="password"]')

    await expect(emailInput).toBeVisible()
    await expect(passwordInput).toBeVisible()
  })
})
