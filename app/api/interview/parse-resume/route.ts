import { NextResponse } from "next/server";

/**
 * Parses a PDF or DOCX resume and returns extracted text.
 */
export async function POST(request: Request) {
  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "请求格式错误" }, { status: 400 });
  }

  const file = formData.get("file");
  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: "请上传简历文件" }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const fileName = file.name.toLowerCase();

  try {
    let text = "";

    if (fileName.endsWith(".pdf")) {
      // Use pdf-parse to extract text
      const pdfParse = (await import("pdf-parse"));
      // pdf-parse might be ESM or CJS
      const data = await (typeof pdfParse === "function" ? pdfParse : (pdfParse as unknown as { default: (buf: Buffer) => Promise<{ text: string }> }).default)(buffer);
      text = data.text || "";
    } else if (fileName.endsWith(".docx")) {
      const mammoth = await import("mammoth");
      const result = await mammoth.extractRawText({ buffer });
      text = result.value || "";
    } else {
      return NextResponse.json(
        { error: "仅支持 PDF 或 DOCX 格式" },
        { status: 400 }
      );
    }

    // Clean up the extracted text
    const cleaned = text
      .replace(/\r\n/g, "\n")
      .replace(/\n{4,}/g, "\n\n")
      .replace(/\s+/g, " ")
      .replace(/[ \t]+/g, " ")
      .trim();

    if (!cleaned) {
      return NextResponse.json(
        { error: "未能从文件中提取到文本内容" },
        { status: 400 }
      );
    }

    // Analyze resume quality using AI
    const resumeQuality = await analyzeResumeQuality(cleaned);

    return NextResponse.json({
      text: cleaned,
      chars: cleaned.length,
      fileName: file.name,
      fileType: fileName.endsWith(".pdf") ? "PDF" : "DOCX",
      resumeQuality,
    });
  } catch (error) {
    console.error("[ParseResume] Error:", error);
    return NextResponse.json(
      { error: "简历解析失败，请确保文件内容可读" },
      { status: 500 }
    );
  }
}


async function analyzeResumeQuality(
  resumeText: string
): Promise<{ score: number; deductions: string[]; comment: string }> {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    return { score: 50, deductions: ["简历质量分析服务暂不可用"], comment: "无法分析" };
  }

  try {
    const response = await fetch("https://api.deepseek.com/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "deepseek-chat",
        messages: [
          {
            role: "system",
            content: `你是一位极其严格的民航企业招聘面试官。请用最犀利、不留情面的态度评估以下简历。

评估准则（极其严格，满分100分，60分为及格线）：
- 有大厂/知名企业实习经历：不扣分（但也不加分，这是基本要求）
- 有民航相关实习/实训/项目经历：少量加分（+5~10）
- 985/211或民航专业院校：不扣分
- 普通院校：轻微扣分（-5）
- 简历中有具体项目、数据、成果说明：不扣分
- 简历空洞、只有课程名称、无具体成果展示：大幅度扣分（-10~20）
- 无实习经历：扣分（-15）
- 无项目/竞赛/实训经历：扣分（-10）
- 简历过短、信息量极少：扣分（-10）
- 使用空洞自我评价（吃苦耐劳、善于沟通等）：扣分（-5）

请输出严格按以下JSON格式（不要多余文字）：
{"score": 分数, "deductions": ["扣分项1", "扣分项2", ...], "comment": "一句话毒舌但客观的整体评价"}`,
          },
          { role: "user", content: resumeText.slice(0, 3000) },
        ],
        temperature: 0.3,
        max_tokens: 500,
      }),
    });

    const data = await response.json();
    const content = data?.choices?.[0]?.message?.content || "";

    try {
      const parsed = JSON.parse(content);
      return {
        score: Math.max(0, Math.min(100, parsed.score || 50)),
        deductions: Array.isArray(parsed.deductions) ? parsed.deductions : [],
        comment: parsed.comment || "简历评估完成",
      };
    } catch {
      return { score: 50, deductions: ["简历评估解析异常"], comment: "系统评估异常，请人工复核" };
    }
  } catch {
    return { score: 50, deductions: ["简历质量分析服务异常"], comment: "分析服务异常" };
  }
}

