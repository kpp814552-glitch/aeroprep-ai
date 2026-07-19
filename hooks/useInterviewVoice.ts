import { useCallback, useRef, useState } from "react";
import type { InterviewVoiceSession } from "@/lib/interview/voice";

type VoiceActivityState = "Silent" | "Speaking" | "Processing" | "Listening" | "tts_generating";

// ── SpeechRecognition Type Definitions ──
type SpeechRecognitionConstructor = new () => SpeechRecognition;
type SpeechRecognitionResultItem = { transcript: string };
type SpeechRecognitionResult = { isFinal: boolean; length: number; item(index: number): SpeechRecognitionResultItem; [index: number]: SpeechRecognitionResultItem; };
type SpeechRecognitionResultList = { length: number; item(index: number): SpeechRecognitionResult; [index: number]: SpeechRecognitionResult; };
type SpeechRecognitionEvent = Event & { resultIndex: number; results: SpeechRecognitionResultList };
type SpeechRecognition = EventTarget & {
  lang: string; interimResults: boolean; continuous: boolean;
  start: () => void; stop: () => void; abort: () => void;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event?: Event) => void) | null;
  onend: (() => void) | null;
};

function getSpeechRecognitionConstructor(): SpeechRecognitionConstructor | null {
  const w = typeof window !== "undefined" ? window : null;
  return ((w as any)?.SpeechRecognition || (w as any)?.webkitSpeechRecognition || null) as SpeechRecognitionConstructor | null;
}

