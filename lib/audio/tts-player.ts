export type TtsPlayerOptions = {
  endpoint?: string;
  voiceId?: string;
  retries?: number;
  onPlayStart?: () => void;
  onPlayEnd?: () => void;
  onDebug?: (message: string) => void;
};

export class TtsAutoplayBlockedError extends Error {
  constructor(message = "Browser blocked audio autoplay.") {
    super(message);
    this.name = "TtsAutoplayBlockedError";
  }
}

type TtsPayload = {
  text: string;
  voiceId?: string;
};

export class TtsPlayer {
  private audio: HTMLAudioElement | null = null;
  private objectUrl = "";
  private readonly endpoint: string;
  private readonly voiceId?: string;
  private readonly retries: number;
  private activePlayId = 0;

  constructor(options: TtsPlayerOptions = {}) {
    this.endpoint = options.endpoint || "/api/tts";
    this.voiceId = options.voiceId;
    this.retries = options.retries ?? 1;
  }

  stop() {
    this.activePlayId += 1;

    if (this.audio) {
      this.audio.pause();
      this.audio.src = "";
      this.audio = null;
    }

    if (this.objectUrl) {
      URL.revokeObjectURL(this.objectUrl);
      this.objectUrl = "";
    }
  }

  async play(text: string, options: TtsPlayerOptions = {}) {
    const playId = this.activePlayId + 1;
    this.activePlayId = playId;
    options.onDebug?.(`[TTS] play requested (playId=${playId})`);

    const payload: TtsPayload = {
      text,
      voiceId: options.voiceId || this.voiceId,
    };

    let lastError: Error | null = null;
    const retryCount = options.retries ?? this.retries;

    for (let attempt = 0; attempt <= retryCount; attempt += 1) {
      try {
        this.stop();
        this.activePlayId = playId;

        const response = await fetch(options.endpoint || this.endpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          throw new Error(await response.text());
        }

        const contentType = response.headers.get("content-type") || "";
        options.onDebug?.(`[TTS] response content-type: ${contentType}`);

        if (!contentType.toLowerCase().includes("audio/mpeg")) {
          throw new Error(`Unexpected TTS content type: ${contentType}`);
        }

        const audioBlob = await response.blob();
        if (playId !== this.activePlayId) {
          options.onDebug?.(`[TTS] playId=${playId} ignored after response because a newer play is active`);
          return;
        }

        this.objectUrl = URL.createObjectURL(audioBlob);
        this.audio = new Audio(this.objectUrl);
        this.audio.preload = "auto";

        await new Promise<void>((resolve, reject) => {
          if (!this.audio) {
            reject(new Error("TTS audio player init failed."));
            return;
          }

          this.audio.onplay = () => {
            if (playId !== this.activePlayId) {
              this.stop();
              resolve();
              return;
            }
            options.onDebug?.(`[TTS] audio.onplay fired (playId=${playId})`);
            options.onPlayStart?.();
          };

          this.audio.onended = () => {
            if (playId !== this.activePlayId) {
              resolve();
              return;
            }
            options.onDebug?.(`[TTS] audio.onended fired (playId=${playId})`);
            this.stop();
            options.onPlayEnd?.();
            resolve();
          };

          this.audio.onerror = () => {
            if (playId !== this.activePlayId) {
              resolve();
              return;
            }
            options.onDebug?.(`[TTS] audio.onerror fired (playId=${playId})`);
            this.stop();
            reject(new Error("TTS audio playback failed."));
          };

          options.onDebug?.(`[TTS] calling audio.play() (playId=${playId})`);
          void this.audio.play().catch(() => {
            if (playId !== this.activePlayId) {
              resolve();
              return;
            }
            this.stop();
            reject(new TtsAutoplayBlockedError());
          });
        });

        return;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error("Unknown TTS error.");
        options.onDebug?.(`[TTS] attempt ${attempt + 1} failed: ${lastError.message}`);
      }
    }

    throw lastError || new Error("TTS play failed.");
  }
}
