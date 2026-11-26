import { expect, test } from '@playwright/test';

test('drops index opens a playable drop chamber and returns to the index', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/drops');

  await expect(page.getByRole('heading', { name: /enter the drop/i })).toBeVisible();
  await expect(page.locator('.drop-index-card')).toHaveCount(5);
  const lineup = page.locator('.drops-index-grid');
  await expect(lineup.getByText('Out of Focus', { exact: true })).toBeVisible();
  await expect(lineup.getByText('Outsourced Mind', { exact: true })).toBeVisible();

  await page.getByRole('link', { name: /press start/i }).click();
  await expect(page).toHaveURL(/\/drops\/out-of-focus$/);
  const chamber = page.locator('.drop-experience');
  await expect(chamber).toBeVisible();
  await expect(chamber.locator('.drop-stage canvas')).toBeVisible();
  await expect(chamber.getByRole('heading', { name: 'Out of Focus' })).toBeVisible();
  await expect(chamber.getByText('Physically here. Mentally somewhere else.', { exact: false })).toBeVisible();

  await chamber.getByRole('button', { name: 'Select Petrol Blue' }).click();
  await expect(chamber.getByText('Petrol Blue')).toBeVisible();
  await chamber.getByRole('button', { name: 'Inspect Full-colour DTG' }).click();
  await expect(chamber.locator('.drop-hotspot-copy strong')).toHaveText('Full-colour DTG');
  await chamber.getByRole('button', { name: 'Zoom in' }).click();
  await chamber.getByRole('button', { name: 'AUTO SPIN ON' }).click();
  await expect(chamber.getByRole('button', { name: 'AUTO SPIN OFF' })).toHaveAttribute('aria-pressed', 'false');

  await chamber.getByRole('button', { name: /enter the gallery/i }).click();
  await expect(chamber.getByText(/W A S D TO WALK/)).toBeVisible();
  await chamber.getByRole('button', { name: /back to the object/i }).click();
  await expect(chamber.getByRole('button', { name: 'Inspect Heavy fleece' })).toBeVisible();

  await chamber.getByRole('button', { name: /add to loadout/i }).click();
  await expect(chamber.getByRole('status')).toContainText('ADDED TO YOUR LOADOUT');
  await chamber.getByRole('button', { name: /exit the drop/i }).click();
  await expect(page).toHaveURL(/\/drops$/);
  await expect(page.locator('.drop-index-card')).toHaveCount(5);
});

test('drop chamber handles direct links, sound opt-in and missing drops', async ({ page }) => {
  await page.goto('/drops');
  const siteSound = page.getByRole('button', { name: /sound (on|off|toggle)/i });
  await siteSound.click();
  await expect(siteSound).toHaveAttribute('aria-pressed', 'true');
  await siteSound.click();
  await expect(siteSound).toHaveAttribute('aria-pressed', 'false');

  await page.goto('/drops/life-in-scroll');
  await expect(page.getByRole('heading', { name: 'Life in Scroll' })).toBeVisible();
  await expect(page.getByText('A never-ending feed. A life on repeat.', { exact: false })).toBeVisible();

  const chamber = page.locator('.drop-experience');
  const sound = chamber.getByRole('button', { name: 'SOUND OFF' });
  await sound.click();
  await expect(chamber.getByRole('button', { name: 'SOUND ON' })).toHaveAttribute('aria-pressed', 'true');
  await chamber.getByRole('button', { name: 'SOUND ON' }).click();

  await page.goto('/drops/not-a-real-drop');
  await expect(page.getByRole('heading', { name: /not in/i })).toBeVisible();
  await page.getByRole('link', { name: /back to the drops/i }).click();
  await expect(page).toHaveURL(/\/drops$/);
});

test('drop chamber shows the real artwork plate when WebGL is unavailable', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, 'WebGLRenderingContext', { configurable: true, value: undefined });
    Object.defineProperty(window, 'WebGL2RenderingContext', { configurable: true, value: undefined });
  });
  await page.goto('/drops/outsourced-mind');
  await expect(page.locator('.drop-fallback')).toBeVisible();
  await expect(page.locator('.drop-fallback img')).toHaveAttribute('src', /drop-30\.webp$/);
  await expect(page.getByRole('heading', { name: 'Outsourced Mind' })).toBeVisible();
});
