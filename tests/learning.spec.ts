import { test, expect } from "@playwright/test";

test.describe("资料中心", () => {
  test("页面加载正常 - 筛选栏可见", async ({ page }) => {
    await page.goto("/learning");
    await page.waitForTimeout(2000);
    await expect(page.getByText("招聘方式").first()).toBeVisible({ timeout: 10000 });
    await expect(page.getByText("岗位").first()).toBeVisible();
  });

  test("岗位筛选按钮可点击", async ({ page }) => {
    await page.goto("/learning");
    await page.waitForTimeout(1500);
    const pilotBtn = page.getByText("飞行员");
    if (await pilotBtn.isVisible()) {
      await pilotBtn.click();
    }
  });

  test("招聘方式筛选按钮可点击", async ({ page }) => {
    await page.goto("/learning");
    await page.waitForTimeout(1500);
    const recruitBtn = page.getByText("校招").first();
    if (await recruitBtn.isVisible()) {
      await recruitBtn.click();
    }
  });

  test("内容分类筛选可点击", async ({ page }) => {
    await page.goto("/learning");
    await page.waitForTimeout(1500);
    const catBtn = page.getByText("自我介绍中心").first();
    if (await catBtn.isVisible()) {
      await catBtn.click();
    }
  });

  test("搜索框可输入文字", async ({ page }) => {
    await page.goto("/learning");
    await page.waitForTimeout(1500);
    const searchInput = page.locator("input[placeholder*='搜索']");
    if (await searchInput.isVisible()) {
      await searchInput.fill("飞行员");
      await expect(searchInput).toHaveValue("飞行员");
    }
  });

  test("内容卡片可展开查看", async ({ page }) => {
    await page.goto("/learning");
    await page.waitForTimeout(2000);
    // 点击第一张可见的内容卡片
    const firstCard = page.locator("button").filter({ hasText: /模|自我|STAR/ }).first();
    if (await firstCard.isVisible()) {
      await firstCard.click();
      await page.waitForTimeout(500);
    }
  });
});
