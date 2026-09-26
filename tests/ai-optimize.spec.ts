import { expect, test } from "@playwright/test";

test.describe("AI优化", () => {
  test("页面和模式切换正常", async ({ page }) => {
    await page.goto("/chat");
    await expect(page.getByText("面试官视角", { exact: false }).first()).toBeVisible();
    await expect(page.getByText("面试回答", { exact: true }).first()).toBeVisible();
    await expect(page.getByText("简历诊断", { exact: true }).first()).toBeVisible();
    await page.getByText("简历诊断", { exact: true }).first().click();
    await expect(page.getByText("简历诊断", { exact: true }).first()).toBeVisible();
  });

  test("输入草稿后可开始诊断", async ({ page }) => {
    await page.goto("/chat");
    const textarea = page.locator("textarea").first();
    await textarea.fill("我是一名航空服务专业学生，参加过礼仪培训和志愿服务，希望在面试中突出服务意识。");
    await expect(textarea).not.toBeEmpty();
    await expect(page.getByRole("button", { name: /开始深度诊断/ })).toBeEnabled();
  });
});
