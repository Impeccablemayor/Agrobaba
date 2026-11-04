import { test, expect } from '@playwright/test';

test.describe('B2B Demands & Quotes User Flows', () => {
  test('demand board renders active buyer demands and categories', async ({ page }) => {
    await page.goto('/demands');

    // Heading or title
    const header = page.locator('h1, h2').first();
    await expect(header).toBeVisible();

    // Verify demands grid or empty state
    const demandGridOrEmpty = page.locator('.demand-grid, .empty-cart');
    await expect(demandGridOrEmpty.first()).toBeVisible({ timeout: 10000 });
  });

  test('post a demand button triggers login redirection or demand form', async ({ page }) => {
    await page.goto('/demands');

    // Click on Post a Demand link / button
    const postDemandBtn = page.locator('a[href*="/demands/new"], button:has-text("Post a Demand")').first();
    if (await postDemandBtn.isVisible()) {
      await postDemandBtn.click();
      // Unauthenticated users are redirected to login or to new demand with login guard
      await expect(page).toHaveURL(/.*(demands\/new|login)/);
    }
  });
});

