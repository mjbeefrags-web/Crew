import { chromium } from "@playwright/test";

const base = process.env.PERF_BASE_URL ?? "http://localhost:5199";
const routes = ["/shop", "/", "/drops"];
const browser = await chromium.launch();

for (const route of routes) {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const requests = [];
  page.on("response", async (response) => {
    try {
      const body = await response.body();
      requests.push({
        url: response.url().replace(base, ""),
        type: response.request().resourceType(),
        size: body.length,
        status: response.status(),
      });
    } catch {}
  });
  await page.goto(base + route, { waitUntil: "networkidle", timeout: 60000 });
  await page.waitForTimeout(1500);
  const grouped = {};
  for (const r of requests) {
    grouped[r.type] ??= { count: 0, size: 0, items: [] };
    grouped[r.type].count += 1;
    grouped[r.type].size += r.size;
    grouped[r.type].items.push(r);
  }
  console.log(`\n=== ${route} ===`);
  for (const [type, g] of Object.entries(grouped)) {
    console.log(`${type}: ${g.count} files, ${(g.size / 1024).toFixed(0)} KB`);
    const top = g.items.sort((a, b) => b.size - a.size).slice(0, 8);
    for (const i of top)
      console.log(`   ${(i.size / 1024).toFixed(0).padStart(5)} KB  ${i.url}`);
  }
  const paints = await page.evaluate(() => {
    const nav = performance.getEntriesByType("navigation")[0];
    const paints = performance.getEntriesByType("paint");
    return {
      domContentLoaded: Math.round(nav.domContentLoadedEventEnd),
      load: Math.round(nav.loadEventEnd),
      firstPaint: Math.round(paints.find((p) => p.name === "first-contentful-paint")?.startTime ?? -1),
    };
  });
  console.log("timings", JSON.stringify(paints));
  await page.close();
}
await browser.close();
