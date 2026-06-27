import { expect, test } from "@playwright/test";

const PC_WIDTHS = [1920, 1728, 1600, 1536, 1440, 1366, 1280];

async function enterGuestWorkspace(page) {
  await page.goto("/");
  await expect(page.getByRole("button", { name: "游客体验" })).toBeVisible();
  await page.getByRole("button", { name: "游客体验" }).click();
  await expect(page).toHaveURL(/\/workspace$/);
}

async function generateGuestPlan(page) {
  await enterGuestWorkspace(page);
  const generateButton = page.getByRole("button", { name: /生成/ });
  await expect(generateButton).toBeVisible();
  await generateButton.click();
  await expect(page.locator(".workspace-focus-copy h4")).toBeVisible({ timeout: 30000 });
  await expect(page.locator(".university-editorial-hero img")).toBeVisible();
}

test("landing and login routes load without horizontal overflow", async ({ page }) => {
  for (const route of ["/", "/login"]) {
    await page.goto(route);
    await page.waitForLoadState("domcontentloaded");
    const metrics = await page.evaluate(() => ({
      hasHorizontalOverflow: document.documentElement.scrollWidth > window.innerWidth + 1,
      path: window.location.pathname
    }));

    expect(metrics.hasHorizontalOverflow).toBeFalsy();
  }
});

test("workspace stays stable across PC breakpoints after plan generation", async ({ page }) => {
  await generateGuestPlan(page);

  for (const width of PC_WIDTHS) {
    await page.setViewportSize({ width, height: 900 });
    await page.waitForTimeout(150);

    const metrics = await page.evaluate(() => {
      const detailImage = document.querySelector(".university-editorial-hero img");
      const focusImage = document.querySelector(".workspace-focus-media img");
      const admissionRow = document.querySelector(".editorial-admission-row");

      return {
        hasHorizontalOverflow: document.documentElement.scrollWidth > window.innerWidth + 1,
        bodyOverflowY: getComputedStyle(document.body).overflowY,
        focusImageLoaded: Boolean(focusImage?.complete && focusImage?.naturalWidth > 0),
        detailImageLoaded: Boolean(detailImage?.complete && detailImage?.naturalWidth > 0),
        detailImageSrc: detailImage?.getAttribute("src") || "",
        admissionCellCount: admissionRow?.children.length || 0
      };
    });

    expect(metrics.hasHorizontalOverflow).toBeFalsy();
    expect(metrics.bodyOverflowY).not.toBe("hidden");
    expect(metrics.focusImageLoaded).toBeTruthy();
    expect(metrics.detailImageLoaded).toBeTruthy();
    expect(metrics.detailImageSrc).toContain("/universities/");
    expect(metrics.admissionCellCount).toBeGreaterThanOrEqual(3);
  }
});

test("switching schools updates local image binding", async ({ page }) => {
  await generateGuestPlan(page);

  const schoolRows = page.locator(".workspace-tier-row");
  await expect(schoolRows.first()).toBeVisible();
  const rowCount = await schoolRows.count();
  expect(rowCount).toBeGreaterThan(1);

  const initialSrc = await page.locator(".university-editorial-hero img").getAttribute("src");
  await schoolRows.nth(1).hover();

  await expect
    .poll(async () => page.locator(".university-editorial-hero img").getAttribute("src"))
    .not.toBe(initialSrc);
});

test("advisor uses independent scroll layout on PC", async ({ page }) => {
  await generateGuestPlan(page);
  await page.getByRole("button", { name: "全屏打开" }).click();
  await expect(page).toHaveURL(/\/advisor$/);
  await expect(page.locator(".advisor-chat-stage")).toBeVisible();

  const metrics = await page.evaluate(() => {
    const body = document.body;
    const shell = document.querySelector(".advisor-workbench-shell");
    const rail = document.querySelector(".advisor-mode-rail");
    const stage = document.querySelector(".advisor-conversation-stage");
    const chat = document.querySelector(".advisor-chat-stage");
    const input = document.querySelector(".advisor-input-stage");
    const stageRect = stage?.getBoundingClientRect();
    const inputRect = input?.getBoundingClientRect();

    return {
      bodyOverflowY: getComputedStyle(body).overflowY,
      pageCanScroll: document.documentElement.scrollHeight > window.innerHeight,
      shellOverflowY: shell ? getComputedStyle(shell).overflowY : null,
      railOverflowY: rail ? getComputedStyle(rail).overflowY : null,
      stageOverflowY: stage ? getComputedStyle(stage).overflowY : null,
      chatOverflowY: chat ? getComputedStyle(chat).overflowY : null,
      chatClientHeight: chat?.clientHeight || 0,
      inputBottomGap:
        stageRect && inputRect ? Math.round(stageRect.bottom - inputRect.bottom) : Number.NaN
    };
  });

  expect(metrics.bodyOverflowY).not.toBe("hidden");
  expect(metrics.pageCanScroll).toBeFalsy();
  expect(metrics.shellOverflowY).toBe("hidden");
  expect(metrics.railOverflowY).toBe("auto");
  expect(metrics.stageOverflowY).toBe("hidden");
  expect(metrics.chatOverflowY).toBe("auto");
  expect(metrics.chatClientHeight).toBeGreaterThan(0);
  expect(metrics.inputBottomGap).toBeGreaterThanOrEqual(0);
});
