import { chromium, devices } from "@playwright/test";

const base = process.env.PERF_BASE_URL ?? "http://127.0.0.1:5199";
const strict =
  process.env.PERF_STRICT === "1" || process.argv.includes("--strict");

const profiles = [
  {
    name: "mobile",
    context: {
      ...devices["iPhone 13"],
      viewport: { width: 390, height: 844 },
      deviceScaleFactor: 3,
      isMobile: true,
      hasTouch: true,
    },
    budgets: {
      fcpMs: 900,
      lcpMs: 1500,
      scriptKB: 1400,
      totalKB: 5000,
      longTasks: 10,
      heapGrowthMB: 24,
    },
  },
  {
    name: "desktop",
    context: {
      viewport: { width: 1440, height: 900 },
      deviceScaleFactor: 1,
    },
    budgets: {
      fcpMs: 800,
      lcpMs: 1500,
      scriptKB: 1400,
      totalKB: 5500,
      longTasks: 12,
      heapGrowthMB: 32,
    },
  },
];

const routes = [
  { name: "home", path: "/" },
  { name: "shop", path: "/shop" },
  {
    name: "psychedelic drop",
    path:
      "/drops/psychedelic-minds?entered=1&piece=mind-02&mood=ACID&view=0" +
      "&colour=Deep+Red&size=M",
  },
];

const browser = await chromium.launch();
const failures = [];

const heapMB = async (page) =>
  page.evaluate(() =>
    performance.memory
      ? Math.round(performance.memory.usedJSHeapSize / 1048576)
      : 0,
  );

for (const profile of profiles) {
  const context = await browser.newContext(profile.context);
  await context.addInitScript(() => {
    window.__perf = { lcp: 0, cls: 0, longTasks: 0 };
    try {
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          window.__perf.lcp = entry.startTime;
        }
      }).observe({ type: "largest-contentful-paint", buffered: true });
    } catch {}
    try {
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (!entry.hadRecentInput) window.__perf.cls += entry.value;
        }
      }).observe({ type: "layout-shift", buffered: true });
    } catch {}
    try {
      new PerformanceObserver((list) => {
        window.__perf.longTasks += list.getEntries().length;
      }).observe({ type: "longtask", buffered: true });
    } catch {}
  });

  for (const route of routes) {
    const page = await context.newPage();
    await page.goto(base + route.path, {
      waitUntil: "networkidle",
      timeout: 60000,
    });
    await page.waitForTimeout(800);

    const initial = await page.evaluate(() => {
      const nav = performance.getEntriesByType("navigation")[0];
      const paint = performance.getEntriesByType("paint");
      const resources = performance.getEntriesByType("resource");
      let scriptKB = 0;
      let totalKB = 0;
      let images = 0;
      for (const resource of resources) {
        const bytes =
          resource.encodedBodySize || resource.transferSize || resource.decodedBodySize || 0;
        totalKB += bytes / 1024;
        if (resource.initiatorType === "script") scriptKB += bytes / 1024;
        if (resource.initiatorType === "img") images += 1;
      }
      return {
        fcpMs: Math.round(
          paint.find((entry) => entry.name === "first-contentful-paint")?.startTime ?? -1,
        ),
        lcpMs: Math.round(window.__perf?.lcp ?? -1),
        cls: Number((window.__perf?.cls ?? 0).toFixed(3)),
        longTasks: window.__perf?.longTasks ?? 0,
        domContentLoadedMs: Math.round(nav?.domContentLoadedEventEnd ?? -1),
        loadMs: Math.round(nav?.loadEventEnd ?? -1),
        requests: resources.length,
        images,
        scriptKB: Math.round(scriptKB),
        totalKB: Math.round(totalKB),
      };
    });

    const heapBefore = await heapMB(page);
    for (let index = 0; index < 8; index += 1) {
      await page.mouse.wheel(0, 640);
      await page.waitForTimeout(120);
    }
    await page.waitForTimeout(1000);
    const sustained = await page.evaluate(() => ({
      longTasks: window.__perf?.longTasks ?? 0,
    }));
    const heapAfter = await heapMB(page);
    const heapGrowthMB = Math.max(0, heapAfter - heapBefore);

    const result = {
      ...initial,
      sustainedLongTasks: sustained.longTasks - initial.longTasks,
      heapBefore,
      heapAfter,
      heapGrowthMB,
    };

    const checks = [
      ["fcpMs", result.fcpMs, profile.budgets.fcpMs],
      ["lcpMs", result.lcpMs, profile.budgets.lcpMs],
      ["scriptKB", result.scriptKB, profile.budgets.scriptKB],
      ["totalKB", result.totalKB, profile.budgets.totalKB],
      ["sustainedLongTasks", result.sustainedLongTasks, profile.budgets.longTasks],
      ["heapGrowthMB", result.heapGrowthMB, profile.budgets.heapGrowthMB],
    ];
    const failed = checks.filter(([, value, budget]) => value > budget);
    const status = failed.length ? "FAIL" : "PASS";
    if (failed.length) {
      failures.push(`${profile.name}/${route.name}: ${failed.map(([name, value, budget]) => `${name}=${value}>${budget}`).join(", ")}`);
    }

    console.log(
      `${status.padEnd(4)} ${profile.name.padEnd(7)} ${route.name.padEnd(17)} ` +
        `FCP ${String(result.fcpMs).padStart(4)}ms  LCP ${String(result.lcpMs).padStart(4)}ms  ` +
        `JS ${String(result.scriptKB).padStart(4)}KB  total ${String(result.totalKB).padStart(5)}KB  ` +
        `cold ${String(result.longTasks).padStart(2)}  long ` +
        `${String(result.sustainedLongTasks).padStart(2)}  heap +${result.heapGrowthMB}MB`,
    );
    await page.close();
  }

  await context.close();
}

await browser.close();

if (strict && failures.length) {
  console.error("\nPerformance budgets exceeded:");
  for (const failure of failures) console.error(`  ${failure}`);
  process.exit(1);
}

console.log("\nPerformance audit complete.");
