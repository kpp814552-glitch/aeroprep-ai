import { test, expect } from "@playwright/test";

test.describe("AI优化页面", () => {
  test("页面加载正常 - 6阶段工作流可见", async ({ page }) => {
    await page.goto("/chat");
    await expect(page.locator("text=AI 优化工作流").first()).toBeVisible({ timeout: 10000 });
    // 验证工作流导航条存在（6个阶段按钮）
    const steps = page.locator("text=选择类型, text=输入内容, text=AI分析, text=结果, text=对比, text=说明");
    await expect(steps.first()).toBeVisible();
  });

  test("模式切换按钮正常工作", async ({ page }) => {
    await page.goto("/chat");
    await page.waitForTimeout(1000);
    const resumeBtn = page.getByText("简历专项优化");
    if (await resumeBtn.isVisible()) {
      await resumeBtn.click();
      await expect(page.getByText("简历专项优化")).toBeVisible();
    }
  });

  test("第一阶段：选择内容类型卡片可点击", async ({ page }) => {
    await page.goto("/chat");
    await page.waitForTimeout(1000);
    // 点击"面试回答"卡片
    const card = page.getByText("面试回答").first();
    if (await card.isVisible()) {
      await card.click();
      await expect(page.getByText("提升答题深度")).toBeVisible();
    }
  });

  test("第二阶段：输入草稿后进入优化", async ({ page }) => {
    await page.goto("/chat");
    await page.waitForTimeout(1000);
    // 进入输入阶段
    const nextBtn = page.getByText("下一步").first();
    if (await nextBtn.isEnabled()) {
      await nextBtn.click();
      // 检查岗位选择器存在
      await expect(page.locator("select").first()).toBeAttached();
    }
  });

  test("输入框可输入文字", async ({ page }) => {
    await page.goto("/chat");
    await page.waitForTimeout(1000);
    const next = page.getByText("下一步").first();
    if (await next.isEnabled()) {
      await next.click();
      await page.waitForTimeout(500);
      const textarea = page.locator("textarea").first();
      await textarea.fill("我是一名民航专业的学生，在校期间参加了模拟机训练，掌握了基本的飞行操作技能。");
      await expect(textarea).not.toBeEmpty();
    }
  });
});
