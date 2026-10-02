// Renders README.md the way GitHub does (via the gfm API) into preview/ screenshots. Run: npm run preview
import { chromium } from "playwright";
import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync, readFileSync, existsSync } from "node:fs";
import { pathToFileURL, fileURLToPath } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
mkdirSync(path.join(root, "preview"), { recursive: true });
const html = execFileSync("gh", ["api", "markdown", "-F", "text=@README.md", "-f", "mode=gfm"], { cwd: root, encoding: "utf8", maxBuffer: 1 << 24 });
const css = `body{margin:0;background:#0d1117;color:#e6edf3;font:16px/1.5 -apple-system,"Segoe UI",Helvetica,Arial,sans-serif}
main{max-width:896px;margin:0 auto;padding:32px 16px;box-sizing:border-box}
a{color:#4493f8}img{max-width:100%;height:auto}h2{border-bottom:1px solid #3d444d;padding-bottom:.3em;margin-top:24px}
table{border-collapse:collapse;display:block;overflow:auto}th,td{border:1px solid #3d444d;padding:6px 13px}tr:nth-child(2n){background:#151b23}
details{margin:16px 0}`;
writeFileSync(path.join(root, "preview/index.html"), `<!doctype html><meta charset="utf-8"><base href="${pathToFileURL(root).href}/"><style>${css}</style><main>${html}</main>`);

// Every <img src> must resolve to a file in the repo.
const missing = [...readFileSync(path.join(root, "README.md"), "utf8").matchAll(/<img[^>]+src="([^"]+)"/g)].map((m) => m[1]).filter((p) => !existsSync(path.join(root, p)));
console.log(missing.length ? `MISSING images: ${missing}` : "all image paths resolve");

const browser = await chromium.launch();
for (const [name, width] of [["desktop-1280", 1280], ["mobile-390", 390]]) {
  const page = await browser.newPage({ viewport: { width, height: 900 }, deviceScaleFactor: 1 });
  await page.goto(pathToFileURL(path.join(root, "preview/index.html")).href, { waitUntil: "networkidle" });
  const broken = await page.evaluate(() => [...document.images].filter((i) => !i.naturalWidth).map((i) => i.src));
  if (broken.length) console.log("BROKEN:", broken);
  await page.screenshot({ path: path.join(root, `preview/${name}.png`), fullPage: true });
  console.log(`preview/${name}.png`);
  await page.close();
}
await browser.close();
