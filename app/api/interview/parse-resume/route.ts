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

    return NextResponse.json({
      text: cleaned,
      chars: cleaned.length,
      fileName: file.name,
      fileType: fileName.endsWith(".pdf") ? "PDF" : "DOCX",
    });
  } catch (error) {
    console.error("[ParseResume] Error:", error);
    return NextResponse.json(
      { error: "简历解析失败，请确保文件内容可读" },
      { status: 500 }
    );
  }
}
