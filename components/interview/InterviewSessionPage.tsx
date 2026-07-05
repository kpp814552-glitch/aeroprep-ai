"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  getAnswerSecondsForStage,
  interviewStageLabels,
  PREP_COUNTDOWN_SECONDS,
  TOTAL_INTERVIEW_ROUNDS,
} from "@/lib/interview/config";
import { buildSessionRecord } from "@/lib/interview/report";
import { saveInterviewSession } from "@/lib/interview/session-storage";
import {
  saveGrowthEvent,
  saveInterviewCompletionGrowth,
} from "@/lib/profile/growth-storage";
import type {
  InterviewReport,
  InterviewRole,
  InterviewSessionRecord,
  InterviewStage,
  InterviewTurn,
} from "@/lib/interview/types";
import {
  createInterviewVoiceSession,
  type InterviewVoiceSession,
  type VoiceProviderName,
} from "@/lib/interview/voice";
import { TtsAutoplayBlockedError } from "@/lib/audio/tts-player";

const prepSequence = ["3", "2", "1", "开始面试"] as const;

type SpeechRecognitionConstructor = new () => SpeechRecognition;

type SpeechRecognitionResultItem = {
  transcript: string;
};

type SpeechRecognitionResult = {
  isFinal: boolean;
  length: number;
  item(index: number): SpeechRecognitionResultItem;
  [index: number]: SpeechRecognitionResultItem;
};

type SpeechRecognitionResultList = {
  length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
};

type SpeechRecognitionEvent = Event & {
  resultIndex: number;
  results: SpeechRecognitionResultList;
};

type SpeechRecognition = EventTarget & {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event?: Event) => void) | null;
  onend: (() => void) | null;
};

type InterviewApiQuestion = {
  question?: string;
  stage?: InterviewStage;
  interviewer?: string;
  roleLabel?: string;
};

type InterviewApiReport = {
  report?: InterviewReport;
};

type PendingQuestionState = {
  payload: InterviewApiQuestion;
  waitingForGesture: boolean;
};

type RunQuestionRoundOptions = {
  forcePlay?: boolean;
};

type VoiceActivityState =
  | "Listening"
  | "Silent"
  | "Processing"
  | "tts_generating"
  | "tts_playing"
  | "waiting_answer";

const voiceStateMeta: Record<
  VoiceActivityState,
  { label: string; subtitle: string; accent: string; dotClassName: string }
> = {
  Listening: {
    label: "LISTENING",
    subtitle: "正在聆听...",
    accent: "text-emerald-300",
    dotClassName: "bg-emerald-400 shadow-[0_0_16px_rgba(52,211,153,0.65)]",
  },
  Silent: {
    label: "SILENT",
    subtitle: "当前静音",
    accent: "text-white/88",
    dotClassName: "bg-white/55 shadow-[0_0_12px_rgba(255,255,255,0.22)]",
  },
  Processing: {
    label: "PROCESSING",
    subtitle: "AI 思考中...",
    accent: "text-amber-200",
    dotClassName: "bg-amber-300 shadow-[0_0_14px_rgba(252,211,77,0.4)]",
  },
  tts_generating: {
    label: "TTS GENERATING",
    subtitle: "正在生成语音...",
    accent: "text-sky-200",
    dotClassName: "bg-sky-300 shadow-[0_0_14px_rgba(125,211,252,0.4)]",
  },
  tts_playing: {
    label: "TTS PLAYING",
    subtitle: "面试官正在提问...",
    accent: "text-cyan-200",
    dotClassName: "bg-cyan-300 shadow-[0_0_14px_rgba(103,232,249,0.4)]",
  },
  waiting_answer: {
    label: "WAITING ANSWER",
    subtitle: "请开始作答",
    accent: "text-white/88",
    dotClassName: "bg-white/55 shadow-[0_0_12px_rgba(255,255,255,0.22)]",
  },
};

function formatDuration(totalSeconds: number) {
  const hours = Math.floor(totalSeconds / 3600)
    .toString()
    .padStart(2, "0");
  const minutes = Math.floor((totalSeconds % 3600) / 60)
    .toString()
    .padStart(2, "0");
  const seconds = Math.floor(totalSeconds % 60)
    .toString()
    .padStart(2, "0");

  return `${hours}:${minutes}:${seconds}`;
}

