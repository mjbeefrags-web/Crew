import { expect, test } from '@playwright/test';

test('fit finder suggests a size, applies it and records a fit check', async ({ page }) => {
  await page.goto('/products/vivre-la-vie-hoodie');
  await page.getByRole('button', { name: /FIND MY SIZE/ }).click();
  await page.getByRole('slider', { name: /chest measurement/i }).fill('110');
  await expect(page.locator('.fit-finder-result strong')).toHaveText('XL');
  await page.getByRole('button', { name: /USE SIZE XL/ }).click();
  await expect(page.getByRole('button', { name: 'XL', exact: true })).toHaveAttribute('aria-pressed', 'true');
  const events = await page.evaluate(() => window.localStorage.getItem('crewww-insights') ?? '');
  expect(events).toContain('fit_check');
});

test('product browsing and add-to-cart appear in the owner console', async ({ page }) => {
  await page.goto('/products/cherry-blossom-hoodie');
  await page.locator('.product-purchase-actions .primary-store-button').click();
  await page.goto('/admin');
  const interest = page.locator('.admin-panel').filter({ hasText: 'What people inspect.' });
  await expect(interest).toContainText('Cherry Blossom Hoodie');
  await expect(page.locator('.admin-kpi-card').first()).toContainText('PAID REVENUE');
});

test('search suggestions work with the keyboard', async ({ page }) => {
  await page.goto('/search');
  await page.getByRole('combobox').fill('cherry');
  await expect(page.getByRole('listbox', { name: 'Suggested pieces' })).toBeVisible();
  await page.getByRole('combobox').press('ArrowDown');
  await expect(page.getByRole('option').first()).toHaveAttribute('aria-selected', 'true');
  await page.getByRole('combobox').press('Enter');
  await expect(page).toHaveURL(/\/products\/cherry-blossom-hoodie/);
});

test('recently viewed rail follows the shopping trail', async ({ page }) => {
  await page.goto('/products/vivre-la-vie-hoodie');
  await page.goto('/products/passion-racing-hoodie');
  await expect(page.locator('.recently-viewed-products')).toContainText('Vivre La Vie Hoodie');
});

test('mobile product page keeps add-to-cart reachable', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/products/crew-script-hoodie');
  await expect(page.locator('.mobile-buy-bar')).toBeVisible();
  await page.locator('.mobile-buy-bar button').click();
  await expect(page.getByRole('link', { name: /Shopping cart, 1 items/i })).toBeVisible();
});
