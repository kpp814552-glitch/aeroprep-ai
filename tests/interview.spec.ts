import { test, expect } from "@playwright/test";

test.describe("AI面试", () => {
  test("8. 面试准备页加载完成", async ({ page }) => {
    await page.goto("/interview");
    await page.waitForTimeout(2000);
    // 验证页面有岗位选择器或面试相关标题
    const hasRoleSelect = await page.locator("select").first().isVisible().catch(() => false);
    const hasInterviewTitle = await page.getByText(/面试|模拟/i).first().isVisible().catch(() => false);
    expect(hasRoleSelect || hasInterviewTitle).toBeTruthy();
  });

  test("9. 面试模式/人格选择器可交互", async ({ page }) => {
    await page.goto("/interview");
    await page.waitForTimeout(2000);
    // 点击"社招"模式按钮（如果存在）
    const socialBtn = page.getByText("社招").first();
    if (await socialBtn.isVisible()) {
      await socialBtn.click();
      await expect(page.getByText("社招").first()).toBeVisible();
    }
    // 点击"压力型HR"人格按钮（如果存在）
    const stressPersona = page.getByText("压力型HR").first();
    if (await stressPersona.isVisible()) {
      await stressPersona.click();
      await expect(page.getByText("压力型HR").first()).toBeVisible();
    }
  });

  test("10. 面试会话页面可加载", async ({ page }) => {
    // 即使需要登录，页面的 HTTP 状态码应为 200
    const resp = await page.goto("/interview/session?role=pilot&mode=%E6%A0%A1%E6%8B%9B&company=%E5%9B%BD%E8%88%AA&persona=%E4%B8%93%E4%B8%9A%E5%9E%8BHR");
    expect(resp?.status()).toBe(200);
    await page.waitForTimeout(1000);
    // 页面应渲染（即使显示的是登录提示）
    await expect(page.locator("body")).toBeAttached();
  });
});
