import { NextResponse } from "next/server";
import { ensureVolcengineConfig } from "@/lib/volcengine/config";

export async function GET() {
  const config = ensureVolcengineConfig();

  return NextResponse.json({
    success: true,
    configured: Boolean(config.apiKey),
  });
}
