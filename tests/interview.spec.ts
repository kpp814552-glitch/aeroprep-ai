import { test, expect } from "@playwright/test";
import { buildFastStartQuestion } from "../lib/interview/config";
import { analyzeInterviewReport } from "../lib/interview/report";

test.describe("AI面试", () => {
  test("首题本地即时生成", () => {
    const question = buildFastStartQuestion("pilot", "国航", "航空服务专业");
    expect(question).toContain("国航");
    expect(question).toContain("飞行员");
    expect(question).toContain("简历我已经看过了");
    expect(question).toContain("自我介绍");
  });

  test("弱回答会直接指出面试能力不足", () => {
    const report = analyzeInterviewReport({
      role: "pilot",
      company: "国航",
      mode: "校招",
      turns: [
        { question: "请自我介绍", answer: "我叫小王。", stage: "self-intro" },
        { question: "为什么想成为飞行员？", answer: "因为喜欢飞机。", stage: "role-fit" },
        { question: "如何处理飞行中的异常？", answer: "听机长的。", stage: "scenario" },
      ],
    });

    expect(report.comprehensiveEvaluation).toContain("面试能力偏弱");
    expect(report.comprehensiveEvaluation).toContain("进入下一轮的可能性较低");
    expect(report.perQuestionAnalysis[0]).toContain("面试官判断");
  });

  test("报告页只展示雷达图、综合评价和逐题分析", async ({ page }) => {
    const turns = [
      { question: "请做一个自我介绍", answer: "我叫小王，是航空服务专业学生，参加过礼仪培训。", stage: "self-intro" as const },
      { question: "为什么选择这个岗位？", answer: "我了解岗位需要安全意识，也愿意持续学习。", stage: "role-fit" as const },
    ];
    const report = analyzeInterviewReport({
      role: "cabin-crew",
      company: "南航",
      mode: "校招",
      turns,
    });
    const record = {
      sessionId: "report-page-contract",
      company: "南航",
      role: "cabin-crew",
      roleLabel: "乘务员",
      mode: "校招",
      persona: "亲和型HR",
      interviewer: "客舱服务招聘面试官",
      elapsedSeconds: 420,
      turns,
      createdAt: new Date(0).toISOString(),
      report,
    };

    await page.addInitScript((session) => {
      localStorage.setItem("aeroprep-ai-interview-sessions", JSON.stringify([session]));
      localStorage.setItem("aeroprep-ai-latest-session", session.sessionId);
    }, record);

    await page.goto("/interview/report?sessionId=report-page-contract");
    await expect(page.getByText("能力雷达图")).toBeVisible();
    await expect(page.getByText("综合评价", { exact: true })).toBeVisible();
    await expect(page.getByText("逐题分析", { exact: true })).toBeVisible();
    await expect(page.getByText("优势分析", { exact: true })).toHaveCount(0);
    await expect(page.getByText("民航岗位竞争力评估", { exact: true })).toHaveCount(0);

    await page.getByRole("button", { name: /第 1 题/ }).click();
    await expect(page.getByText("你的回答原文")).toBeVisible();
    await expect(page.getByRole("button", { name: /用 AI 深入优化这段回答/ })).toBeVisible();
  });

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
