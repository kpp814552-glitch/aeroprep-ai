import { test, expect } from "@playwright/test";

test.describe("AI优化", () => {
  test("6. 模式切换+工作流导航", async ({ page }) => {
    await page.goto("/chat");
    await page.waitForTimeout(1500);
    await expect(page.getByText("AI 优化工作流").first()).toBeVisible({ timeout: 10000 });
    const resumeBtn = page.getByText("简历专项优化").first();
    if (await resumeBtn.isVisible()) {
      await resumeBtn.click();
      await expect(page.getByText("简历专项优化")).toBeVisible();
    }
  });

  test("7. 选择内容类型+输入草稿", async ({ page }) => {
    await page.goto("/chat");
    await page.waitForTimeout(1000);
    const card = page.getByText("面试回答").first();
    if (await card.isVisible()) {
      await card.click();
    }
    const next = page.getByText("下一步").first();
    if (await next.isEnabled()) {
      await next.click();
      await page.waitForTimeout(500);
      const ta = page.locator("textarea").first();
      await ta.fill("我是一名民航专业的学生，参加了模拟机训练。");
      await expect(ta).not.toBeEmpty();
    }
  });
});
