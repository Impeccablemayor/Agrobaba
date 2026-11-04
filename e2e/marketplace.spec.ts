import { test, expect } from '@playwright/test';

test.describe('Marketplace & Cart User Flows', () => {
  test('homepage renders hero section, categories, and navigation links', async ({ page }) => {
    await page.goto('/');

    // Check navbar brand header
    const header = page.locator('.site-header');
    await expect(header).toBeVisible();

    // Check hero heading
    const heroHeading = page.locator('.hero-main-title');
    await expect(heroHeading).toBeVisible();

    // Check categories showcase
    const categoryCards = page.locator('.category-feature-card');
    await expect(categoryCards.first()).toBeVisible();
  });

  test('shop page displays product cards with prices and allows quick navigation', async ({ page }) => {
    await page.goto('/shop');

    // Verify search input exists
    const searchInput = page.locator('input[placeholder*="Search" i], input[type="text"]').first();
    await expect(searchInput).toBeVisible();

    // Wait for product cards to load
    const productCard = page.locator('.product-card').first();
    await expect(productCard).toBeVisible({ timeout: 10000 });

    // Ensure price tag is visible
    const cardPrice = productCard.locator('.card-price');
    await expect(cardPrice).toBeVisible();
  });

  test('cart route is protected and redirects unauthenticated visitors to login', async ({ page }) => {
    await page.goto('/cart');

    // ProtectedRoute redirects guest users to /login
    await expect(page).toHaveURL(/.*login/);

    // Login prompt is rendered
    const loginHeader = page.locator('h2');
    await expect(loginHeader).toBeVisible();
  });
});
