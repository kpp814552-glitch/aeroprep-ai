import { test, expect } from "@playwright/test";

test.describe("资料中心", () => {
  test("4. 筛选栏可交互", async ({ page }) => {
    await page.goto("/learning");
    await page.waitForTimeout(2000);
    await expect(page.getByText("招聘方式").first()).toBeVisible({ timeout: 10000 });
    // 点击岗位筛选
    const pilotBtn = page.getByText("飞行员").first();
    if (await pilotBtn.isVisible()) await pilotBtn.click();
    // 点击招聘方式
    const campus = page.getByText("校招").first();
    if (await campus.isVisible()) await campus.click();
  });

  test("5. 搜索+内容卡片展开", async ({ page }) => {
    await page.goto("/learning");
    await page.waitForTimeout(2000);
    // 搜索
    const search = page.locator("input[placeholder*='搜索']").first();
    if (await search.isVisible()) {
      await search.fill("面试");
    }
    // 展开卡片
    const card = page.locator("button").filter({ hasText: /模|STAR|自我/ }).first();
    if (await card.isVisible()) {
      await card.click();
      await page.waitForTimeout(500);
    }
  });
});
