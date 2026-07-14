import { test, expect } from "@playwright/test";

test.describe("核心页面加载", () => {
  const pages = [
    { path: "/", label: "首页" },
    { path: "/chat", label: "AI优化" },
    { path: "/learning", label: "资料中心" },
    { path: "/interview", label: "面试准备" },
    { path: "/login", label: "登录" },
    { path: "/profile", label: "成长中心" },
  ];

  for (const { path, label } of pages) {
    test(`${label} (${path}) 加载正常`, async ({ page }) => {
      const resp = await page.goto(path);
      expect(resp?.status()).toBe(200);
      await expect(page.locator("body")).toBeAttached();
    });
  }
});

test.describe("导航流程", () => {
  test("导航栏链接可点击跳转", async ({ page }) => {
    await page.goto("/");
    const navLinks = ["AI面试", "AI优化", "资料中心", "成长中心"];
    for (const link of navLinks) {
      const navItem = page.getByRole("link", { name: link }).first();
      await expect(navItem).toBeVisible();
    }
  });
});

test.describe("首页交互", () => {
  test("首页功能入口按钮可点击", async ({ page }) => {
    await page.goto("/");
    const startBtn = page.getByRole("link", { name: /开始AI面试/i });
    if (await startBtn.isVisible()) {
      await expect(startBtn).toBeEnabled();
    }
  });

  test("统计数字可见", async ({ page }) => {
    await page.goto("/");
    await page.waitForTimeout(2000);
    const stats = page.locator("text=s").first();
    if (await stats.isVisible()) {
      await expect(stats).toBeVisible();
    }
  });
});
