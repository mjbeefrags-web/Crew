/** Generate small WebP thumbs for the homepage art universe. */
import { chromium } from "@playwright/test";

const base = process.env.PERF_BASE_URL ?? "http://localhost:5199";
const ids = [
  "01-out-of-focus-dtg-back-print",
  "02-life-in-scroll-dtg-back-print",
  "03-the-gift-theory-dtg-back-print",
  "04-lost-in-the-frequency-dtg-back-print",
  "05-outsourced-mind-dtg-back-print",
];
const browser = await chromium.launch();
const page = await browser.newPage();
await page.goto(base);
for (const id of ids) {
  const path = `/images/drops/psychedelic-minds/print-plates/${id}.webp`;
  const data = await page.evaluate(async (src) => {
    const img = new Image();
    const ready = new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = reject;
    });
    img.src = src;
    await ready;
    const scale = Math.min(1, 420 / img.naturalWidth);
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(img.naturalWidth * scale);
    canvas.height = Math.round(img.naturalHeight * scale);
    canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/webp", 0.64);
  }, path);
  const fs = await import("node:fs/promises");
  await fs.mkdir("public/images/drops/psychedelic-minds/print-plates/thumbs", {
    recursive: true,
  });
  await fs.writeFile(
    `public/images/drops/psychedelic-minds/print-plates/thumbs/${id}.webp`,
    Buffer.from(data.split(",")[1], "base64"),
  );
}
await browser.close();
