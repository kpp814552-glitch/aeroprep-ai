import { test, expect } from "@playwright/test";
import { isFirstOrderEligible, type CreditOrder } from "../lib/member/wallet";
import { PACKS } from "../lib/member/wallet-server";

function makeOrder(overrides: Partial<CreditOrder> = {}): CreditOrder {
  return {
    id: "AP-TEST-0001",
    packId: "c1",
    credits: 1,
    amount: 2.9,
    channel: "wechat",
    status: "pending",
    appliedAt: new Date(0).toISOString(),
    ...overrides,
  };
}

test.describe("首单体验资格", () => {
  test("无付费订单时可用", () => {
    expect(isFirstOrderEligible([])).toBe(true);
  });

  test("被拒绝的订单不影响资格", () => {
    expect(isFirstOrderEligible([makeOrder({ status: "rejected" })])).toBe(true);
  });

  test("待审核、已通过、已撤销订单都会占用资格", () => {
    expect(isFirstOrderEligible([makeOrder({ status: "pending" })])).toBe(false);
    expect(isFirstOrderEligible([makeOrder({ status: "approved" })])).toBe(false);
    expect(isFirstOrderEligible([makeOrder({ status: "revoked" })])).toBe(false);
  });

  test("管理员手工调账不占首单资格", () => {
    expect(isFirstOrderEligible([makeOrder({ channel: "manual", status: "approved" })])).toBe(true);
  });

  test("历史次数迁移不占首单资格", () => {
    expect(isFirstOrderEligible([makeOrder({ channel: "legacy", status: "pending" })])).toBe(true);
  });
});

test.describe("服务端价目", () => {
  test("首单和正式套餐金额正确", () => {
    expect(PACKS.first1).toMatchObject({ credits: 1, amount: 1 });
    expect(PACKS.c1).toMatchObject({ credits: 1, amount: 2.9 });
    expect(PACKS.c5).toMatchObject({ credits: 5, amount: 9.9 });
    expect(PACKS.c10).toMatchObject({ credits: 10, amount: 16.9 });
  });
});

test.describe("购买页价格", () => {
  test("未登录不能创建首单订单", async ({ request }) => {
    const response = await request.post("/api/payment/create", {
      data: { packId: "first1" },
    });
    expect(response.status()).toBe(401);
  });

  test("展示首单体验和正式套餐价格", async ({ page }) => {
    await page.goto("/member");

    await expect(page.getByText("新用户首单体验")).toBeVisible();
    await expect(page.getByText("¥1", { exact: true }).first()).toBeVisible();
    await expect(page.getByText("¥2.9", { exact: false }).first()).toBeVisible();
    await expect(page.getByText("¥9.9", { exact: false }).first()).toBeVisible();
    await expect(page.getByText("¥16.9", { exact: false }).first()).toBeVisible();
  });

  test("常见问题展示新价格", async ({ page }) => {
    await page.goto("/faq");
    await page.getByRole("button", { name: /次数与支付/ }).click();
    await page.getByRole("button", { name: "目前如何收费？" }).click();
    await expect(page.getByText(/首单可 ¥1 体验 1 次/)).toBeVisible();
    await expect(page.getByText(/10 次 ¥16\.9/)).toBeVisible();
  });
});
