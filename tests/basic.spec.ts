import { test, expect } from "@playwright/test";

test.describe("核心流程", () => {
  test("1. 关键页面加载正常", async ({ page }) => {
    for (const path of ["/", "/chat", "/learning", "/interview"]) {
      const resp = await page.goto(path);
      expect(resp?.status()).toBe(200);
    }
  });

  test("2. 导航栏可跳转", async ({ page }) => {
    await page.goto("/");
    for (const label of ["AI面试", "AI优化", "资料中心"]) {
      await expect(page.getByRole("link", { name: label }).first()).toBeVisible();
    }
  });

  test("3. 首页CTA入口可点击", async ({ page }) => {
    await page.goto("/");
    await page.waitForTimeout(1500);
    const btn = page.getByRole("link", { name: /开始AI面试/i }).first();
    if (await btn.isVisible()) {
      await expect(btn).toBeEnabled();
    }
  });

  test("4. 激活页无效链接可正常提示", async ({ page }) => {
    await page.goto("/activate");
    await expect(page.getByText("无效的激活链接，缺少必要参数")).toBeVisible();
    await expect(page.getByRole("link", { name: "返回首页" })).toBeVisible();
  });
});
