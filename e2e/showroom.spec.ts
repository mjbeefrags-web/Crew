import { expect, test, type Page } from '@playwright/test';

async function resultCount(page: Page, count: number) {
  await expect(page.locator('.results-line span').first()).toHaveText(`${count} PIECES`);
}

test('search, filter combinations, clear and sort the catalog', async ({ page }) => {
  test.setTimeout(60_000);
  await page.goto('/');
  await resultCount(page, 8);

  const search = page.getByRole('textbox', { name: 'Search pieces' });
  await search.fill('VIVRE');
  await resultCount(page, 1);
  await expect(page.getByRole('heading', { name: 'Vivre La Vie Hoodie' })).toBeVisible();
  await search.fill('does not exist');
  await expect(page.getByText('NO PIECES FOUND')).toBeVisible();
  await search.clear();
  await resultCount(page, 8);

  await page.getByRole('button', { name: 'Hoodies', exact: true }).click();
  await resultCount(page, 8);
  await page.getByRole('combobox', { name: 'Filter by collection' }).selectOption('CREWWW / OUTSIDE HOURS');
  await expect(page.getByRole('heading', { name: 'Joy of Outdoors Hoodie' })).toBeVisible();
  await page.getByRole('combobox', { name: 'Filter by size' }).selectOption('XS');
  await resultCount(page, 0);
  await page.getByRole('button', { name: 'CLEAR ALL' }).click();
  await resultCount(page, 8);

  await page.getByRole('button', { name: 'Filter color Black' }).click();
  await resultCount(page, 4);
  await page.getByRole('button', { name: 'Filter color Black' }).click();
  await page.getByRole('slider', { name: 'Maximum price' }).press('Home');
  await resultCount(page, 0);
  await page.getByRole('slider', { name: 'Maximum price' }).press('End');
  await resultCount(page, 8);

  await page.getByRole('checkbox', { name: 'In stock' }).check();
  await resultCount(page, 8);
  await page.getByRole('checkbox', { name: 'New arrivals' }).check();
  await resultCount(page, 4);
  await page.getByRole('checkbox', { name: 'Best sellers' }).check();
  await resultCount(page, 0);
  await page.getByRole('button', { name: 'CLEAR ALL' }).click();

  const sort = page.getByRole('combobox', { name: 'Sort products' });
  await sort.selectOption('price-low');
  await expect(page.locator('.tile-meta h3').first()).toHaveText('Crew Script Hoodie');
  await sort.selectOption('price-high');
  await expect(page.locator('.tile-meta h3').first()).toHaveText('Crane Garden Hoodie');
  await sort.selectOption('name');
  await expect(page.locator('.tile-meta h3').first()).toHaveText('Cherry Blossom Hoodie');
  await sort.selectOption('featured');
});

