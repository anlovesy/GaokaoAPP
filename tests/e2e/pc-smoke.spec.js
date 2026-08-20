import { expect, test } from "@playwright/test";

const PC_WIDTHS = [1920, 1728, 1600, 1536, 1440, 1366, 1280];

async function enterGuestWorkspace(page) {
  await page.goto("/");
  await expect(page.locator(".landing-enter-btn")).toBeVisible();
  await page.locator(".landing-enter-btn").click();
  await expect(page).toHaveURL(/\/login$/);

  await expect(page.locator(".auth-panel-actions button").first()).toBeVisible();
  await page.locator(".auth-panel-actions button").first().click();
  await expect(page).toHaveURL(/\/navigation$/);
}

async function generateGuestPlan(page) {
  await enterGuestWorkspace(page);
  const continueButton = page.locator(".navigation-continue-btn");
  await expect(continueButton).toBeVisible();
  await expect(continueButton).toBeEnabled();
  await continueButton.click();
  await expect(page).toHaveURL(/\/workspace$/);
  await expect(page.locator(".decision-hero-copy h1")).toBeVisible({ timeout: 30000 });
  await expect(page.locator(".decision-shelf-media img").first()).toBeVisible();
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

test("official enrollment plans expose concrete majors and tuition", async ({ request }) => {
  const response = await request.get(
    "/api/data/plans?provinceCode=GD&year=2026&trackType=physics&keyword=%E5%8D%8E%E5%8D%97%E7%90%86%E5%B7%A5%E5%A4%A7%E5%AD%A6&limit=60"
  );
  expect(response.ok()).toBeTruthy();

  const payload = await response.json();
  const items = payload.data?.items || [];

  expect(items.length).toBeGreaterThanOrEqual(20);
  expect(items.every((item) => item.plan_source_type === "official_csv")).toBeTruthy();
  expect(items.every((item) => Number(item.plan_count) > 0)).toBeTruthy();
  expect(items.every((item) => Number(item.tuition_fee) > 0)).toBeTruthy();
  expect(items.every((item) => !String(item.major_name || "").startsWith("专业组"))).toBeTruthy();
  expect(items.some((item) => item.major_name === "软件工程")).toBeTruthy();
  expect(items.some((item) => String(item.major_name || "").includes("工业设计"))).toBeTruthy();
});

test("workspace stays stable across PC breakpoints after plan generation", async ({ page }) => {
  await generateGuestPlan(page);

  for (const width of PC_WIDTHS) {
    await page.setViewportSize({ width, height: 900 });
    await page.waitForTimeout(150);

    const metrics = await page.evaluate(() => {
      const shelfImages = [...document.querySelectorAll(".decision-shelf-media img")];
      const hero = document.querySelector(".decision-hero-copy h1");
      const shelfCards = document.querySelectorAll(".decision-shelf-card");

      return {
        hasHorizontalOverflow: document.documentElement.scrollWidth > window.innerWidth + 1,
        bodyOverflowY: getComputedStyle(document.body).overflowY,
        heroVisible: Boolean(hero),
        shelfImagesLoaded: shelfImages.filter((image) => image.complete && image.naturalWidth > 0)
          .length,
        shelfCardCount: shelfCards.length
      };
    });

    expect(metrics.hasHorizontalOverflow).toBeFalsy();
    expect(metrics.bodyOverflowY).not.toBe("hidden");
    expect(metrics.heroVisible).toBeTruthy();
    expect(metrics.shelfImagesLoaded).toBeGreaterThanOrEqual(3);
    expect(metrics.shelfCardCount).toBeGreaterThanOrEqual(3);
  }
});

test("switching schools updates local image binding", async ({ page }) => {
  await generateGuestPlan(page);

  const schoolCards = page.locator(".decision-shelf-card");
  await expect(schoolCards.first()).toBeVisible();
  const rowCount = await schoolCards.count();
  expect(rowCount).toBeGreaterThan(1);

  const initialSrc = await page.locator(".decision-shelf-media img").first().getAttribute("src");
  await schoolCards.nth(1).click();
  await expect(page).toHaveURL(/\/university$/);

  await expect
    .poll(async () => page.locator(".university-dossier-media img").getAttribute("src"))
    .not.toBe(initialSrc);
});

test("advisor uses independent scroll layout on PC", async ({ page }) => {
  await generateGuestPlan(page);
  await page.locator(".decision-open-button").click();
  await expect(page).toHaveURL(/\/advisor$/);
  await expect(page.locator(".advisor-conversation-panel")).toBeVisible();
  await expect(page.locator(".advisor-input-dock")).toBeVisible();

  const metrics = await page.evaluate(() => {
    const body = document.body;
    const shell = document.querySelector(".advisor-os-shell");
    const conversation = document.querySelector(".advisor-conversation-panel");
    const input = document.querySelector(".advisor-input-dock");

    return {
      bodyOverflowY: getComputedStyle(body).overflowY,
      pageCanScroll: document.documentElement.scrollHeight > window.innerHeight,
      shellOverflowY: shell ? getComputedStyle(shell).overflowY : null,
      conversationOverflowY: conversation ? getComputedStyle(conversation).overflowY : null,
      conversationClientHeight: conversation?.clientHeight || 0,
      inputPosition: input ? getComputedStyle(input).position : null
    };
  });

  expect(metrics.bodyOverflowY).not.toBe("hidden");
  expect(metrics.pageCanScroll).toBeTruthy();
  expect(metrics.shellOverflowY).toBe("hidden");
  expect(metrics.conversationOverflowY).toBe("hidden");
  expect(metrics.conversationClientHeight).toBeGreaterThan(0);
  expect(metrics.inputPosition).toBe("sticky");
});

test("guest flow remains usable on mobile without horizontal overflow", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await generateGuestPlan(page);

  const metrics = await page.evaluate(() => ({
    hasHorizontalOverflow: document.documentElement.scrollWidth > window.innerWidth + 1,
    bodyOverflowY: getComputedStyle(document.body).overflowY,
    hasWorkspaceContent: Boolean(document.querySelector(".decision-hero-copy h1"))
  }));

  expect(metrics.hasHorizontalOverflow).toBeFalsy();
  expect(metrics.bodyOverflowY).not.toBe("hidden");
  expect(metrics.hasWorkspaceContent).toBeTruthy();
});
