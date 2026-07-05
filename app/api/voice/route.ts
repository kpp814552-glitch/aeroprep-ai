// ⚠️ 已废弃：Kokoro TTS 本地合成。依赖本地 .venv-kokoro311，生产环境不可用。
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { NextResponse } from "next/server";

const execFileAsync = promisify(execFile);

type VoiceRequestBody = {
  text?: string;
};

export async function POST(request: Request) {
  let body: VoiceRequestBody;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  if (!body?.text || typeof body.text !== "string" || !body.text.trim()) {
    return NextResponse.json({ error: "Text is required." }, { status: 400 });
  }

  const outputPath = path.join(os.tmpdir(), `kokoro-${Date.now()}.wav`);
  const pythonPath = path.join(process.cwd(), ".venv-kokoro311", "bin", "python");
  const scriptPath = path.join(process.cwd(), "scripts", "kokoro_tts.py");

  try {
    await execFileAsync(pythonPath, [
      scriptPath,
      "--text",
      body.text.trim(),
      "--output",
      outputPath,
      "--voice",
      "zf_xiaoyi",
    ]);

    const audioBuffer = await fs.readFile(outputPath);
    await fs.unlink(outputPath).catch(() => undefined);

    return new Response(audioBuffer, {
      status: 200,
      headers: {
        "Content-Type": "audio/wav",
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    await fs.unlink(outputPath).catch(() => undefined);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? `Kokoro synthesis failed: ${error.message}`
            : "Kokoro synthesis failed.",
      },
      { status: 502 }
    );
  }
}
