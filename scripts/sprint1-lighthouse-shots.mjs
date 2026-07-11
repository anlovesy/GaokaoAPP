import { chromium } from "@playwright/test";
import fs from "node:fs/promises";
import path from "node:path";

const previewDir = path.resolve("preview", "sprint-1");

const reports = [
  {
    html: path.resolve(previewDir, "lighthouse-landing.report.html"),
    shot: path.resolve(previewDir, "lighthouse-landing.png")
  },
  {
    html: path.resolve(previewDir, "lighthouse-login.report.html"),
    shot: path.resolve(previewDir, "lighthouse-login.png")
  }
];

async function main() {
  await fs.mkdir(previewDir, { recursive: true });
  const browser = await chromium.launch({ headless: true });

  try {
    for (const report of reports) {
      const context = await browser.newContext({
        viewport: { width: 1600, height: 2200 },
        deviceScaleFactor: 1
      });
      const page = await context.newPage();
      await page.goto(`file:///${report.html.replace(/\\/g, "/")}`, { waitUntil: "load" });
      await page.screenshot({
        path: report.shot,
        fullPage: false
      });
      await context.close();
    }
  } finally {
    await browser.close();
  }
}

await main();
