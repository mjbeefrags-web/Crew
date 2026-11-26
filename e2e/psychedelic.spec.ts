import { expect, test } from '@playwright/test';

test('psychedelic room is entered, changes piece and mood, and adds to bag', async ({ page }) => {
  await page.goto('/drops/psychedelic-minds');
  await expect(page.getByRole('heading', { name: /put on the frequency/i })).toBeVisible();
  await page.getByRole('button', { name: /enter the room/i }).click();
  await expect(page.getByRole('heading', { name: /out of focus/i })).toBeVisible();
  await page.getByRole('button', { name: /Life in Scroll/i }).click();
  await expect(page.getByRole('heading', { name: 'Life in Scroll', exact: true })).toBeVisible();
  await page.getByRole('button', { name: /BLOOM/i }).click();
  await page.getByRole('button', { name: /add to bag/i }).click();
  await expect(page.getByText(/added to your bag/i)).toBeVisible();
});

test('psychedelic room visual captures', async ({ page }) => {
  test.setTimeout(60_000);
  for (const viewport of [{ width: 1440, height: 1000, file: 'psychedelic-room-1440.png' }, { width: 390, height: 844, file: 'psychedelic-room-390.png' }]) {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await page.goto('/drops/psychedelic-minds');
    await page.evaluate(() => document.fonts.ready.then(() => undefined));
    await page.screenshot({ path: `docs/visual-checks/${viewport.file}`, animations: 'disabled' });
    await page.getByRole('button', { name: /enter the room/i }).click();
    await page.waitForTimeout(600);
    await page.screenshot({ path: `docs/visual-checks/${viewport.file.replace('.png', '-entered.png')}`, animations: 'disabled' });
  }
});

test('drops index links into the psychedelic room', async ({ page }) => {
  await page.goto('/drops');
  await expect(page.getByRole('link', { name: /enter room 01/i })).toBeVisible();
  await page.getByRole('link', { name: /enter the psychedelic room/i }).first().click();
  await expect(page).toHaveURL(/\/drops\/psychedelic-minds/);
});
