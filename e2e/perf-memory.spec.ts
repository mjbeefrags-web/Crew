import { expect, test } from "@playwright/test";

const samples = Number(process.env.PERF_MEMORY_SAMPLES ?? 6);
const sampleMs = Number(process.env.PERF_MEMORY_SAMPLE_MS ?? 5000);
const budgetMB = Number(process.env.PERF_MEMORY_BUDGET_MB ?? 12);

const heapMB = async (page: import("@playwright/test").Page) =>
  page.evaluate(() => {
    const memory = (
      performance as Performance & {
        memory?: { usedJSHeapSize: number };
      }
    ).memory;
    return memory ? Math.round(memory.usedJSHeapSize / 1048576) : 0;
  });

test.describe("long-session memory budget", () => {
  for (const path of ["/", "/drops/psychedelic-minds"]) {
    test(`${path} does not leak memory while idle`, async ({ page }) => {
      test.setTimeout(60_000);
      await page.goto(path, { waitUntil: "networkidle" });
      await page.waitForTimeout(1000);
      const before = await heapMB(page);
      const readings: number[] = [];
      for (let index = 0; index < samples; index += 1) {
        await page.waitForTimeout(sampleMs);
        readings.push(await heapMB(page));
      }
      const growth = Math.max(0, Math.max(...readings, before) - before);
      expect(
        growth,
        `heap grew ${growth}MB on ${path}: ${readings.join(", ")}`,
      ).toBeLessThan(budgetMB);
    });
  }
});
