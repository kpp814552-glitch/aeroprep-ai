import { TtsAutoplayBlockedError, TtsPlayer } from "@/lib/audio/tts-player";

export type VoiceProviderName =
  | "doubao-tts"
  | "native-preview";

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

export async function ensureVoicesReady() {
  const existingVoices = window.speechSynthesis.getVoices();
  if (existingVoices.length > 0) return existingVoices;

  return new Promise<SpeechSynthesisVoice[]>((resolve) => {
    const timeout = window.setTimeout(() => {
      window.speechSynthesis.onvoiceschanged = null;
      resolve(window.speechSynthesis.getVoices());
    }, 900);

    window.speechSynthesis.onvoiceschanged = () => {
      window.clearTimeout(timeout);
      window.speechSynthesis.onvoiceschanged = null;
      resolve(window.speechSynthesis.getVoices());
    };
  });
}

function pickNaturalChineseVoice(voices: SpeechSynthesisVoice[]) {
  const preferredNames = [
    "Xiaoxiao",
    "Yunxi",
    "Meijia",
    "Tingting",
    "Sinji",
    "Xiaochen",
    "Xiaoyi",
  ];

  return (
    voices.find(
      (voice) =>
        voice.lang.toLowerCase().startsWith("zh") &&
        !/yunyang|yunjian|jun|gang|hao/i.test(voice.name) &&
        preferredNames.some((name) => voice.name.includes(name))
    ) ||
    voices.find(
      (voice) =>
        voice.lang.toLowerCase().startsWith("zh") &&
        !voice.default &&
        /xiao|mei|ting|yi|xi|female/i.test(voice.name)
    ) ||
    voices.find((voice) => voice.lang.toLowerCase().startsWith("zh")) ||
    voices.find((voice) => !voice.default) ||
    null
  );
}

export async function resolveInterviewVoice() {
  const voices = await ensureVoicesReady();
  return pickNaturalChineseVoice(voices);
}

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

export async function speakWithNativeChineseVoice(
  text: string,
  fixedVoice: SpeechSynthesisVoice | null,
  callbacks?: SpeakQuestionOptions
) {
  if (!("speechSynthesis" in window)) {
    throw new Error("当前浏览器不支持语音播放。");
  }

  window.speechSynthesis.cancel();

  const utteranceText = humanizeInterviewSpeech(text);

  return new Promise<void>((resolve, reject) => {
    const utterance = new SpeechSynthesisUtterance(utteranceText);
    utterance.lang = "zh-CN";
    utterance.rate = 0.92;
    utterance.pitch = 1.06;
    utterance.volume = 1;
    if (fixedVoice) {
      utterance.voice = fixedVoice;
      utterance.lang = fixedVoice.lang || utterance.lang;
    }
    utterance.onstart = () => callbacks?.onPlayStart?.();
    utterance.onend = () => {
      callbacks?.onPlayEnd?.();
      resolve();
    };
    utterance.onerror = () => reject(new Error("语音播放失败。"));

    window.speechSynthesis.speak(utterance);
  });
}

export function createInterviewVoiceSession(
  options: CreateInterviewVoiceSessionOptions = {}
): InterviewVoiceSession {
  let providerName: VoiceProviderName | null = null;
  let fixedVoice: SpeechSynthesisVoice | null = null;
  const ttsPlayer = typeof window !== "undefined"
    ? new TtsPlayer({
        endpoint: options.endpoint || "/api/tts",
        voiceId: options.voiceId,
        retries: 1,
      })
    : null;

  async function prepare() {
    if (typeof window === "undefined") return;

    if (fixedVoice === null && "speechSynthesis" in window) {
      fixedVoice = await resolveInterviewVoice();
    }
  }

  return {
    getProviderName() {
      return providerName;
    },
    getVoiceLabel() {
      if (providerName === "doubao-tts") {
        return options.voiceId || "zh_female_vv_uranus_bigtts";
      }

      if (providerName === "native-preview") {
        return fixedVoice ? `${fixedVoice.name} (${fixedVoice.lang})` : "native-preview";
      }

      return null;
    },
    async prepare() {

      await prepare();
    },
    async preloadQuestion(text: string) {
      const normalizedText = buildInterviewerPrompt(text);
      await prepare();
      try {
        await ttsPlayer?.preload(normalizedText);
      } catch {
        console.error("[InterviewVoice] preload failed, speakQuestion will fetch directly.");
      }
    },
    async speakQuestion(text: string, callbacks?: SpeakQuestionOptions) {
      const normalizedText = buildInterviewerPrompt(text);

      await prepare();

      try {
        await ttsPlayer?.play(normalizedText, {
          onPlayStart: callbacks?.onPlayStart,
          onPlayEnd: callbacks?.onPlayEnd,
        });
        providerName = "doubao-tts";
        return { providerName, voiceLabel: options.voiceId || "zh_female_vv_uranus_bigtts" };
      } catch (error) {
        if (error instanceof TtsAutoplayBlockedError) {
          throw error;
        }

        console.error("[TTS] Doubao playback failed, falling back to native voice.", error);
        await speakWithNativeChineseVoice(normalizedText, fixedVoice, callbacks);
        providerName = "native-preview";
        return {
          providerName,
          voiceLabel: fixedVoice ? `${fixedVoice.name} (${fixedVoice.lang})` : "native-preview",
        };
      }
    },
    stop() {
      ttsPlayer?.stop();

      if ("speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    },
  };
}
