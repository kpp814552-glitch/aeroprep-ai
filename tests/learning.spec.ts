import { expect, test } from "@playwright/test";

test.describe("资料中心", () => {
  test("四条学习主线与我的学习正常展示", async ({ page }) => {
    await page.goto("/learning");
    await expect(page.getByText("民航面试能力训练库").first()).toBeVisible();
    for (const label of ["面试必修", "表达训练", "岗位专项", "民航基础", "实战训练"]) {
      await expect(page.getByText(label, { exact: true }).first()).toBeVisible();
    }
    await expect(page.getByText("我的收藏", { exact: true })).toBeVisible();
    await expect(page.getByText("学习进度", { exact: true })).toBeVisible();
  });

  test("搜索并打开训练内容", async ({ page }) => {
    await page.goto("/learning");
    await page.getByPlaceholder("搜索知识与训练").first().fill("STAR");
    await expect(page.getByText("STAR 案例法：让经历有证据")).toBeVisible();
    await page.getByText("STAR 案例法：让经历有证据").click();
    await expect(page.getByText("学完你要做到")).toBeVisible();
    await expect(page.getByText("练习：先想，再看示范")).toBeVisible();
  });

  test("岗位专项内容可进入", async ({ page }) => {
    await page.goto("/learning");
    await page.getByText("岗位专项", { exact: true }).first().click();
    await page.getByText("飞行员面试：安全、纪律与决策").click();
    await expect(page.getByText("核心能力")).toBeVisible();
    await expect(page.getByText("常见扣分点")).toBeVisible();
  });
});
