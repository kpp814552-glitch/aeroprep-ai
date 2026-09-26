import { NextResponse } from "next/server";
import { logApiUsage, estimateTTSCost } from "@/lib/admin/usage-logger";
import { ensureVolcengineConfig } from "@/lib/volcengine/config";

type TtsRequestBody = {
  text?: string;
  voiceId?: string;
};

const VOLCENGINE_TTS_URL =
  "https://openspeech.bytedance.com/api/v1/tts";
const VOLCENGINE_TTS_CLUSTER = "volcano_tts";
const TTS_ATTEMPTS = 3;
const TTS_TIMEOUT_MS = 20000;

function splitSpeechUnits(text: string) {
  return text
    .split(/\n+/)
    .flatMap((line) => line.split(/(?<=[。！？!?])/))
    .map((unit) => unit.trim())
    .filter(Boolean);
}

function dedupeConsecutiveSpeechUnits(text: string) {
  const units = splitSpeechUnits(text);
  const deduped = units.filter((unit, index) => unit !== units[index - 1]);
  return deduped.join("\n");
}

function buildInterviewerSpeech(text: string) {
  return dedupeConsecutiveSpeechUnits(
    text
      .replace(/\r/g, "")
      .replace(/\n+/g, "\n")
      .replace(/([。！？])/g, "$1\n")
      .replace(/，/g, "，\n")
      .replace(/\n{3,}/g, "\n\n")
      .trim()
  );
}

export async function POST(request: Request) {
  let body: TtsRequestBody;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  if (!body?.text || typeof body.text !== "string" || !body.text.trim()) {
    return NextResponse.json({ error: "Text is required." }, { status: 400 });
  }

  const config = ensureVolcengineConfig();

  if (!config.appId || !config.accessToken) {
    return NextResponse.json(
      { error: "VolcEngine TTS credentials are not configured." },
      { status: 503 }
    );
  }

  const headers = {
    "Content-Type": "application/json",
    Authorization: `Bearer;${config.accessToken}`,
  };

  const requestBody = {
    app: {
      appid: config.appId,
      token: config.accessToken,
      cluster: VOLCENGINE_TTS_CLUSTER,
    },
    user: {
      uid: "aeroprep-interview",
    },
    audio: {
      voice_type: body.voiceId || config.voiceId,
      encoding: "mp3",
      speed_ratio: 0.9,
      volume_ratio: 1.0,
    },
    request: {
      reqid: crypto.randomUUID(),
      text: buildInterviewerSpeech(body.text.trim()),
      text_type: "plain",
      operation: "query",
      with_frontend: 1,
      frontend_type: "unitTson",
    },
  };


  let responseText = "";
  let lastError = "";

  for (let attempt = 0; attempt < TTS_ATTEMPTS; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), TTS_TIMEOUT_MS);

    try {
      const response = await fetch(VOLCENGINE_TTS_URL, {
        method: "POST",
        headers,
        body: JSON.stringify({
          ...requestBody,
          request: {
            ...requestBody.request,
            reqid: crypto.randomUUID(),
          },
        }),
        signal: controller.signal,
      });
      responseText = await response.text();
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${responseText.slice(0, 300)}`);
      }
      lastError = "";
      break;
    } catch (error) {
      lastError =
        error instanceof Error && error.name === "AbortError"
          ? `请求超时（${TTS_TIMEOUT_MS}ms）`
          : error instanceof Error
            ? error.message
            : "未知网络错误";
      if (attempt < TTS_ATTEMPTS - 1) {
        await new Promise((resolve) => setTimeout(resolve, 500 * 2 ** attempt));
      }
    } finally {
      clearTimeout(timeout);
    }
  }

  if (lastError) {
    return NextResponse.json(
      { error: `VolcEngine TTS failed after ${TTS_ATTEMPTS} attempts: ${lastError}` },
      { status: 502 }
    );
  }

  let payload: {
    code?: number;
    message?: string;
    data?: string;
    audio?: string;
  } = {};

  try {
    payload = JSON.parse(responseText) as typeof payload;
  } catch {
    return NextResponse.json(
      { error: `VolcEngine TTS returned non-JSON payload: ${responseText}` },
      { status: 502 }
    );
  }

  if (payload.code !== 3000) {
    return NextResponse.json(
      { error: `VolcEngine TTS returned error payload: ${responseText}` },
      { status: 502 }
    );
  }

  const base64Audio = payload.data || payload.audio;

  if (!base64Audio) {
    return NextResponse.json(
      { error: `VolcEngine TTS returned no audio payload: ${responseText}` },
      { status: 502 }
    );
  }

  const audioBuffer = Buffer.from(base64Audio, "base64");

  // Log character usage
  const ttsText = body.text.trim();
  const charCount = ttsText.length;
  logApiUsage({
    model: 'volcengine-tts',
    inputTokens: 0,
    outputTokens: 0,
    totalTokens: 0,
    characters: charCount,
    cost: estimateTTSCost(charCount),
    endpoint: 'tts',
  }).catch(() => {});

  return new Response(audioBuffer, {
    status: 200,
    headers: {
      "Content-Type": "audio/mpeg",
      "Cache-Control": "no-store",
    },
  });
}
