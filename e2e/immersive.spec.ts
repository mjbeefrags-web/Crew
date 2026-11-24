import { expect, test } from '@playwright/test';

test('landing page tells the five drops and the colourway matrix responds', async ({ page }) => {
  await page.goto('/');
  const rail = page.locator('.transmission-rail');
  await expect(rail).toBeVisible();
  await expect(rail.locator('.transmission-card')).toHaveCount(5);
  await expect(rail.getByText('Out of Focus', { exact: true })).toBeVisible();

  const matrix = page.locator('.colorway-matrix');
  await matrix.scrollIntoViewIfNeeded();
  await matrix.getByRole('gridcell', { name: 'Life in Scroll in Deep Red' }).click();
  await expect(matrix.locator('.matrix-preview h3')).toHaveText('Life in Scroll');
  await expect(matrix.locator('.matrix-preview-kicker')).toContainText('DEEP RED');

  await rail.locator('.transmission-card').nth(2).click();
  await expect(page).toHaveURL(/\/drops\/the-gift-theory$/);
});

test('visual captures for the new editorial sections', async ({ page }) => {
  test.setTimeout(60_000);
  for (const viewport of [{ width: 1440, height: 1000, suffix: '1440' }, { width: 390, height: 844, suffix: '390' }]) {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await page.goto('/');
    await page.evaluate(() => document.fonts.ready.then(() => undefined));
    const rail = page.locator('.transmission-rail');
    await rail.scrollIntoViewIfNeeded();
    await page.waitForTimeout(1000);
    await rail.screenshot({ path: `docs/visual-checks/transmission-rail-${viewport.suffix}.png`, animations: 'disabled' });
    const matrix = page.locator('.colorway-matrix');
    await matrix.scrollIntoViewIfNeeded();
    await page.waitForTimeout(1000);
    await matrix.screenshot({ path: `docs/visual-checks/colorway-matrix-${viewport.suffix}.png`, animations: 'disabled' });
  }
});

test('psychedelic room validates size and colourway before adding to bag', async ({ page }) => {
  await page.goto('/drops/psychedelic-minds');
  await page.getByRole('button', { name: /enter the room/i }).click();
  await page.getByRole('button', { name: 'Select Petrol Blue colourway' }).click();
  await page.getByRole('button', { name: 'Select size L' }).click();
  await page.getByRole('button', { name: /add to bag/i }).click();
  await expect(page.getByRole('status')).toContainText('Petrol Blue · L added to your bag');
});

test('classic drop chamber exposes front, side and back views', async ({ page }) => {
  await page.goto('/drops/out-of-focus');
  const stage = page.locator('.drop-experience');
  await expect(stage).toBeVisible();
  await expect(stage.getByRole('button', { name: 'front view' })).toBeVisible();
  await stage.getByRole('button', { name: 'side view' }).click();
  await stage.getByRole('button', { name: 'back view' }).click();
  await expect(stage.getByRole('button', { name: /auto spin/i })).toHaveAttribute('aria-pressed', 'false');
  await stage.getByRole('button', { name: 'Select size L' }).click();
  await stage.getByRole('button', { name: /add to loadout/i }).click();
  await expect(stage.getByRole('status')).toContainText('L');
});