test('world storefront destinations open real collections and shop all stays direct', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/');
  await expect(page.locator('.world-stage canvas')).toBeVisible();
  await page.waitForTimeout(450);
  await page.mouse.click(1220, 267);
  await expect(page).toHaveURL(/#collection$/);
  await resultCount(page, 1);

  await page.goto('/');
  await page.getByRole('link', { name: /city notes/i }).click();
  await expect(page).toHaveURL(/#collection$/);
  await resultCount(page, 2);
  await expect(page.getByRole('heading', { name: 'New York Hoodie' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Tokyo Graphic Hoodie' })).toBeVisible();
  await page.getByRole('button', { name: /clear all/i }).click();
  await resultCount(page, 8);
});

test('mobile navigation, search focus, home and footer routes work', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  const menu = page.locator('.menu-toggle');
  await menu.click();
  await expect(menu).toHaveAttribute('aria-expanded', 'true');
  await page.getByRole('navigation', { name: 'Mobile navigation' }).getByRole('link', { name: 'Shop all' }).click();
  await expect(page).toHaveURL(/\/shop$/);
  await expect(menu).toHaveAttribute('aria-expanded', 'false');
  await page.getByRole('link', { name: 'Crewww home' }).click();

  await page.getByRole('textbox', { name: 'Search pieces' }).click();
  await expect(page.getByRole('textbox', { name: 'Search pieces' })).toBeFocused();
  await page.getByRole('link', { name: 'Crewww home' }).click();
  await expect(page).toHaveURL(/\/$/);
  await page.getByRole('link', { name: 'DESIGN NOTES' }).click();
  await expect(page).toHaveURL(/\/design-system$/);
  await expect(page.getByRole('heading', { name: /language/i })).toBeVisible();
});

test('inspection transition preserves selection, handles back and restores focus', async ({ page }) => {
  // Long multi-step flow: two cart rounds, a reload, and two inspection transitions.
  test.setTimeout(120_000);
  await page.goto('/');
  const hoodieCard = page.getByRole('button', { name: 'Inspect Joy of Outdoors Hoodie' });
  await hoodieCard.focus();
  await hoodieCard.click();
  const studio = page.getByRole('dialog', { name: 'Joy of Outdoors Hoodie inspection studio' });
  await expect(studio).toBeVisible();
  const viewer = studio.getByRole('group', { name: 'Joy of Outdoors Hoodie 3D product viewer' });
  await expect(viewer).toBeVisible();
  await expect(page.getByRole('button', { name: '← BACK TO COLLECTION' })).toBeFocused();
  await viewer.getByRole('button', { name: 'Rotate hoodie left' }).click();
  await viewer.getByRole('button', { name: 'Rotate hoodie right' }).click();
  await viewer.getByRole('button', { name: 'Reset hoodie view' }).click();
  await expect(page).toHaveURL(/#inspection$/);

  await page.getByRole('button', { name: 'Select Mocha' }).click();
  await page.getByRole('button', { name: /^L$/ }).click();
  await page.getByRole('button', { name: 'Increase quantity' }).click();
  await page.getByRole('button', { name: /add to bag/i }).click();
  await expect(page.getByRole('status')).toContainText('Mocha · L added');

  await page.getByRole('button', { name: /back to collection/i }).click();
  await expect(studio).toHaveCount(0);
  await expect(page).toHaveURL(/\/$/);
  await expect(hoodieCard).toBeFocused();
  await page.getByRole('button', { name: /^Shopping bag, 2 items$/i }).click();
  const bag = page.getByRole('dialog', { name: 'Shopping bag' });
  await expect(bag).toContainText('Mocha / L / QTY 2');
  await page.getByRole('button', { name: 'Close shopping bag' }).click();
  await hoodieCard.click();
  await page.getByRole('button', { name: 'Select Black' }).click();
  await page.getByRole('button', { name: /^M$/ }).click();
  await page.getByRole('button', { name: /add to bag/i }).click();
  await page.getByRole('button', { name: /back to collection/i }).click();
  await page.getByRole('button', { name: /^Shopping bag, 3 items$/i }).click();
  await expect(page.getByRole('dialog', { name: 'Shopping bag' }).locator('.bag-line')).toHaveCount(2);
  await expect(page.getByRole('dialog', { name: 'Shopping bag' })).toContainText('Black / M / QTY 1');
  await page.reload();
  await expect(page.getByRole('link', { name: /shopping bag, 3 items/i })).toBeVisible();
  await page.getByRole('button', { name: /^Shopping bag, 3 items$/i }).click();
  await expect(page.getByRole('dialog', { name: 'Shopping bag' }).locator('.bag-line')).toHaveCount(2);
  const bagDialog = page.getByRole('dialog', { name: 'Shopping bag' });
  await bagDialog.getByRole('button', { name: /remove joy of outdoors hoodie from bag/i }).first().click();
  await expect(bagDialog.locator('.bag-line')).toHaveCount(1);
  await bagDialog.getByRole('button', { name: /remove joy of outdoors hoodie from bag/i }).click();
  await expect(page.getByText('Your bag is waiting for something good.')).toBeVisible();

  await page.getByRole('button', { name: 'Close shopping bag' }).click();
  await expect(page.getByRole('dialog', { name: 'Shopping bag' })).toHaveCount(0);
  const intervalCard = page.getByRole('button', { name: 'Inspect Vivre La Vie Hoodie' });
  await page.evaluate(() => {
    const target = Array.from(document.querySelectorAll<HTMLButtonElement>('.tile-image-button')).find((button) => button.getAttribute('aria-label') === 'Inspect Vivre La Vie Hoodie');
    target?.click();
    target?.click();
  });
  await expect(page.getByRole('dialog', { name: 'Vivre La Vie Hoodie inspection studio' })).toHaveCount(1);
  await page.getByRole('button', { name: /back to collection/i }).click();
  await expect(page.getByRole('dialog', { name: 'Vivre La Vie Hoodie inspection studio' })).toHaveCount(0);
  await intervalCard.click();
  await expect(page.getByRole('dialog', { name: 'Vivre La Vie Hoodie inspection studio' })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog', { name: 'Vivre La Vie Hoodie inspection studio' })).toHaveCount(0);
});

test('responsive layout stays within five target viewport widths and captures screenshots', async ({ page }) => {
  test.setTimeout(180_000);
  const viewports = [
    { width: 360, height: 800, file: 'crewww-home-360.png' },
    { width: 390, height: 844, file: 'crewww-home-390.png' },
    { width: 768, height: 900, file: 'crewww-home-768.png' },
    { width: 1024, height: 900, file: 'crewww-home-1024.png' },
    { width: 1440, height: 1000, file: 'crewww-home-1440.png' },
  ];
  for (const viewport of viewports) {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await page.goto('/');
  await expect(page.getByRole('heading', { name: /the block is yours/i })).toBeVisible();
    await page.evaluate(() => document.fonts.ready.then(() => undefined));
    expect(await page.locator('body').evaluate((element) => element.scrollWidth)).toBeLessThanOrEqual(viewport.width);
    const pageHeight = await page.locator('body').evaluate((element) => element.scrollHeight);
    expect(pageHeight).toBeGreaterThan(viewport.height);
    await expect(page.locator('.tile-image-button img')).toHaveCount(8);
    await page.locator('.product-grid').scrollIntoViewIfNeeded();
    await expect.poll(() => page.locator('.tile-image-button img').evaluateAll((images) => images.every((image) => (image as HTMLImageElement).naturalWidth > 0))).toBe(true);
    await page.screenshot({ path: `docs/visual-checks/${viewport.file}` });
  }
});

test('design-system form, keyboard navigation and reduced motion work', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/design-system');
  await expect(page.getByRole('heading', { name: /language/i })).toBeVisible();
  await page.getByRole('textbox', { name: /email address/i }).fill('invalid');
  await page.getByRole('button', { name: /validate field/i }).click();
  await expect(page.getByRole('alert')).toHaveText('Enter a valid email address.');

  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await page.keyboard.press('Tab');
  await expect(page.getByRole('link', { name: /skip to content/i })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/#main-content$/);
  const scrollBehavior = await page.locator('html').evaluate((element) => getComputedStyle(element).scrollBehavior);
  expect(scrollBehavior).toBe('auto');
  await expect(page.getByRole('navigation', { name: 'Explore Crewww collections' })).toBeVisible();
  await page.getByRole('button', { name: 'Inspect Joy of Outdoors Hoodie' }).click();
  await expect(page.getByRole('group', { name: 'Joy of Outdoors Hoodie 3D product viewer' }).getByRole('button', { name: 'Rotate hoodie right' })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog', { name: 'Joy of Outdoors Hoodie inspection studio' })).toHaveCount(0);
});

test('browser console, local assets and key showroom states are clean', async ({ page }) => {
  const pageErrors: string[] = [];
  const consoleErrors: string[] = [];
  const failedLocalRequests: string[] = [];
  const badLocalResponses: string[] = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));
  page.on('console', (message) => { if (message.type() === 'error') consoleErrors.push(message.text()); });
  page.on('requestfailed', (request) => {
    if (new URL(request.url()).origin === 'http://127.0.0.1:4173') failedLocalRequests.push(`${request.url()} — ${request.failure()?.errorText ?? 'failed'}`);
  });
  page.on('response', (response) => {
    if (new URL(response.url()).origin === 'http://127.0.0.1:4173' && response.status() >= 400) badLocalResponses.push(`${response.status()} ${response.url()}`);
  });

  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/');
  await expect(page.getByRole('heading', { name: /the block is yours/i })).toBeVisible();
  await expect(page.locator('.brand-link .brand-logo')).toHaveAttribute('src', '/images/brand/logo-light.png');
  await page.evaluate(() => document.fonts.ready.then(() => undefined));
  await page.screenshot({ path: 'docs/visual-checks/m2.1-hero-1440.png' });
  await page.locator('#collection').scrollIntoViewIfNeeded();
  await page.screenshot({ path: 'docs/visual-checks/m2.1-catalog-1440.png' });
  await page.getByRole('button', { name: 'Inspect Joy of Outdoors Hoodie' }).click();
  const inspectionStudio = page.getByRole('dialog', { name: 'Joy of Outdoors Hoodie inspection studio' });
  await expect(inspectionStudio).toBeVisible();
  await expect.poll(() => inspectionStudio.evaluate((element) => getComputedStyle(element).position)).toBe('fixed');
  await expect(page.locator('.hoodie-viewer canvas')).toBeVisible();
  await page.screenshot({ path: 'docs/visual-checks/m2.1-studio-1440.png' });
  await page.getByRole('button', { name: /add to bag/i }).click();
  await expect(page.getByRole('status')).toContainText('added');
  await page.getByRole('button', { name: /back to collection/i }).click();

  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole('button', { name: /^Shopping bag, 1 items$/i }).click();
  const bagDialog = page.getByRole('dialog', { name: 'Shopping bag' });
  await expect(bagDialog).toBeVisible();
  await expect.poll(() => bagDialog.evaluate((element) => getComputedStyle(element.parentElement!).position)).toBe('fixed');
  await expect.poll(async () => (await bagDialog.boundingBox())?.x ?? 999).toBeLessThanOrEqual(0.5);
  const bagBounds = await bagDialog.boundingBox();
  expect(bagBounds).not.toBeNull();
  expect(bagBounds!.x).toBeGreaterThanOrEqual(0);
  expect(bagBounds!.x + bagBounds!.width).toBeLessThanOrEqual(390);
  await page.screenshot({ path: 'docs/visual-checks/m2.1-bag-390.png' });

  expect(pageErrors, 'uncaught browser errors').toEqual([]);
  expect(consoleErrors, 'browser console errors').toEqual([]);
  expect(failedLocalRequests, 'failed local requests').toEqual([]);
  expect(badLocalResponses, 'local HTTP errors').toEqual([]);
});

test('3D fallback hides controls that cannot operate without WebGL', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, 'WebGLRenderingContext', { configurable: true, value: undefined });
    Object.defineProperty(window, 'WebGL2RenderingContext', { configurable: true, value: undefined });
  });
  await page.goto('/');
  await expect(page.locator('.world-stage-fallback')).toBeVisible();
  await page.getByRole('button', { name: 'Inspect Joy of Outdoors Hoodie' }).click();
  await expect(page.getByText('3D preview is unavailable in this browser.')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Rotate hoodie left' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Rotate hoodie right' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Reset hoodie view' })).toHaveCount(0);
});
