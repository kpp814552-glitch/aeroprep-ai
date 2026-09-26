import { TtsAutoplayBlockedError, TtsPlayer } from "@/lib/audio/tts-player";

export type VoiceProviderName = "doubao-tts";

export class DoubaoVoiceUnavailableError extends Error {
  constructor(message = "豆包语音暂时不可用，请检查网络后重试。") {
    super(message);
    this.name = "DoubaoVoiceUnavailableError";
  }
}

export type SpeakQuestionOptions = {
  onPlayStart?: () => void;
  onPlayEnd?: () => void;
};

export type InterviewVoiceSession = {
  getProviderName: () => VoiceProviderName | null;
  getVoiceLabel: () => string | null;
  prepare: () => Promise<void>;
  speakQuestion: (text: string, options?: SpeakQuestionOptions) => Promise<{
    providerName: VoiceProviderName;
    voiceLabel: string | null;
  }>;
  /** Pre-fetches TTS audio for the next question so speakQuestion can play it instantly. */
  preloadQuestion: (text: string) => Promise<void>;
  stop: () => void;
};

type CreateInterviewVoiceSessionOptions = {
  endpoint?: string;
  voiceId?: string;
};

export function humanizeInterviewSpeech(text: string) {
  return text
    .replace(/\r/g, "")
    .replace(/\n{2,}/g, "\n")
    .replace(/([。！？?])\s*/g, "$1\n")
    .replace(/，/g, "，\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function splitSpeechUnits(text: string) {
  return text
    .split(/\n+/)
    .flatMap((line) => line.split(/(?<=[。！？!?])/))
    .map((unit) => unit.trim())
    .filter(Boolean);
}

export function dedupeConsecutiveSpeechUnits(text: string) {
  const units = splitSpeechUnits(text);
  const deduped = units.filter((unit, index) => unit !== units[index - 1]);
  return deduped.join("\n");
}

export function buildInterviewerPrompt(text: string) {
  return dedupeConsecutiveSpeechUnits(humanizeInterviewSpeech(text));
}

export function createInterviewVoiceSession(
  options: CreateInterviewVoiceSessionOptions = {}
): InterviewVoiceSession {
  let providerName: VoiceProviderName | null = null;
  const ttsPlayer = typeof window !== "undefined"
    ? new TtsPlayer({
        endpoint: options.endpoint || "/api/tts",
        voiceId: options.voiceId,
        retries: 3,
        timeoutMs: 25000,
      })
    : null;

  return {
    getProviderName() {
      return providerName;
    },
    getVoiceLabel() {
      if (providerName === "doubao-tts") {
        return options.voiceId || "zh_female_vv_uranus_bigtts";
      }

      return null;
    },
    async prepare() {},
    async preloadQuestion(text: string) {
      const normalizedText = buildInterviewerPrompt(text);
      try {
        await ttsPlayer?.preload(normalizedText);
      } catch {
        console.error("[InterviewVoice] preload failed, speakQuestion will fetch directly.");
      }
    },
    async speakQuestion(text: string, callbacks?: SpeakQuestionOptions) {
      const normalizedText = buildInterviewerPrompt(text);

      try {
        await ttsPlayer?.play(normalizedText, {
          timeoutMs: 25000,
          onPlayStart: callbacks?.onPlayStart,
          onPlayEnd: callbacks?.onPlayEnd,
        });
        providerName = "doubao-tts";
        return { providerName, voiceLabel: options.voiceId || "zh_female_vv_uranus_bigtts" };
      } catch (error) {
        if (error instanceof TtsAutoplayBlockedError) {
          throw error;
        }

        console.error("[TTS] Doubao playback failed after retries.", error);
        throw new DoubaoVoiceUnavailableError();
      }
    },
    stop() {
      ttsPlayer?.stop();
    },
  };
}