export function useInterviewVoice(
  voiceSession: InterviewVoiceSession | null,
  listeningRef: React.MutableRefObject<boolean>,
) {
  // ── Refs ──
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const finalTranscriptRef = useRef("");
  const interimTranscriptRef = useRef("");
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const microphoneStreamRef = useRef<MediaStream | null>(null);
  const voiceMonitorFrameRef = useRef<number | null>(null);
  const waveformCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const recordingTimerRef = useRef<HTMLSpanElement | null>(null);
  const lastSoundTimeRef = useRef<number>(0);
  const silenceWarningRef = useRef<HTMLParagraphElement | null>(null);
  const recognitionResolveRef = useRef<((value: string) => void) | null>(null);

  // ── State ──
  const [liveTranscript, setLiveTranscript] = useState("");
  const [interimTranscript, setInterimTranscript] = useState("");
  const [voiceActivityState, setVoiceActivityState] = useState<VoiceActivityState>("Silent");
  const [isAnswering, setIsAnswering] = useState(false);
  const [autoplayBlocked, setAutoplayBlocked] = useState(false);

  // ── Voice Monitor ──
  const stopVoiceMonitor = useCallback(() => {
    if (voiceMonitorFrameRef.current) {
      window.cancelAnimationFrame(voiceMonitorFrameRef.current);
      voiceMonitorFrameRef.current = null;
    }
    if (waveformCanvasRef.current) {
      const canvas = waveformCanvasRef.current;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.strokeStyle = "rgba(245, 198, 137, 0.2)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, canvas.height / 2);
        ctx.lineTo(canvas.width, canvas.height / 2);
        ctx.stroke();
      }
    }
    recordingTimerRef.current = null;
    lastSoundTimeRef.current = Date.now();
    if (silenceWarningRef.current) silenceWarningRef.current.style.display = "none";
    analyserRef.current = null;
    if (audioContextRef.current) {
      void audioContextRef.current.close().catch(() => undefined);
      audioContextRef.current = null;
    }
    if (microphoneStreamRef.current) {
      microphoneStreamRef.current.getTracks().forEach((track) => track.stop());
      microphoneStreamRef.current = null;
    }
  }, []);

  const startVoiceMonitor = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      microphoneStreamRef.current = stream;
      const audioContext = new AudioContext();
      audioContextRef.current = audioContext;
      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      analyserRef.current = analyser;
      source.connect(analyser);

      const canvas = waveformCanvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      const draw = () => {
        voiceMonitorFrameRef.current = requestAnimationFrame(draw);
        analyser.getByteTimeDomainData(dataArray);
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.lineWidth = 1.5;

        // Check for silence
        let sum = 0;
        for (let i = 0; i < bufferLength; i++) {
          const value = (dataArray[i] - 128) / 128;
          sum += Math.abs(value);
        }
        const avg = sum / bufferLength;
        const speaking = avg > 0.08;
        if (speaking) lastSoundTimeRef.current = Date.now();

        const now = Date.now();
        const silenceDuration = (now - lastSoundTimeRef.current) / 1000;
        if (silenceDuration > 3 && silenceWarningRef.current) {
          silenceWarningRef.current.style.display = "block";
        }

        // Draw waveform
        ctx.strokeStyle = avg > 0.08
          ? "rgba(59, 130, 246, 0.9)"
          : "rgba(148, 163, 184, 0.4)";
        ctx.beginPath();
        const sliceWidth = canvas.width / bufferLength;
        let x = 0;
        for (let i = 0; i < bufferLength; i++) {
          const v = dataArray[i] / 128.0;
          const y = v * (canvas.height / 2);
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
          x += sliceWidth;
        }
        ctx.stroke();
      };
      draw();
    } catch {
      console.warn("[Voice] Microphone access denied");
    }
  }, []);

  // ── Speech Recognition ──
  const stopRecognition = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.onresult = null;
      recognitionRef.current.onerror = null;
      recognitionRef.current.onend = null;
      recognitionRef.current.abort();
      recognitionRef.current = null;
    }
    recognitionResolveRef.current?.("");
    recognitionResolveRef.current = null;
    stopVoiceMonitor();
  }, [stopVoiceMonitor]);

  const startRecognition = useCallback(() => {
    const SpeechRecognition = getSpeechRecognitionConstructor();
    if (!SpeechRecognition) return;
    if (recognitionRef.current) stopRecognition();

    const recognition = new SpeechRecognition();
    recognition.lang = "zh-CN";
    recognition.interimResults = true;
    recognition.continuous = true;

    recognition.onresult = (event) => {
      let final = "";
      let interim = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          final += result[0].transcript;
        } else {
          interim += result[0].transcript;
        }
      }
      if (final) finalTranscriptRef.current += final;
      interimTranscriptRef.current = interim;
      setLiveTranscript(finalTranscriptRef.current);
      setInterimTranscript(interim);
    };

    recognition.onerror = () => { stopRecognition(); };
    recognition.onend = () => {
      if (listeningRef.current) {
        // Still in listening phase — restart
        try { recognition.start(); } catch {}
      }
    };

    recognitionRef.current = recognition;
    recognition.start();
  }, [stopRecognition, listeningRef]);

  const stopRecognitionAsync = useCallback((): Promise<string> => {
    return new Promise((resolve) => {
      if (!recognitionRef.current) {
        stopVoiceMonitor();
        resolve(finalTranscriptRef.current);
        return;
      }
      recognitionRef.current.onerror = null;
      const timeout = window.setTimeout(() => {
        recognitionRef.current = null;
        stopVoiceMonitor();
        resolve(finalTranscriptRef.current);
      }, 3000);
      recognitionRef.current.onend = () => {
        window.clearTimeout(timeout);
        recognitionRef.current = null;
        stopVoiceMonitor();
        resolve(finalTranscriptRef.current);
      };
      recognitionRef.current.stop();
    });
  }, [stopVoiceMonitor]);

  return {
    // State
    liveTranscript, setLiveTranscript,
    interimTranscript, setInterimTranscript,
    voiceActivityState, setVoiceActivityState,
    isAnswering, setIsAnswering,
    autoplayBlocked, setAutoplayBlocked,
    // Refs
    finalTranscriptRef, waveformCanvasRef, recordingTimerRef, silenceWarningRef,
    // Actions
    stopVoiceMonitor, startVoiceMonitor,
    startRecognition, stopRecognition, stopRecognitionAsync,
  };
}
