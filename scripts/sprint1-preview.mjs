import { chromium, devices } from "@playwright/test";
import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const previewDir = path.resolve("preview", "sprint-1");

const targets = [
  {
    route: "/",
    name: "landing",
    waitsFor: ".landing-editorial-hero"
  },
  {
    route: "/login",
    name: "login",
    waitsFor: ".auth-editorial-stage"
  }
];

const desktopViewports = [
  { label: "desktop-1440", width: 1440, height: 1024 },
  { label: "desktop-1920", width: 1920, height: 1080 },
  { label: "desktop-2560", width: 2560, height: 1440 }
];

const mobilePresets = [
  { label: "mobile-390", device: devices["iPhone 12"] },
  { label: "mobile-430", viewport: { width: 430, height: 932 }, userAgent: devices["iPhone 14 Pro Max"].userAgent }
];

async function ensureDir(dir) {
  await fs.mkdir(dir, { recursive: true });
}

async function captureDesktop(browser, baseUrl, target, viewport) {
  const context = await browser.newContext({
    viewport: { width: viewport.width, height: viewport.height },
    deviceScaleFactor: 1
  });
  const page = await context.newPage();
  await page.goto(`${baseUrl}${target.route}`, { waitUntil: "networkidle" });
  await page.waitForSelector(target.waitsFor, { timeout: 30000 });
  await page.screenshot({
    path: path.join(previewDir, `${target.name}-${viewport.label}.png`),
    fullPage: true
  });
  await context.close();
}

async function captureMobile(browser, baseUrl, target, preset) {
  const config = preset.device
    ? {
        ...preset.device
      }
    : {
        viewport: preset.viewport,
        userAgent: preset.userAgent,
        deviceScaleFactor: 3,
        isMobile: true,
        hasTouch: true
      };

  const context = await browser.newContext(config);
  const page = await context.newPage();
  await page.goto(`${baseUrl}${target.route}`, { waitUntil: "networkidle" });
  await page.waitForSelector(target.waitsFor, { timeout: 30000 });
  await page.screenshot({
    path: path.join(previewDir, `${target.name}-${preset.label}.png`),
    fullPage: true
  });
  await context.close();
}

async function main() {
  const baseUrl = process.env.PREVIEW_BASE_URL || "http://127.0.0.1:4173";
  await ensureDir(previewDir);
  const browser = await chromium.launch({ headless: true });

  try {
    for (const target of targets) {
      for (const viewport of desktopViewports) {
        await captureDesktop(browser, baseUrl, target, viewport);
      }

      for (const preset of mobilePresets) {
        await captureMobile(browser, baseUrl, target, preset);
      }
    }
  } finally {
    await browser.close();
  }
}

await main();
