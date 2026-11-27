import { expect, test } from '@playwright/test';

test('skip link is the first Tab stop and moves focus to main', async ({ page }) => {
  await page.goto('/');
  await page.keyboard.press('Tab');
  await expect(page.getByRole('link', { name: /skip to content/i })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.locator('#main-content')).toBeFocused();
});

test('mobile drawer traps focus, closes on Escape and restores focus', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');

  const toggle = page.locator('.menu-toggle');
  await toggle.focus();
  await page.keyboard.press('Enter');

  const dialog = page.getByRole('dialog', { name: 'Mobile navigation' });
  await expect(dialog).toBeVisible();
  await expect(dialog.locator('a, button').first()).toBeFocused();

  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);
  await expect(toggle).toBeFocused();
});

test('route metadata is unique per page', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle(/Graphic fleece for your own frequency/);
  await expect(page.locator('meta[name="twitter:title"]')).toHaveAttribute(
    'content',
    /Graphic fleece/,
  );

  await page.goto('/drops/psychedelic-minds');
  await expect(page).toHaveTitle(/Psychedelic Minds/);
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
    'href',
    /\/drops\/psychedelic-minds$/,
  );
});
