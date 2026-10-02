// Renders assets/src/*.html to assets/*.png at 2x with Playwright. Run: npm run render
import { chromium } from "playwright";
import sharp from "sharp";
import { writeFileSync } from "node:fs";
import { pathToFileURL, fileURLToPath } from "node:url";
import { statSync } from "node:fs";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
// [source, output, selector (null = whole page), transparent background]
const jobs = [
  ["banner", "banner", "body", false],
  ["abilities", "abilities", "body", false],
  ["arsenal", "arsenal", "#b", true],
  ["cta-upwork", "cta-upwork", "#b", true],
  ["cta-linkedin", "cta-linkedin", "#b", true],
  ["cta-github", "cta-github", "#b", true],
];

const browser = await chromium.launch();
const ctx = await browser.newContext({ deviceScaleFactor: 2 });
for (const [src, out, sel, transparent] of jobs) {
  const page = await ctx.newPage();
  await page.goto(pathToFileURL(path.join(root, "assets/src", `${src}.html`)).href, { waitUntil: "networkidle" });
  await page.evaluate(() => document.fonts.ready);
  const fonts = await page.evaluate(() => [...document.fonts].filter((f) => f.status === "loaded").map((f) => f.family));
  const file = path.join(root, "assets", `${out}.png`);
  if (sel) await page.locator(sel).screenshot({ path: file, omitBackground: transparent });
  else await page.screenshot({ path: file, fullPage: true });
  if (!transparent) {
    // Grain makes raw PNGs huge; palette quantization keeps each asset under ~300 KB.
    writeFileSync(file, await sharp(file).png({ palette: true, quality: 70, effort: 10, dither: 1 }).toBuffer());
  }
  console.log(`${out}.png  ${(statSync(file).size / 1024).toFixed(1)} KB  fonts: ${[...new Set(fonts)].join(", ") || "NONE"}`);
  await page.close();
}
await browser.close();
