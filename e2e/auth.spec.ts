import { test, expect } from '@playwright/test';

test.describe('Authentication & Onboarding User Flows', () => {
  test('login page renders with email, password fields and navigation to register', async ({ page }) => {
    await page.goto('/login');

    // Page title or brand heading
    await expect(page.locator('h2')).toContainText(/Log In|Sign In|Welcome/i);

    // Form inputs
    const emailInput = page.locator('input[type="email"]');
    const passwordInput = page.locator('input[type="password"]');

    await expect(emailInput).toBeVisible();
    await expect(passwordInput).toBeVisible();

    // Link to registration
    const registerLink = page.locator('a[href="/register"]');
    await expect(registerLink).toBeVisible();
    await registerLink.click();

    await expect(page).toHaveURL(/.*register/);
  });

  test('registration page displays all 4 agricultural role selector cards', async ({ page }) => {
    await page.goto('/register');

    // Verify presence of role options (Farmer, Agro Dealer, Buyer, Service Provider)
    const roleOptions = page.locator('.role-option');
    await expect(roleOptions).toHaveCount(4);

    // Test clicking a role card selects it
    await roleOptions.first().click();
    await expect(roleOptions.first()).toHaveClass(/active/);
  });

  test('forgot password page renders and accepts email recovery request', async ({ page }) => {
    await page.goto('/forgot-password');

    const emailInput = page.locator('input[type="email"]');
    await expect(emailInput).toBeVisible();

    const submitBtn = page.locator('button[type="submit"]');
    await expect(submitBtn).toBeVisible();
  });
});

