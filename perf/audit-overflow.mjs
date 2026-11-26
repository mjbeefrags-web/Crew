import { chromium } from "@playwright/test";

const base = process.env.PERF_BASE_URL ?? "http://localhost:5199";
const routes = [
  "/",
  "/shop",
  "/clothes",
  "/denim",
  "/products/vivre-la-vie-hoodie",
  "/drops",
  "/cart",
  "/checkout",
  "/about",
];
const viewports = [320, 390, 768, 1024, 1440];

const browser = await chromium.launch();
const page = await browser.newPage();
const report = [];

for (const width of viewports) {
  await page.setViewportSize({ width, height: 900 });
  for (const route of routes) {
    try {
      await page.goto(base + route, { waitUntil: "networkidle", timeout: 30000 });
      await page.waitForTimeout(600);
      const result = await page.evaluate(() => {
        const doc = document.documentElement;
        const vw = window.innerWidth;
        const offenders = [];
        for (const el of document.querySelectorAll("body *")) {
          const r = el.getBoundingClientRect();
          if (r.width === 0 || r.height === 0) continue;
          if (r.right > vw + 1 || r.left < -1) {
            const style = getComputedStyle(el);
            if (style.position === "fixed") continue;
            offenders.push({
              tag: el.tagName.toLowerCase(),
              cls: (el.className && String(el.className).slice(0, 60)) || "",
              left: Math.round(r.left),
              right: Math.round(r.right),
              width: Math.round(r.width),
            });
          }
        }
        return {
          vw,
          scrollWidth: doc.scrollWidth,
          overflow: doc.scrollWidth - vw,
          offenders: offenders.slice(0, 8),
        };
      });
      report.push({ width, route, ...result });
    } catch (error) {
      report.push({ width, route, error: String(error).slice(0, 120) });
    }
  }
}

await browser.close();

for (const row of report) {
  if (row.error) {
    console.log(`${row.width} ${row.route} ERROR ${row.error}`);
    continue;
  }
  if (row.overflow > 0) {
    console.log(`${row.width} ${row.route} OVERFLOW ${row.overflow}px`);
    for (const o of row.offenders) {
      console.log(`   ${o.tag}.${o.cls} left=${o.left} right=${o.right} w=${o.width}`);
    }
  }
}
console.log("done");

