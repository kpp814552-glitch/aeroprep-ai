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
  private preloadedBlob: Blob | null = null;
  private preloadedText = "";
  private preloadPromise: Promise<Blob> | null = null;

  constructor(options: TtsPlayerOptions = {}) {
    this.endpoint = options.endpoint || "/api/tts";
    this.voiceId = options.voiceId;
    this.retries = options.retries ?? 1;
  }

  stop() {
    this.activePlayId += 1;
    this.preloadedBlob = null;
    this.preloadedText = "";
    this.preloadPromise = null;

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

  /**
   * Pre-fetches TTS audio and caches it as a Blob.
   * The cached audio is consumed by the next `play()` call for the same text.
   */
  async preload(text: string, options: TtsPlayerOptions = {}): Promise<void> {
    if (!text) return;

    this.preloadedText = text;
    const fetchPromise = this._fetchAudioBlob(text, options);
    this.preloadPromise = fetchPromise;

    try {
      await fetchPromise;
    } catch {
      this.preloadedBlob = null;
    }
  }

  private async _fetchAudioBlob(text: string, options: TtsPlayerOptions = {}): Promise<Blob> {
    const payload: TtsPayload = {
      text,
      voiceId: options.voiceId || this.voiceId,
    };

    const response = await fetch(options.endpoint || this.endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) throw new Error(await response.text());

    const contentType = response.headers.get("content-type") || "";
    if (!contentType.toLowerCase().includes("audio/mpeg")) {
      throw new Error(`Unexpected TTS content type: ${contentType}`);
    }

    const blob = await response.blob();
    this.preloadedBlob = blob;
    return blob;
  }

  async play(text: string, options: TtsPlayerOptions = {}) {
    const playId = this.activePlayId + 1;
    this.activePlayId = playId;
    options.onDebug?.(`[TTS] play requested (playId=${playId})`);

    // If there is an in-flight preload for this exact text, wait for it first.
    if (this.preloadedText === text && this.preloadPromise) {
      try {
        await this.preloadPromise;
      } catch {
        this.preloadedBlob = null;
      }
      this.preloadPromise = null;
    }

    // If we have a preloaded blob for this text, play it immediately.
    if (this.preloadedBlob && this.preloadedText === text) {
      const cachedBlob = this.preloadedBlob;
      const cachedText = this.preloadedText;
      this.preloadedBlob = null;
      this.preloadedText = "";

      options.onDebug?.(`[TTS] using preloaded audio for text="${cachedText}" (playId=${playId})`);

      this.stop();
      this.activePlayId = playId;

      this.objectUrl = URL.createObjectURL(cachedBlob);
      this.audio = new Audio(this.objectUrl);
      this.audio.preload = "auto";

      await this._playElement(playId, options);
      return;
    }

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

        await this._playElement(playId, options);

        return;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error("Unknown TTS error.");
        options.onDebug?.(`[TTS] attempt ${attempt + 1} failed: ${lastError.message}`);
      }
    }

    throw lastError || new Error("TTS play failed.");
  }

  private async _playElement(playId: number, options: TtsPlayerOptions = {}): Promise<void> {
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
  }
}
