export const volcengineConfig = {
  apiKey: process.env.VOLCENGINE_API_KEY || "",
  appId: process.env.VOLCENGINE_APP_ID || "",
  accessToken: process.env.VOLCENGINE_ACCESS_TOKEN || "",
  secretKey: process.env.VOLCENGINE_SECRET_KEY || "",
  voiceId: process.env.VOLCENGINE_VOICE_ID || "zh_female_vv_uranus_bigtts",
};

let hasLoggedMissingApiKey = false;
let hasLoggedMissingTtsConfig = false;

export function ensureVolcengineConfig() {
  if (!volcengineConfig.apiKey && !hasLoggedMissingApiKey) {
    hasLoggedMissingApiKey = true;
    console.warn("[VolcEngine] API Key not configured");
  }

  if (
    (!volcengineConfig.appId || !volcengineConfig.accessToken) &&
    !hasLoggedMissingTtsConfig
  ) {
    hasLoggedMissingTtsConfig = true;
    console.warn("[VolcEngine] TTS credentials not fully configured");
  }

  return volcengineConfig;
}
