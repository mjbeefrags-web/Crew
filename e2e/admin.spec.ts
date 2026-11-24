import { expect, test } from '@playwright/test';

test('owner console renders demo metrics, charts and tables', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/admin');

  await expect(page.getByRole('heading', { name: /store signals/i })).toBeVisible();
  await expect(page.locator('.admin-source-badge')).toHaveText('LOCAL DEMO DATA');
  await expect(page.locator('.admin-data-note')).toContainText('Synthetic local preview');
  await expect(page.locator('.admin-kpi-card')).toHaveCount(8);
  await expect(page.getByText('PAID REVENUE', { exact: true })).toBeVisible();
  await expect(page.locator('.admin-time-series')).toBeVisible();
  await expect(page.locator('.admin-bar-row').first()).toBeVisible();
  await expect(page.locator('.admin-insight')).not.toHaveCount(0);
  await expect(page.locator('.admin-table-panel table')).toHaveCount(3);
  await expect(page.locator('.admin-table-panel tbody tr').first()).toContainText('SAMPLE-');
});

test('owner console switches range and exports orders', async ({ page }) => {
  await page.goto('/admin');
  await expect(page.locator('.admin-time-series title')).toHaveText(/last 30 days/);

  await page.getByRole('button', { name: '7D' }).click();
  await expect(page.locator('.admin-time-series title')).toHaveText(/last 7 days/);
  await expect(page.getByRole('button', { name: '7D' })).toHaveAttribute('aria-pressed', 'true');

  await page.getByRole('button', { name: 'UNITS' }).click();
  await expect(page.locator('.admin-time-series title')).toHaveText(/Units over the last 7 days/);

  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: /export orders csv/i }).click();
  const file = await download;
  expect(file.suggestedFilename()).toBe('crewww-orders-7d.csv');
});

test('owner console is reachable from the header and survives refresh', async ({ page }) => {
  await page.goto('/');
  await page.locator('.header-admin-link').click();
  await expect(page).toHaveURL(/\/admin$/);
  await expect(page.getByRole('heading', { name: /store signals/i })).toBeVisible();
  await page.reload();
  await expect(page.locator('.admin-kpi-card')).toHaveCount(8);
});