function formatAnswerCountdown(totalSeconds: number) {
  const safeSeconds = Math.max(0, totalSeconds);
  const minutes = Math.floor(safeSeconds / 60)
    .toString()
    .padStart(2, "0");
  const seconds = Math.floor(safeSeconds % 60)
    .toString()
    .padStart(2, "0");

  return `${minutes}:${seconds}`;
}

function getSpeechRecognitionConstructor() {
  if (typeof window === "undefined") return null;

  const speechWindow = window as Window &
    typeof globalThis & {
      SpeechRecognition?: SpeechRecognitionConstructor;
      webkitSpeechRecognition?: SpeechRecognitionConstructor;
    };

  return speechWindow.SpeechRecognition || speechWindow.webkitSpeechRecognition || null;
}

function createSessionId() {
  return `session-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function normalizeRole(value: string | null): InterviewRole {
  const candidates: InterviewRole[] = [
    "pilot",
    "dispatcher",
    "maintenance",
    "civil-aviation-electronics",
    "cabin-crew",
    "atc",
    "aviation-meteorology",
  ];

  return candidates.includes(value as InterviewRole) ? (value as InterviewRole) : "pilot";
}

async function getMicrophoneStream() {
  return navigator.mediaDevices.getUserMedia({
    audio: {
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true,
    },
  });
}

export default function InterviewSessionPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sessionIdRef = useRef(createSessionId());
  const startAtRef = useRef<number | null>(null);
  const elapsedTimerRef = useRef<number | null>(null);
  const answerTimerRef = useRef<number | null>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const finalTranscriptRef = useRef("");
  const turnStartedAtRef = useRef<number | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const microphoneStreamRef = useRef<MediaStream | null>(null);
  const voiceMonitorFrameRef = useRef<number | null>(null);
  const hasStartedFlowRef = useRef(false);

  const company = searchParams.get("company") ?? "国航";
  const role = normalizeRole(searchParams.get("role"));
  const mode = searchParams.get("mode") ?? "校招";
  const persona = searchParams.get("persona") ?? "专业型HR";

  const playbackSupported =
    typeof window !== "undefined" &&
    (typeof window.Audio !== "undefined" || "speechSynthesis" in window);
  const recognitionSupported =
    typeof window !== "undefined" && Boolean(getSpeechRecognitionConstructor());
  const mediaSupported =
    typeof window !== "undefined" &&
    Boolean(navigator.mediaDevices?.getUserMedia) &&
    typeof window.AudioContext !== "undefined";

  const [prepIndex, setPrepIndex] = useState(0);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [answerCountdown, setAnswerCountdown] = useState(0);
  const [currentQuestion, setCurrentQuestion] = useState("");
  const [currentStage, setCurrentStage] = useState<InterviewStage>("self-intro");
  const [interviewerLabel, setInterviewerLabel] = useState("AI 面试官");
  const [roleLabel, setRoleLabel] = useState("飞行员");
  const [liveTranscript, setLiveTranscript] = useState("");
  const [interimTranscript, setInterimTranscript] = useState("");
  const [voiceProviderName, setVoiceProviderName] =
    useState<VoiceProviderName | null>(null);
  const [voiceActivityState, setVoiceActivityState] =
    useState<VoiceActivityState>("Silent");
  const [statusText, setStatusText] = useState("正在连接面试室");
  const [turns, setTurns] = useState<InterviewTurn[]>([]);
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [isInterviewCompleted, setIsInterviewCompleted] = useState(false);
  const [fatalError, setFatalError] = useState("");
  const [isAnswering, setIsAnswering] = useState(false);
  const [pendingQuestionState, setPendingQuestionState] =
    useState<PendingQuestionState | null>(null);

  const transcriptPreview = useMemo(() => {
    const combined = `${liveTranscript}${interimTranscript ? ` ${interimTranscript}` : ""}`.trim();
    return combined || "面试开始后，这里会实时显示你的回答。";
  }, [interimTranscript, liveTranscript]);

  const currentQuestionRef = useRef("");
  const transcriptScrollRef = useRef<HTMLDivElement | null>(null);
  const activeQuestionPlayRef = useRef("");
  const isPlayingVoiceRef = useRef(false);
  const hasInitializedTtsRef = useRef(false);
  const voiceSession = useMemo<InterviewVoiceSession | null>(() => {
    if (typeof window === "undefined") return null;

    return createInterviewVoiceSession({
      endpoint: "/api/tts",
    });
  }, []);

  const clearAnswerTimer = useCallback(() => {
    if (answerTimerRef.current) {
      window.clearInterval(answerTimerRef.current);
      answerTimerRef.current = null;
    }
  }, []);

  const stopVoiceMonitor = useCallback(() => {
    if (voiceMonitorFrameRef.current) {
      window.cancelAnimationFrame(voiceMonitorFrameRef.current);
      voiceMonitorFrameRef.current = null;
    }

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

  const stopRecognition = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.onresult = null;
      recognitionRef.current.onerror = null;
      recognitionRef.current.onend = null;
      recognitionRef.current.abort();
      recognitionRef.current = null;
    }

    stopVoiceMonitor();
  }, [stopVoiceMonitor]);

  const persistAndNavigateToReport = useCallback(
    (record: InterviewSessionRecord) => {
      saveInterviewSession(record);
      router.push(`/interview/report?sessionId=${encodeURIComponent(record.sessionId)}`);
    },
    [router]
  );

  const generateReportAndFinish = useCallback(
    async (finalTurns: InterviewTurn[], totalElapsedSeconds: number) => {
      if (isGeneratingReport || isInterviewCompleted) return;

      setIsGeneratingReport(true);
      setIsAnswering(false);
      clearAnswerTimer();
      setAnswerCountdown(0);
      setVoiceActivityState("Processing");
      setStatusText("正在整理面试记录并生成报告");
      stopRecognition();

      try {
        const response = await fetch("/api/interview", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            action: "report",
            role,
            company,
            mode,
            persona,
            turns: finalTurns,
          }),
        });

        const payload = (await response.json()) as InterviewApiReport;

        if (!response.ok || !payload.report) {
          throw new Error("报告生成失败");
        }

        const record = buildSessionRecord({
          sessionId: sessionIdRef.current,
          company,
          role,
          roleLabel,
          mode,
          persona,
          interviewer: interviewerLabel,
          voiceProviderName,
          elapsedSeconds: totalElapsedSeconds,
          turns: finalTurns,
          createdAt: new Date().toISOString(),
          report: payload.report,
        });

        saveInterviewCompletionGrowth(record);
        setIsInterviewCompleted(true);
        persistAndNavigateToReport(record);
      } catch (error) {
        setFatalError(error instanceof Error ? error.message : "报告生成失败");
        setStatusText("报告生成失败，请稍后重试");
        setIsGeneratingReport(false);
      }
    },
    [
      company,
      interviewerLabel,
      isGeneratingReport,
      isInterviewCompleted,
      mode,
      persona,
      persistAndNavigateToReport,
      role,
      roleLabel,
      stopRecognition,
      voiceProviderName,
      clearAnswerTimer,
    ]
  );

  const startVoiceMonitor = useCallback(async () => {
    if (!mediaSupported) return;

    try {
      const stream = await getMicrophoneStream();
      microphoneStreamRef.current = stream;

      const audioContext = new window.AudioContext();
      audioContextRef.current = audioContext;

      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 512;
      analyser.smoothingTimeConstant = 0.74;
      source.connect(analyser);
      analyserRef.current = analyser;

      const samples = new Uint8Array(analyser.frequencyBinCount);
      let previousState: VoiceActivityState = "Silent";

      const tick = () => {
        if (!analyserRef.current) return;

        analyserRef.current.getByteTimeDomainData(samples);
        let sum = 0;

        for (let index = 0; index < samples.length; index += 1) {
          const normalized = (samples[index] - 128) / 128;
          sum += normalized * normalized;
        }

        const rms = Math.sqrt(sum / samples.length);
        const speaking = rms > 0.05;

        if (speaking) {
          if (previousState !== "Listening") {
            previousState = "Listening";
            setVoiceActivityState("Listening");
          }
        } else if (previousState !== "Processing") {
          previousState = "Silent";
          setVoiceActivityState("Silent");
        }

        voiceMonitorFrameRef.current = window.requestAnimationFrame(tick);
      };

      voiceMonitorFrameRef.current = window.requestAnimationFrame(tick);
    } catch {
      setStatusText("麦克风权限已打开，但声音检测初始化失败");
    }
  }, [mediaSupported]);

  const startRecognition = useCallback(async () => {
    if (!recognitionSupported) {
      setStatusText("当前浏览器不支持实时语音识别");
      return;
    }

    const RecognitionConstructor = getSpeechRecognitionConstructor();
    if (!RecognitionConstructor) {
      setStatusText("当前浏览器不支持实时语音识别");
      return;
    }

    stopRecognition();

    finalTranscriptRef.current = "";
    setLiveTranscript("");
    setInterimTranscript("");
    setVoiceActivityState("Listening");
    setStatusText("请开始回答，系统正在实时识别");
    turnStartedAtRef.current = Date.now();
    setIsAnswering(true);

    await startVoiceMonitor();

    const recognition = new RecognitionConstructor();
    recognition.lang = "zh-CN";
    recognition.interimResults = true;
    recognition.continuous = true;

    recognition.onresult = (event) => {
      let appendedFinal = "";
      let nextInterim = "";

      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        const result = event.results[index];
        const text = result[0]?.transcript ?? "";

        if (result.isFinal) {
          appendedFinal += text;
        } else {
          nextInterim += text;
        }
      }

      if (appendedFinal) {
        setLiveTranscript((currentValue) => {
          const merged = `${currentValue}${currentValue ? " " : ""}${appendedFinal.trim()}`.trim();
          finalTranscriptRef.current = merged;
          return merged;
        });
      }

      setInterimTranscript(nextInterim.trim());
      setVoiceActivityState("Listening");
    };

    recognition.onerror = () => {
      setVoiceActivityState("Processing");
      setStatusText("语音识别出现波动，系统会继续尝试");
    };

    recognition.onend = () => {
      if (!isGeneratingReport && !isInterviewCompleted) {
        setVoiceActivityState("Silent");
      }
    };

    recognitionRef.current = recognition;
    recognition.start();
  }, [
    isGeneratingReport,
    isInterviewCompleted,
    recognitionSupported,
    startVoiceMonitor,
    stopRecognition,
  ]);

  const fetchOpeningQuestion = useCallback(async () => {
    console.log("[InterviewSession] fetching opening question");
    const response = await fetch("/api/interview", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        action: "start",
        role,
        company,
        mode,
        persona,
      }),
    });

    const payload = (await response.json()) as InterviewApiQuestion;
    if (!response.ok || !payload.question) {
      throw new Error("首轮问题获取失败");
    }

    console.log("[InterviewSession] opening question received", payload.question);
    return payload;
  }, [company, mode, persona, role]);

  const fetchNextQuestion = useCallback(
    async (nextTurns: InterviewTurn[]) => {
      const response = await fetch("/api/interview", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "next",
          role,
          company,
          mode,
          persona,
          turns: nextTurns,
        }),
      });

      const payload = (await response.json()) as InterviewApiQuestion;
      if (!response.ok || !payload.question) {
        throw new Error("追问生成失败");
      }

      return payload;
    },
    [company, mode, persona, role]
  );

  const startAnswerCountdown = useCallback((seconds: number) => {
    clearAnswerTimer();
    setAnswerCountdown(seconds);
    let remaining = seconds;
    answerTimerRef.current = window.setInterval(() => {
      remaining -= 1;
      setAnswerCountdown(Math.max(remaining, 0));

      if (remaining <= 0) {
        clearAnswerTimer();
      }
    }, 1000);
  }, [clearAnswerTimer]);

  const runQuestionRound = useCallback(
    async (
      payload: InterviewApiQuestion,
      options: RunQuestionRoundOptions = {}
    ) => {
      const questionText = payload.question?.trim() ?? "";
      if (!questionText) {
        throw new Error("问题内容为空");
      }

      if (!options.forcePlay && activeQuestionPlayRef.current === questionText) {
        console.log("[InterviewSession] skipping duplicate TTS trigger for question", questionText);
        return;
      }

      console.log("[InterviewSession] runQuestionRound called", {
        questionText,
        forcePlay: options.forcePlay ?? false,
      });
      activeQuestionPlayRef.current = questionText;

      const nextStage = payload.stage ?? "self-intro";
      const answerSeconds = getAnswerSecondsForStage(nextStage);

      stopRecognition();
      clearAnswerTimer();
      currentQuestionRef.current = questionText;
      console.log("[InterviewSession] question set", questionText);
      setCurrentStage(nextStage);
      setIsAnswering(false);
      setLiveTranscript("");
      setInterimTranscript("");
      finalTranscriptRef.current = "";

      if (payload.interviewer) {
        setInterviewerLabel(payload.interviewer);
      }

      if (payload.roleLabel) {
        setRoleLabel(payload.roleLabel);
      }

      if (!voiceSession) {
        throw new Error("语音会话初始化失败");
      }

      if (options.forcePlay) {
        // Questions 2+: continueInterview did the preload — show text and play immediately
        setCurrentQuestion(questionText);
        setStatusText("面试官正在提问...");
        setVoiceActivityState("tts_playing");
        let voiceResult: Awaited<ReturnType<InterviewVoiceSession["speakQuestion"]>>;

        try {
          console.log("[InterviewSession] playing TTS for question", questionText);
          voiceResult = await voiceSession.speakQuestion(questionText);
          saveGrowthEvent({
            type: "tts_played",
            sessionId: sessionIdRef.current,
            company,
            roleLabel: payload.roleLabel || roleLabel,
            mode,
            question: questionText,
          });
        } catch (error) {
          if (error instanceof TtsAutoplayBlockedError) {
            setPendingQuestionState({
              payload,
              waitingForGesture: true,
            });
            setVoiceActivityState("tts_playing");
            setStatusText("请点击下方按钮，允许播放面试官语音");
            return;
          }

          activeQuestionPlayRef.current = "";
          throw error;
        }

        setVoiceProviderName(voiceResult.providerName);
        setVoiceActivityState("waiting_answer");
        setStatusText("请开始作答");
        setAnswerCountdown(answerSeconds);
        setPendingQuestionState(null);
        await startRecognition();
        startAnswerCountdown(answerSeconds);

      } else {
        // First question: preload TTS first, then show text + button
        setStatusText("正在准备语音...");
        setVoiceActivityState("tts_generating");

        try {
          console.log("[InterviewSession] preloading TTS for first question", questionText);
          await voiceSession.preloadQuestion(questionText);
        } catch (error) {
          console.warn("[InterviewSession] TTS preload failed, will use direct playback", error);
        }

        setCurrentQuestion(questionText);

        // Show play button — user tap required
        setStatusText("点击下方按钮开始播放面试官语音");
        setVoiceActivityState("tts_playing");
        setPendingQuestionState({
          payload,
          waitingForGesture: true,
        });
      }
    },
    [
      clearAnswerTimer,
      company,
      mode,
      roleLabel,
      startAnswerCountdown,
      startRecognition,
      stopRecognition,
      voiceSession,
    ]
  );

  const handleResumeAudioPlayback = useCallback(async () => {
    if (!pendingQuestionState?.waitingForGesture) return;
    if (isPlayingVoiceRef.current) return;
    isPlayingVoiceRef.current = true;

    setFatalError("");
    setStatusText("面试官正在提问...");
    setVoiceActivityState("tts_playing");
    const pendingPayload = pendingQuestionState.payload;
    const pendingQuestionText = pendingPayload.question?.trim() ?? "";
    setPendingQuestionState(null);

    try {
      if (!voiceSession) throw new Error("语音会话初始化失败");

      console.log("[InterviewSession] playing cached TTS for question", pendingQuestionText);
      const voiceResult = await voiceSession.speakQuestion(pendingQuestionText);

      saveGrowthEvent({
        type: "tts_played",
        sessionId: sessionIdRef.current,
        company,
        roleLabel: pendingPayload.roleLabel || roleLabel,
        mode,
        question: pendingQuestionText,
      });

      setVoiceProviderName(voiceResult.providerName);
      setVoiceActivityState("waiting_answer");
      setStatusText("请开始作答");
      const answerSeconds = getAnswerSecondsForStage(pendingPayload.stage ?? "self-intro");
      setAnswerCountdown(answerSeconds);
      await startRecognition();
      startAnswerCountdown(answerSeconds);
    } catch (error) {
      if (error instanceof TtsAutoplayBlockedError) {
        setPendingQuestionState({ payload: pendingPayload, waitingForGesture: true });
        setVoiceActivityState("tts_playing");
        setStatusText("请点击下方按钮，允许播放面试官语音");
        return;
      }
      isPlayingVoiceRef.current = false;
      activeQuestionPlayRef.current = "";
      setFatalError(error instanceof Error ? error.message : "语音播放失败");
      setStatusText("语音播放失败，请稍后刷新重试");
    }
    isPlayingVoiceRef.current = false;
  }, [
    company,
    mode,
    pendingQuestionState,
    roleLabel,
    startAnswerCountdown,
    startRecognition,
    voiceSession,
  ]);

  const continueInterview = useCallback(async () => {
    if (isGeneratingReport || isInterviewCompleted) return;
    if (!currentQuestionRef.current.trim()) return;

    const answerText = `${finalTranscriptRef.current}${interimTranscript ? ` ${interimTranscript}` : ""}`.trim();

    clearAnswerTimer();
    activeQuestionPlayRef.current = "";
    setIsAnswering(false);
    setAnswerCountdown(0);
    setVoiceActivityState("Processing");
    setStatusText("正在分析你的回答，并组织下一轮问题");
    stopRecognition();

    const answerDurationSeconds = turnStartedAtRef.current
      ? Math.max(1, Math.round((Date.now() - turnStartedAtRef.current) / 1000))
      : 0;

    const nextTurn: InterviewTurn = {
      question: currentQuestionRef.current,
      answer: answerText,
      stage: currentStage,
      answerDurationSeconds,
      transcriptChars: answerText.length,
      createdAt: new Date().toISOString(),
    };

    saveGrowthEvent({
      type: "question_answered",
      sessionId: sessionIdRef.current,
      company,
      roleLabel,
      mode,
      question: currentQuestionRef.current,
    });

    const nextTurns = [...turns, nextTurn];
    setTurns(nextTurns);

    const totalElapsedSeconds =
      startAtRef.current === null ? elapsedSeconds : Math.round((Date.now() - startAtRef.current) / 1000);

    if (nextTurns.length >= TOTAL_INTERVIEW_ROUNDS) {
      await generateReportAndFinish(nextTurns, totalElapsedSeconds);
      return;
    }

    try {
      const nextQuestion = await fetchNextQuestion(nextTurns);

      // Fire-and-forget TTS preload so speakQuestion can use cached audio
      if (nextQuestion.question?.trim()) {
        voiceSession?.preloadQuestion(nextQuestion.question.trim()).catch(() => {
          console.log("[InterviewSession] TTS preload failed, will fetch inline");
        });
      }

      await runQuestionRound(nextQuestion, { forcePlay: true });
    } catch (error) {
      setFatalError(error instanceof Error ? error.message : "下一轮问题生成失败");
      setStatusText("下一轮问题生成失败，请稍后刷新重试");
    }
  }, [
    clearAnswerTimer,
    currentStage,
    company,
    elapsedSeconds,
    fetchNextQuestion,
    generateReportAndFinish,
    interimTranscript,
    isGeneratingReport,
    isInterviewCompleted,
    mode,
    pendingQuestionState,
    roleLabel,
    runQuestionRound,
    stopRecognition,
    turns,
  ]);

  const startInterviewFlow = useCallback(async () => {
    if (!playbackSupported) {
      setFatalError("当前浏览器不支持语音播放，请换用 Chrome 或 Edge。");
      setStatusText("浏览器不支持语音播放");
      return;
    }

    try {
      console.log("[InterviewSession] startInterviewFlow begin");
      await voiceSession?.prepare();
      console.log("[InterviewSession] TTS prepared before first question");
      saveGrowthEvent({
        type: "interview_started",
        sessionId: sessionIdRef.current,
        company,
        roleLabel,
        mode,
      });
      const firstQuestion = await fetchOpeningQuestion();
      await runQuestionRound(firstQuestion);
    } catch (error) {
      setFatalError(error instanceof Error ? error.message : "面试启动失败");
      setStatusText("面试启动失败，请刷新后重试");
    }
  }, [company, fetchOpeningQuestion, mode, playbackSupported, roleLabel, runQuestionRound, voiceSession]);

  useEffect(() => {
    if (prepIndex >= prepSequence.length - 1) return;

    const timer = window.setTimeout(() => {
      setPrepIndex((currentValue) => currentValue + 1);
    }, 1000);

    return () => {
      window.clearTimeout(timer);
    };
  }, [prepIndex]);

  useEffect(() => {
    if (prepIndex < PREP_COUNTDOWN_SECONDS) return;

    // Start the timer (Strict Mode double-invocation safe: de-duped via interval check)
    if (elapsedTimerRef.current === null) {
      startAtRef.current = Date.now();
      elapsedTimerRef.current = window.setInterval(() => {
        if (startAtRef.current === null) return;
        setElapsedSeconds(Math.max(0, Math.round((Date.now() - startAtRef.current) / 1000)));
      }, 1000);
    }

    // Start interview flow only once
    if (!hasStartedFlowRef.current) {
      hasStartedFlowRef.current = true;
      void startInterviewFlow();
    }

    return () => {
      if (elapsedTimerRef.current) {
        window.clearInterval(elapsedTimerRef.current);
        elapsedTimerRef.current = null;
      }
    };
  }, [prepIndex, startInterviewFlow]);

  useEffect(() => {
    if (!isAnswering || isGeneratingReport || isInterviewCompleted) return;
    if (answerCountdown > 0) return;

    const timer = window.setTimeout(() => {
      void continueInterview();
    }, 300);

    return () => window.clearTimeout(timer);
  }, [
    answerCountdown,
    continueInterview,
    isAnswering,
    isGeneratingReport,
    isInterviewCompleted,
  ]);

  useEffect(() => {
    if (!transcriptScrollRef.current) return;

    transcriptScrollRef.current.scrollTop = transcriptScrollRef.current.scrollHeight;
  }, [transcriptPreview, statusText, voiceActivityState]);

  useEffect(() => {
    if (!voiceSession || hasInitializedTtsRef.current) return;

    hasInitializedTtsRef.current = true;
    console.log("[InterviewSession] initializing TTS engine on page load");
    void voiceSession.prepare();
  }, [voiceSession]);

  useEffect(() => {
    return () => {
      if (elapsedTimerRef.current) {
        window.clearInterval(elapsedTimerRef.current);
      }

      clearAnswerTimer();
      stopRecognition();
      voiceSession?.stop();

      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, [clearAnswerTimer, stopRecognition, voiceSession]);

  const handleEndAnswer = useCallback(() => {
    if (!isAnswering || isGeneratingReport || isInterviewCompleted) return;
    void continueInterview();
  }, [continueInterview, isAnswering, isGeneratingReport, isInterviewCompleted]);

  const showCountdown = prepIndex < prepSequence.length - 1;
  const activeVoiceState = voiceStateMeta[voiceActivityState];
  const answerCountdownLabel = formatAnswerCountdown(answerCountdown);

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#1f140f] text-white">
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: 'url("/session-background.png")' }}
      />
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(17,10,7,0.08),rgba(24,13,10,0.18)_34%,rgba(14,8,6,0.42)_100%)]" />
      <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(32,17,11,0.18),rgba(32,17,11,0.04)_18%,rgba(32,17,11,0.02)_82%,rgba(32,17,11,0.14))]" />
      <div className="absolute inset-x-0 bottom-0 h-[24%] bg-[linear-gradient(180deg,rgba(18,10,7,0),rgba(18,10,7,0.08)_34%,rgba(10,6,5,0.42)_100%)]" />
      <div className="absolute inset-x-0 bottom-[13%] h-[24%] bg-[radial-gradient(circle_at_center,rgba(16,9,7,0.22),rgba(16,9,7,0)_72%)]" />

      <div className="relative z-10 min-h-screen px-4 py-4 md:px-5 md:py-5">
        <div className="mx-auto flex min-h-screen max-w-[1536px] flex-col">
          <div className="flex items-start justify-between gap-4">
            <div className="w-full max-w-[13.2rem] rounded-[16px] border border-white/6 bg-[linear-gradient(180deg,rgba(26,15,10,0.42),rgba(8,6,6,0.3))] px-2.5 py-2 shadow-[0_10px_24px_rgba(0,0,0,0.12)] backdrop-blur-md">
              <div className="flex items-center gap-2.5">
                <div className="flex h-4 items-end gap-1 text-[#ffd9ae]/80">
                  <span className="h-2 w-[2px] rounded-full bg-current/55" />
                  <span className="h-3.5 w-[2px] rounded-full bg-current" />
                  <span className="h-3 w-[2px] rounded-full bg-current/75" />
                  <span className="h-4 w-[2px] rounded-full bg-current/80" />
                  <span className="h-1.5 w-[2px] rounded-full bg-current/45" />
                </div>
                <p className="text-[7px] uppercase tracking-[0.2em] text-white/56">
                  实时识别 / Live Transcript
                </p>
              </div>

              <div
                ref={transcriptScrollRef}
                className="mt-2.5 h-[12.4rem] space-y-2 overflow-y-auto pr-1 text-[0.7rem] leading-6 text-white/74 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-white/12"
              >
                <p>
                  <span className="text-white/56">{interviewerLabel}：</span>
                  {currentQuestion || "请稍等，面试官正在进入面试室。"}
                </p>
                <p className="break-words">
                  <span className="text-white/56">考生：</span>
                  {transcriptPreview}
                </p>
                <p className="text-[0.66rem] leading-5 text-white/60">
                  <span className="text-white/52">状态：</span>
                  <span className={activeVoiceState.accent}>{voiceActivityState}</span>
                  <span className="text-white/42"> / {statusText}</span>
                </p>
                {fatalError ? (
                  <p className="text-[0.66rem] leading-5 text-[#ffd1c6]/84">{fatalError}</p>
                ) : null}
              </div>
            </div>

            <div className="rounded-[20px] border border-white/7 bg-[linear-gradient(180deg,rgba(52,45,40,0.34),rgba(23,19,18,0.34))] px-4 py-2.5 text-right shadow-[0_10px_28px_rgba(0,0,0,0.16)] backdrop-blur-md">
              <p className="text-[10px] uppercase tracking-[0.26em] text-white/56">
                面试时长 / Duration
              </p>
              <p className="mt-2 text-[2.15rem] font-light tracking-[0.12em] text-white/92 md:text-[2.85rem]">
                {formatDuration(elapsedSeconds)}
              </p>
            </div>
          </div>

          <section className="relative flex flex-1 items-end justify-center pb-[6.5rem] pt-6 md:pb-[7.1rem]">
            <div className="relative w-full max-w-[1120px]">
              <div className="pointer-events-none absolute inset-x-0 bottom-[-1.1rem] flex justify-center px-5 md:px-8">
                <div className="w-full max-w-[760px] rounded-[18px] border border-white/5 bg-[linear-gradient(180deg,rgba(18,11,9,0.3),rgba(8,7,7,0.18))] px-4 py-2 shadow-[0_10px_22px_rgba(0,0,0,0.16)] backdrop-blur-sm md:px-5 md:py-2.5">
                  {showCountdown ? (
                    <div className="text-center">
                      <p className="text-[0.68rem] uppercase tracking-[0.38em] text-white/46">
                        Interview Begins
                      </p>
                      <p className="mt-3 text-5xl font-light tracking-[-0.08em] text-white/96 md:text-7xl">
                        {prepSequence[prepIndex]}
                      </p>
                    </div>
                  ) : (
                    <>
                      <p className="flex items-center gap-2 text-[10px] uppercase tracking-[0.3em] text-[#f5c689]/72">
                        <span className="inline-flex h-3.5 w-3.5 items-center justify-center rounded-full border border-[#f5c689]/28">
                          <span className="h-1.5 w-1.5 rounded-full bg-[#f5c689]/90" />
                        </span>
                        面试官正在提问 / AI Interviewer
                      </p>
                      <p className="mt-2 text-pretty text-[1rem] leading-[1.42] tracking-[-0.01em] text-white/92 drop-shadow-[0_2px_8px_rgba(0,0,0,0.2)] md:text-[1.28rem]">
                        {currentQuestion}
                      </p>
                      <div className="mt-2 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div>
                            <p className="text-[0.64rem] uppercase tracking-[0.26em] text-white/42">
                              {interviewStageLabels[currentStage] || "答题"}
                            </p>
                            <p className="mt-1 font-light tabular-nums text-[1.18rem] tracking-[0.12em] text-white/84 md:text-[1.32rem]">
                              {answerCountdownLabel}
                            </p>
                          </div>
                          <p className="text-[0.72rem] text-white/48 md:text-[0.8rem]">
                            {voiceActivityState === "Processing"
                              ? "系统正在分析本轮回答"
                              : isAnswering
                                ? "你可以继续作答，或主动结束当前回答"
                                : pendingQuestionState?.waitingForGesture
                                  ? "音频已就绪，点击开始面试"
                                  : "AI 提问结束后将进入答题阶段"}
                          </p>
                        </div>
                        {pendingQuestionState?.waitingForGesture ? (
                          <button
                            type="button"
                            onClick={handleResumeAudioPlayback}
                            aria-label="播放面试官语音"
                            title="音频已就绪，点击后文字和语音同时出现"
                            className="pointer-events-auto inline-flex items-center rounded-full border border-[#f5c689]/24 bg-[#f5c689]/10 px-4 py-2 text-[0.72rem] uppercase tracking-[0.22em] text-[#ffe2bf] transition hover:border-[#f5c689]/34 hover:bg-[#f5c689]/16 hover:text-white"
                          >
                            开始面试
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={handleEndAnswer}
                            aria-label="结束回答"
                            title="结束当前回答，进入下一轮"
                            disabled={!isAnswering || isGeneratingReport || isInterviewCompleted}
                            className="pointer-events-auto inline-flex items-center rounded-full border border-white/20 bg-white/14 px-4 py-2 text-[0.72rem] uppercase tracking-[0.22em] text-white/88 transition hover:border-white/30 hover:bg-white/22 hover:text-white disabled:cursor-not-allowed disabled:border-white/8 disabled:bg-white/5 disabled:text-white/35"
                          >
                            End Answer
                          </button>
                        )}
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          </section>

        </div>
      </div>
    </main>
  );
}
