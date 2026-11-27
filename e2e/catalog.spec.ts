import { expect, test } from '@playwright/test';

const resultCount = async (page: import('@playwright/test').Page, expected: number) => {
  await expect(page.locator('.catalog-toolbar [role="status"]')).toHaveText(`${expected} PIECES`);
};

test('catalog filters are shareable, survive reload and respond to browser history', async ({ page }) => {
  await page.goto('/denim?fit=Straight&wash=Mid%20wash');
  await resultCount(page, 1);
  await expect(page.locator('.store-product-grid')).toContainText('Patch Straight Jean');

  await page.reload();
  await resultCount(page, 1);
  await expect(page.getByRole('combobox', { name: 'Filter fit' })).toHaveValue('Straight');
  await expect(page.getByRole('combobox', { name: 'Filter wash' })).toHaveValue('Mid wash');

  await page.getByRole('combobox', { name: 'Filter fit' }).selectOption('Relaxed');
  await expect(page).toHaveURL(/fit=Relaxed/);
  await resultCount(page, 0);
  await page.goBack();
  await expect(page).toHaveURL(/fit=Straight/);
  await resultCount(page, 1);
});

test('sort, load more and clear all are expressed in the URL', async ({ page }) => {
  await page.goto('/shop');
  await expect(page).toHaveURL(/\/shop$/);
  await page.getByRole('combobox', { name: 'Sort products' }).selectOption('price-asc');
  await expect(page).toHaveURL(/sort=price-asc/);

  await page.goto('/shop?show=24');
  await expect(page.locator('.store-product-grid')).toHaveCount(1);
  await expect(page).toHaveURL(/show=24/);

  await page.goto('/shop?size=M&color=Black&min=50');
  await expect(page.locator('.active-filter')).toHaveCount(3);
  await page.getByRole('button', { name: 'CLEAR ALL' }).click();
  await expect(page).toHaveURL(/\/shop$/);
  await expect(page.locator('.active-filter')).toHaveCount(0);
});

test('category and product routes expose shareable metadata', async ({ page }) => {
  await page.goto('/clothes/hoodies?size=M');
  await expect(page).toHaveTitle(/Graphic hoodies — CREWWW/);
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', /\/clothes\/hoodies\?size=M$/);

  await page.goto('/products/vivre-la-vie-hoodie');
  await expect(page).toHaveTitle(/Vivre La Vie Hoodie — CREWWW/);
  await expect(page.locator('meta[name="description"]')).toHaveAttribute('content', /Vivre La Vie/);
});

test('the + on a product card adds it to the cart in one press', async ({ page }) => {
  await page.goto('/shop');
  await page.locator('.store-quick-add-plus').first().click();
  await expect(page.getByRole('link', { name: /Shopping cart, 1 items/i })).toBeVisible();
});

test('active filter chips remove only their own URL parameter', async ({ page }) => {
  await page.goto('/shop?size=M&color=Black');
  await expect(page.locator('.active-filter')).toHaveCount(2);
  await page.getByRole('button', { name: /^M ×$/ }).click();
  await expect(page).toHaveURL(/color=Black/);
  await expect(page).not.toHaveURL(/size=M/);
  await expect(page.locator('.active-filter')).toHaveCount(1);
});
