import { chromium } from "@playwright/test";
import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const previewDir = path.resolve("preview", "login-sprint-2");
const baseUrl = process.env.PREVIEW_BASE_URL || "http://localhost:5173";

async function ensureDir(dir) {
  await fs.mkdir(dir, { recursive: true });
}

async function captureFull(page, width, height, fileName) {
  await page.setViewportSize({ width, height });
  await page.goto(`${baseUrl}/login`, { waitUntil: "networkidle" });
  await page.waitForSelector(".auth-focus-stage", { timeout: 30000 });
  await page.screenshot({
    path: path.join(previewDir, fileName),
    fullPage: true
  });
}

async function captureCard(page) {
  await page.setViewportSize({ width: 1920, height: 1080 });
  await page.goto(`${baseUrl}/login`, { waitUntil: "networkidle" });
  await page.waitForSelector(".auth-access-card", { timeout: 30000 });
  await page.locator(".auth-access-card").screenshot({
    path: path.join(previewDir, "login-card-closeup.png")
  });
}

async function captureMotionSequence(page) {
  await page.setViewportSize({ width: 1920, height: 1080 });
  await page.goto(`${baseUrl}/login`, { waitUntil: "domcontentloaded" });
  await page.waitForSelector(".auth-editorial-stage", { timeout: 30000 });

  await page.waitForTimeout(250);
  await page.screenshot({
    path: path.join(previewDir, "login-motion-01-load.png"),
    fullPage: true
  });

  await page.mouse.move(420, 320, { steps: 12 });
  await page.waitForTimeout(700);
  await page.screenshot({
    path: path.join(previewDir, "login-motion-02-parallax-left.png"),
    fullPage: true
  });

  await page.mouse.move(1520, 210, { steps: 16 });
  await page.waitForTimeout(700);
  await page.screenshot({
    path: path.join(previewDir, "login-motion-03-parallax-right.png"),
    fullPage: true
  });
}

async function main() {
  await ensureDir(previewDir);
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  try {
    await captureFull(page, 1920, 1080, "login-desktop-1920.png");
    await captureFull(page, 1440, 1024, "login-desktop-1440.png");
    await captureCard(page);
    await captureMotionSequence(page);
  } finally {
    await browser.close();
  }
}

await main();
