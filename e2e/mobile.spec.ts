import { expect, test } from "@playwright/test";

test.describe("mobile drop experience", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("details panel does not block the object and can be expanded", async ({
    page,
  }) => {
    await page.goto("/drops/the-gift-theory");

    const card = page.locator(".drop-item-card");
    await expect(card).toBeVisible();
    await expect(card).toHaveClass(/is-collapsed/);

    const collapsed = await card.boundingBox();
    expect(collapsed).not.toBeNull();
    expect(collapsed!.height).toBeLessThan(120);

    await page.getByRole("button", { name: /show details/i }).click();
    await expect(card).not.toHaveClass(/is-collapsed/);

    const expanded = await card.boundingBox();
    expect(expanded!.height).toBeGreaterThan(collapsed!.height);

    await page.getByRole("button", { name: /hide details/i }).click();
    await expect(card).toHaveClass(/is-collapsed/);
  });

  test("home keeps a single-column product grid and usable targets", async ({
    page,
  }) => {
    await page.goto("/");
    const firstTile = page.locator(".product-tile").first();
    await expect(firstTile).toBeVisible();
    const box = await firstTile.boundingBox();
    const viewport = page.viewportSize()!;
    expect(box!.width).toBeGreaterThan(viewport.width * 0.8);
  });
});
