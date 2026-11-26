/**
 * Re-encode the editorial/product JPEGs as WebP using the browser's encoder
 * (Playwright is already a dev dependency). Run against the dev server:
 *
 *   PERF_BASE_URL=http://localhost:5173 node scripts/optimize-images.mjs
 *
 * Originals are kept; the app points at the smaller WebP copies.
 */
import { readdir, writeFile } from "node:fs/promises";
import { chromium } from "@playwright/test";

const base = process.env.PERF_BASE_URL ?? "http://localhost:5199";
const groups = [
  {
    dir: "public/images/crewww",
    prefix: "/images/crewww/",
    width: 1200,
    quality: 0.78,
  },
  {
    dir: "public/images/editorial",
    prefix: "/images/editorial/",
    width: 1800,
    quality: 0.76,
  },
];

const browser = await chromium.launch();
const page = await browser.newPage();
await page.goto(base);

let saved = 0;
for (const group of groups) {
  const files = (await readdir(group.dir)).filter((name) =>
    name.endsWith(".jpg"),
  );
  for (const file of files) {
    const path = `${group.prefix}${file}`;
    const webp = await page.evaluate(
      async ({ path, width, quality }) => {
        const image = new Image();
        const decoded = new Promise((resolve, reject) => {
          image.onload = resolve;
          image.onerror = () => reject(new Error(`cannot decode ${path}`));
        });
        image.src = path;
        await decoded;
        const scale = Math.min(1, width / image.naturalWidth);
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(image.naturalWidth * scale);
        canvas.height = Math.round(image.naturalHeight * scale);
        canvas
          .getContext("2d")
          .drawImage(image, 0, 0, canvas.width, canvas.height);
        return canvas.toDataURL("image/webp", quality).split(",")[1];
      },
      { path, width: group.width, quality: group.quality },
    );
    const bytes = Buffer.from(webp, "base64");
    await writeFile(`${group.dir}/${file.replace(/\.jpg$/, ".webp")}`, bytes);
    saved += bytes.length;
  }
  console.log(`${group.dir}: ${files.length} WebP files`);
}
console.log(`generated ${(saved / 1024 / 1024).toFixed(2)} MB of WebP images`);
await browser.close();
