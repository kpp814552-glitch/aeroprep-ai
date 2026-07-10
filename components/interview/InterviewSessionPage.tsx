"use client";

import {
  useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  useRouter, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import {
  
  getAnswerSecondsForStage,
  interviewStageLabels,
  getTotalRoundsForMode,
} from "@/lib/interview/config";
import {
  buildSessionRecord } from "@/lib/interview/report";
import {
  saveInterviewSession } from "@/lib/interview/session-storage";
import {
  
  saveGrowthEvent,
  saveInterviewCompletionGrowth,
} from "@/lib/profile/growth-storage";
import type {
  InterviewPhase,
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
import {
  TtsAutoplayBlockedError } from "@/lib/audio/tts-player";
import {
  useAuth } from "@/hooks/useAuth";

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

type PendingQuestion = {
  text: string;
  stage: InterviewStage;
  interviewer: string;
  roleLabel: string;
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
  const resumeTextRef = useRef(
    typeof window !== "undefined" ? sessionStorage.getItem("aeroprep_resume_text") || "" : ""
  );
  const startAtRef = useRef<number | null>(null);
  const elapsedTimerRef = useRef<number | null>(null);
  const answerTimerRef = useRef<number | null>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const finalTranscriptRef = useRef("");
  const interimTranscriptRef = useRef("");
  const turnStartedAtRef = useRef<number | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const microphoneStreamRef = useRef<MediaStream | null>(null);
  const voiceMonitorFrameRef = useRef<number | null>(null);
  const waveformCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const recordingTimerRef = useRef<HTMLSpanElement | null>(null);
  const lastSoundTimeRef = useRef<number>(Date.now());
  const silenceWarningRef = useRef<HTMLParagraphElement | null>(null);

  const company = searchParams.get("company") ?? "国航";
  const role = normalizeRole(searchParams.get("role"));
  const mode = searchParams.get("mode") ?? "校招";
  const persona = searchParams.get("persona") ?? "专业型HR";

  const recognitionSupported =
    typeof window !== "undefined" && Boolean(getSpeechRecognitionConstructor());
  const mediaSupported =
    typeof window !== "undefined" &&
    Boolean(navigator.mediaDevices?.getUserMedia) &&
    typeof window.AudioContext !== "undefined";

  // ── State Machine ──
  const [phase, setPhase] = useState<InterviewPhase>('preparing');

  // ── UI State ──
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [answerCountdown, setAnswerCountdown] = useState(0);
  const [currentQuestion, setCurrentQuestion] = useState("");
  const [currentStage, setCurrentStage] = useState<InterviewStage>("self-intro");
  const [interviewerLabel, setInterviewerLabel] = useState("AI 面试官");
  const [roleLabel, setRoleLabel] = useState("飞行员");
  const [liveTranscript, setLiveTranscript] = useState("");
  const [interimTranscript, setInterimTranscript] = useState("");
  const [voiceProviderName] =
    useState<VoiceProviderName | null>(null);
  const [voiceActivityState, setVoiceActivityState] =
    useState<VoiceActivityState>("Silent");
  const [statusText, setStatusText] = useState("正在连接面试室");
  const [turns, setTurns] = useState<InterviewTurn[]>([]);
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [fatalError, setFatalError] = useState("");
  const [isAnswering, setIsAnswering] = useState(false);
  const [autoplayBlocked, setAutoplayBlocked] = useState(false);

  // ── Refs for async-safe data flow ──
  const interviewFinishedRef = useRef(false);
  const pendingQuestionRef = useRef<PendingQuestion | null>(null);
  const activeQuestionRef = useRef("");
  const completedSessionIdRef = useRef<string | null>(null);
  const completedScoreRef = useRef(0);
  const completedTurnsRef = useRef(0);

  const transcriptPreview = useMemo(() => {
    const combined = `${liveTranscript}${interimTranscript ? ` ${interimTranscript}` : ""}`.trim();
    return combined || "面试开始后，这里会实时显示你的回答。";
  }, [interimTranscript, liveTranscript]);

  const transcriptScrollRef = useRef<HTMLDivElement | null>(null);
  const { user } = useAuth();
  const voiceSession = useMemo<InterviewVoiceSession | null>(() => {
    if (typeof window === "undefined") return null;

    return createInterviewVoiceSession({
      endpoint: "/api/tts",
    });
  }, []);

  // ── Timer helpers ──
  const clearAnswerTimer = useCallback(() => {
    if (answerTimerRef.current) {
      window.clearInterval(answerTimerRef.current);
      answerTimerRef.current = null;
    }
  }, []);

  const startElapsedTimer = useCallback(() => {
    if (elapsedTimerRef.current !== null) return;
    startAtRef.current = Date.now();
    elapsedTimerRef.current = window.setInterval(() => {
      if (startAtRef.current === null) return;
      setElapsedSeconds(Math.max(0, Math.round((Date.now() - startAtRef.current) / 1000)));
    }, 1000);
  }, []);

  // ── Voice monitor ──
  const stopVoiceMonitor = useCallback(() => {
    if (voiceMonitorFrameRef.current) {
      window.cancelAnimationFrame(voiceMonitorFrameRef.current);
      voiceMonitorFrameRef.current = null;
    }

    // Clear waveform
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

    // Reset recording timer
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

  const persistAndNavigateToReport = useCallback(
    (record: InterviewSessionRecord) => {
      saveInterviewSession(record);
      router.push(`/interview/report?sessionId=${encodeURIComponent(record.sessionId)}`);
    },
    [router]
  );

  const generateReportAndFinish = useCallback(
    async (finalTurns: InterviewTurn[], totalElapsedSeconds: number) => {
      if (isGeneratingReport) return;

      setIsGeneratingReport(true);
      setIsAnswering(false);
      clearAnswerTimer();
      setAnswerCountdown(0);
      setVoiceActivityState("Processing");
      setStatusText("正在整理面试记录并生成报告...（1/2 准备报告数据）");
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
            resumeText: resumeTextRef.current,
            turns: finalTurns,
          }),
        });

        const payload = (await response.json()) as InterviewApiReport;

        if (!response.ok || !payload.report) {
          throw new Error("报告生成失败");
        }

        setStatusText("正在生成面试报告...（2/2 生成完成）");

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

        console.log('[Report Save] sessionId=' + record.sessionId + ' score=' + payload.report?.totalScore);
        saveInterviewSession(record);
        saveInterviewCompletionGrowth(record);
        console.log('[Interview Finish] turns=' + finalTurns.length + ' elapsed=' + totalElapsedSeconds + 's score=' + payload.report?.totalScore);
        completedSessionIdRef.current = record.sessionId;
        completedScoreRef.current = payload.report?.totalScore ?? 0;
        completedTurnsRef.current = finalTurns.length;
        interviewFinishedRef.current = true;
        setIsGeneratingReport(false);
        setPhase('completed');

        // Save to Supabase if logged in
        if (user) {
          fetch("/api/interview/save", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              role,
              role_label: roleLabel,
              company,
              mode,
              persona,
              score: payload.report?.totalScore || 0,
              evaluation: payload.report?.overallEvaluation || "",
              strengths: payload.report?.strengths || [],
              weaknesses: payload.report?.weaknesses || [],
              started_at: new Date(sessionIdRef.current.split("-")[1] || Date.now()).toISOString(),
              ended_at: new Date().toISOString(),
              duration_seconds: totalElapsedSeconds,
              total_turns: finalTurns.length,
            }),
          }).catch(() => {
            console.warn("[Interview] Failed to save to DB");
          });
        }

        // User clicks "查看面试报告" to navigate
      } catch (error) {
        console.error('[Report] generateReportAndFinish failed, creating local fallback with basic report:', error);
        // Create basic report from available turn data so user can still see results
        const avgAnswerLen = finalTurns.reduce((s,t) => s + t.answer.trim().length, 0) / Math.max(1, finalTurns.length);
        const basicScore = Math.min(95, Math.max(40, Math.round(avgAnswerLen * 0.5 + 50)));
        const fallbackReport = {
          scores: {
            expressionAbility: Math.min(90, Math.max(40, basicScore - Math.round(Math.random() * 10))),
            logicalThinking: Math.min(90, Math.max(40, basicScore - Math.round(Math.random() * 15))),
            professionalKnowledge: Math.min(90, Math.max(40, basicScore - Math.round(Math.random() * 20))),
            roleFit: Math.min(90, Math.max(40, basicScore - Math.round(Math.random() * 10))),
            articulation: Math.min(90, Math.max(40, basicScore)),
            adaptability: Math.min(90, Math.max(40, basicScore - Math.round(Math.random() * 10))),
            serviceAwareness: Math.min(90, Math.max(40, basicScore - Math.round(Math.random() * 10))),
          },
          totalScore: basicScore,
          overallEvaluation: "报告后端生成遇到临时问题，当前评分基于回答长度和完整性初步估算。建议重新测试获取更精准的分析结果。请参考报告中的改进建议进行针对性训练。",
          strengths: ["具有一定的表达基础", "完成了面试流程"],
          weaknesses: ["报告详细分析暂时不可用", "建议重新测试获取完整评估"],
          improvementSuggestions: ["重复答题可提高报告精准度", "建议在不同模式下尝试面试"],
          recommendedTraining: ["模拟面试反复训练"],
          hiringProbability: Math.min(90, Math.max(30, basicScore - 10)),
          narrativeSummary: "基于模拟面试表现的初步评估。",
          highlights: [],
          comprehensiveEvaluation: "报告后端处理遇到临时问题，以下分析为基于回答数据的初步估算。" + (finalTurns.length > 0 ? "本次共完成" + finalTurns.length + "轮问答。" : ""),
          perQuestionAnalysis: finalTurns.map((t, i) => "第" + (i+1) + "题回答长度" + t.answer.trim().length + "字。" + (t.answer.trim().length > 30 ? "回答较为完整。" : "回答偏简短。")),
          personalProfile: "报告详细分析暂不可用。",
          careerMatch: roleLabel + "岗位方向适合继续探索。",
          improvementPlan: "建议重新进行一次完整面试以获取精准提升方案。",
          nextPrediction: "当前估算竞争力约" + basicScore + "分。完成训练后预计可提升。",
          growthMessage: "每一次面试都是进步的机会。建议检查网络环境和麦克风设置后重新测试。",
          competitiveLevel: basicScore >= 80 ? 'A' : basicScore >= 60 ? 'B' : basicScore >= 40 ? 'C' : 'D',
          competitiveScore: basicScore,
          competitiveRange: basicScore >= 80 ? '80%-90%' : basicScore >= 60 ? '60%-80%' : basicScore >= 40 ? '40%-60%' : '40%以下',
          competitiveStrengths: ['完成了全部面试流程'],
          competitiveWeaknesses: ['报告详细分析暂不可用'],
          interviewerPerspective: '从面试官视角看，完成面试流程是积极的一步，但详细评估需要完整的报告分析。',
          externalFactors: '真实录取还受到多种因素影响。本评估仅基于本次模拟面试表现生成。',
          trainingProjection: '完成系统训练后，评估分数预计可提升10-15分。',
        };
        const fallbackRecord = buildSessionRecord({
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
          report: fallbackReport,
        });
        console.log('[Report Save] Saving fallback record (no report)', fallbackRecord.sessionId);
        saveInterviewSession(fallbackRecord);
        saveInterviewCompletionGrowth(fallbackRecord);
        completedSessionIdRef.current = fallbackRecord.sessionId;
        completedScoreRef.current = 0;
        completedTurnsRef.current = finalTurns.length;
        interviewFinishedRef.current = true;
        setIsGeneratingReport(false);
        setPhase('completed');
        setStatusText('面试已完成，报告生成遇到问题');
      }
    },
    [
      company,
      interviewerLabel,
      isGeneratingReport,
      mode,
      persona,
      persistAndNavigateToReport,
      role,
      roleLabel,
      stopRecognition,
      voiceProviderName,
      clearAnswerTimer,
      user,
    ]
  );

  // ── Voice monitor ──
  const startVoiceMonitor = useCallback(async () => {
    if (!mediaSupported) return;

    try {
      // Reuse pre-warmed stream if available, otherwise request now
      if (!microphoneStreamRef.current) {
        microphoneStreamRef.current = await getMicrophoneStream();
      }
      const stream = microphoneStreamRef.current;

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
        let maxAmplitude = 0;

        for (let index = 0; index < samples.length; index += 1) {
          const normalized = (samples[index] - 128) / 128;
          sum += normalized * normalized;
          const absVal = Math.abs(normalized);
          if (absVal > maxAmplitude) maxAmplitude = absVal;
        }

        const rms = Math.sqrt(sum / samples.length);
        const speaking = rms > 0.05;

        if (speaking) {
          if (previousState !== "Listening") {
            previousState = "Listening";
            setVoiceActivityState("Listening");
          }
          lastSoundTimeRef.current = Date.now();
        } else if (previousState !== "Processing") {
          previousState = "Silent";
          setVoiceActivityState("Silent");
        }

        // ─── Draw waveform canvas ───
        if (waveformCanvasRef.current) {
          const canvas = waveformCanvasRef.current;
          const rect = canvas.getBoundingClientRect();
          const dpr = window.devicePixelRatio || 1;
          // Only resize if dimensions changed
          if (canvas.width !== Math.round(rect.width * dpr)) {
            canvas.width = Math.round(rect.width * dpr);
            canvas.height = Math.round(rect.height * dpr);
          }
          const ctx = canvas.getContext("2d");
          if (ctx) {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

            const drawWidth = rect.width;
            const drawHeight = rect.height;
            const centerY = drawHeight / 2;

            if (rms > 0.01 || speaking) {
              // Active waveform
              ctx.strokeStyle = "rgba(245, 198, 137, 0.7)";
              ctx.lineWidth = 1.5;
              ctx.lineJoin = "round";
              ctx.beginPath();

              const step = Math.max(1, Math.floor(samples.length / drawWidth));
              const effectiveCount = Math.ceil(samples.length / step);
              const sliceWidth = drawWidth / effectiveCount;
              let x = 0;

              for (let i = 0; i < samples.length; i += step) {
                const v = (samples[i] - 128) / 128;
                const amplitude = v * Math.min(1, rms * 20) * (drawHeight * 0.4);
                const y = centerY + amplitude;

                if (x === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
                x += sliceWidth * step;
              }

              ctx.stroke();
            } else {
              // Idle flat line
              ctx.strokeStyle = "rgba(245, 198, 137, 0.2)";
              ctx.lineWidth = 1;
              ctx.beginPath();
              ctx.moveTo(0, centerY);
              ctx.lineTo(drawWidth, centerY);
              ctx.stroke();
            }
          }
        }

        // ─── Silence detection (3s) ───
        if (silenceWarningRef.current && voiceActivityState === "Listening") {
          const silenceDuration = Date.now() - lastSoundTimeRef.current;
          silenceWarningRef.current.style.display = silenceDuration > 3000 ? "block" : "none";
        } else if (silenceWarningRef.current) {
          silenceWarningRef.current.style.display = "none";
        }

        // ─── Update recording timer ───
        if (recordingTimerRef.current) {
          const elapsed = Math.floor((Date.now() - (turnStartedAtRef.current || Date.now())) / 1000);
          const mins = String(Math.floor(elapsed / 60)).padStart(2, '0');
          const secs = String(elapsed % 60).padStart(2, '0');
          recordingTimerRef.current.textContent = mins + ':' + secs;
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
    setIsAnswering(true);
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
          console.log('[ASR Final] text=' + text + ' len=' + text.length);
          appendedFinal += text;
        } else {
          console.log('[ASR Partial] interim len=' + text.length);
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

      interimTranscriptRef.current = nextInterim.trim();
      setInterimTranscript(nextInterim.trim());
      setVoiceActivityState("Listening");
    };

    recognition.onerror = () => {
      setVoiceActivityState("Processing");
      setStatusText("语音识别出现波动，系统会继续尝试");
    };

    recognition.onend = () => {
      if (phase !== 'processing' && phase !== 'completed') {
        setVoiceActivityState("Silent");
      }
    };

    recognitionRef.current = recognition;
    recognition.start();
  }, [
    phase,
    recognitionSupported,
    startVoiceMonitor,
    stopRecognition,
  ]);

  // ── API calls ──
  const fetchOpeningQuestion = useCallback(async () => {
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
        resumeText: resumeTextRef.current,
      }),
    });

    const payload = (await response.json()) as InterviewApiQuestion;
    if (!response.ok || !payload.question) {
      throw new Error("首轮问题获取失败");
    }

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
          resumeText: resumeTextRef.current,
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

  // ── State Machine: Preparing Phase ──
  useEffect(() => {
    if (phase !== 'preparing') return;

    let cancelled = false;

    async function prepare() {
      try {
        // 1. Prepare voice session
        const [, firstQ] = await Promise.all([
          voiceSession?.prepare(),
          fetchOpeningQuestion(),
        ]);

        // 2. Fetch opening question
        setStatusText('正在准备面试内容...');
        setVoiceActivityState('tts_generating');
        if (cancelled) return;

        const firstQuestion = firstQ!;
        const qText = firstQuestion.question?.trim() ?? '';
        if (!qText) throw new Error('首轮问题内容为空');

        // 3. Store pending question (hidden from UI until user clicks start)
        pendingQuestionRef.current = {
          text: qText,
          stage: firstQ.stage ?? 'self-intro',
          interviewer: firstQ.interviewer ?? 'AI 面试官',
          roleLabel: firstQ.roleLabel ?? roleLabel,
        };
        activeQuestionRef.current = qText;

        if (firstQ.interviewer) setInterviewerLabel(firstQ.interviewer);
        if (firstQ.roleLabel) setRoleLabel(firstQ.roleLabel);

        // 4. Preload TTS for first question
        setStatusText('正在准备语音...');
        if (qText) {
          await voiceSession?.preloadQuestion(qText);
        }

        // 5. Transition to ready
        if (!cancelled) {
          setPhase('ready');
          setStatusText('面试内容已准备完成');
        }
      } catch (err) {
        if (!cancelled) {
          setFatalError(err instanceof Error ? err.message : '面试准备失败');
          setStatusText('面试准备失败');
          setPhase('error');
        }
      }
    }

    prepare();

    // Pre-warm microphone (fire-and-forget, don't block preparation)
    async function prewarmMicrophone() {
      if (!mediaSupported) return;
      try {
        const stream = await getMicrophoneStream();
        if (!cancelled) {
          microphoneStreamRef.current = stream;
        } else {
          stream.getTracks().forEach((t) => t.stop());
        }
      } catch {
        // Mic permission denied or unavailable
      }
    }
    prewarmMicrophone();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  // ── Play current question (TTS + text sync via onPlayStart) ──
  const playCurrentQuestion = useCallback(async (pending: PendingQuestion) => {
    setAutoplayBlocked(false);
    setStatusText('面试官正在提问...');
    setVoiceActivityState('tts_playing');
    setLiveTranscript('');
    setInterimTranscript('');
    finalTranscriptRef.current = '';

    try {
      await voiceSession?.speakQuestion(pending.text, {
        onPlayStart: () => {
          // Text appears synchronously with audio start (<100ms gap)
          setCurrentQuestion(pending.text);
          setCurrentStage(pending.stage);
        },
        onPlayEnd: () => {
          // Transition to listening after TTS finishes
          setPhase('listening');
          setVoiceActivityState('waiting_answer');
          setStatusText('请开始作答');
          const answerSeconds = getAnswerSecondsForStage(pending.stage);
          setAnswerCountdown(answerSeconds);
          startRecognition();
          startAnswerCountdown(answerSeconds);
        },
      });

      saveGrowthEvent({
        type: 'tts_played',
        sessionId: sessionIdRef.current,
        company,
        roleLabel: pending.roleLabel,
        mode,
        question: pending.text,
      });
    } catch (error) {
      if (error instanceof TtsAutoplayBlockedError) {
        setAutoplayBlocked(true);
        setStatusText('请点击下方按钮播放语音');
        setVoiceActivityState('tts_playing');
        return;
      }
      throw error;
    }
  }, [company, mode, startAnswerCountdown, startRecognition, voiceSession]);

  // ── Handle user clicking "开始面试" (ready → playing) ──
  const handleStartInterview = useCallback(async () => {
    if (phase !== 'ready') return;
    const pending = pendingQuestionRef.current;
    if (!pending) return;

    // Start elapsed timer
    startElapsedTimer();

    saveGrowthEvent({
      type: 'interview_started',
      sessionId: sessionIdRef.current,
      company,
      roleLabel: pending.roleLabel,
      mode,
    });

    setPhase('playing');
    await playCurrentQuestion(pending);
  }, [company, mode, phase, playCurrentQuestion, startElapsedTimer]);

  // ── Handle user ending answer (listening → processing → playing) ──
  const handleEndAnswer = useCallback(async () => {
    if (phase !== 'listening' || isGeneratingReport) return;
    if (interviewFinishedRef.current) {
      console.log('[Interview] interviewFinishedRef=true, rejecting answer');
      return;
    }

    // Enter processing UI immediately
    setPhase('processing');
    setVoiceActivityState('Processing');
    setStatusText('正在结束本轮回答...');
    setAnswerCountdown(0);

    // Snapshot transcript BEFORE stopping recognition (protect against lost chunks)
    const transcriptSnapshot = finalTranscriptRef.current.trim();

    const completeTranscript = await stopRecognitionAsync();
    clearAnswerTimer();
    setIsAnswering(false);
    setLiveTranscript('');
    setInterimTranscript('');

    // Use the most complete transcript: prefer post-stop (may include final results),
    // but fall back to snapshot if stop resolved too early
    const transcriptAfterStop = finalTranscriptRef.current.trim();
    const bestTranscript = transcriptAfterStop.length >= transcriptSnapshot.length
      ? transcriptAfterStop
      : transcriptSnapshot;
    const answerText = (completeTranscript || bestTranscript || interimTranscriptRef.current).trim();
    console.log('[ASR] Final transcript length=' + answerText.length + ' snapshot=' + transcriptSnapshot.length);
    const answerDurationSeconds = turnStartedAtRef.current
      ? Math.max(1, Math.round((Date.now() - turnStartedAtRef.current) / 1000))
      : 0;

    const turn: InterviewTurn = {
      question: activeQuestionRef.current,
      answer: answerText,
      stage: currentStage,
      answerDurationSeconds,
      transcriptChars: answerText.length,
      createdAt: new Date().toISOString(),
    };

    saveGrowthEvent({
      type: 'question_answered',
      sessionId: sessionIdRef.current,
      company,
      roleLabel,
      mode,
      question: activeQuestionRef.current,
    });

    setStatusText('AI 正在分析你的回答...');

    const nextTurns = [...turns, turn];
    setTurns(nextTurns);

    const totalElapsedSeconds =
      startAtRef.current === null ? elapsedSeconds : Math.round((Date.now() - startAtRef.current) / 1000);

    const effectiveMaxRounds = getTotalRoundsForMode(mode);

    if (nextTurns.length >= effectiveMaxRounds) {
      await generateReportAndFinish(nextTurns, totalElapsedSeconds);
      return;
    }

    // Fetch next question + preload TTS (pipeline)
    try {
      const nextQ = await fetchNextQuestion(nextTurns);
      const qText = nextQ.question?.trim() ?? '';
      if (!qText) throw new Error('下一轮问题内容为空');

      pendingQuestionRef.current = {
        text: qText,
        stage: nextQ.stage ?? currentStage,
        interviewer: nextQ.interviewer ?? interviewerLabel,
        roleLabel: nextQ.roleLabel ?? roleLabel,
      };
      activeQuestionRef.current = qText;

      if (nextQ.interviewer) setInterviewerLabel(nextQ.interviewer);
      if (nextQ.roleLabel) setRoleLabel(nextQ.roleLabel);

      // Preload TTS while still showing "AI 正在分析你的回答..."
      setStatusText('AI 正在分析你的回答...（语音准备中）');
      await voiceSession?.preloadQuestion(qText);

      // Transition to playing — text will only appear when TTS starts
      setPhase('playing');
      await playCurrentQuestion(pendingQuestionRef.current);
    } catch (err) {
      setFatalError(err instanceof Error ? err.message : '下一轮问题生成失败');
      setStatusText('失败，请刷新后重试');
      setPhase('error');
    }
  }, [
    clearAnswerTimer,
    currentStage,
    company,
    elapsedSeconds,
    fetchNextQuestion,
    generateReportAndFinish,
    interviewerLabel,
    isGeneratingReport,
    mode,
    phase,
    playCurrentQuestion,
    roleLabel,
    stopRecognitionAsync,
    turns,
    voiceSession,
  ]);

  // ── Handle autoplay-blocked resume ──
  const handleResumeAudioPlayback = useCallback(async () => {
    if (!autoplayBlocked || phase !== 'playing') return;
    const pending = pendingQuestionRef.current;
    if (!pending) return;

    setAutoplayBlocked(false);
    try {
      await voiceSession?.speakQuestion(pending.text, {
        onPlayStart: () => {
          setCurrentQuestion(pending.text);
          setCurrentStage(pending.stage);
        },
        onPlayEnd: () => {
          setPhase('listening');
          setVoiceActivityState('waiting_answer');
          setStatusText('请开始作答');
          const answerSeconds = getAnswerSecondsForStage(pending.stage);
          setAnswerCountdown(answerSeconds);
          startRecognition();
          startAnswerCountdown(answerSeconds);
        },
      });
    } catch (error) {
      if (error instanceof TtsAutoplayBlockedError) {
        setAutoplayBlocked(true);
        setStatusText('请点击下方按钮播放语音');
        return;
      }
      setFatalError(error instanceof Error ? error.message : '语音播放失败');
      setPhase('error');
    }
  }, [autoplayBlocked, phase, startAnswerCountdown, startRecognition, voiceSession]);

  // ── Scroll transcript ──
  useEffect(() => {
    if (!transcriptScrollRef.current) return;
    transcriptScrollRef.current.scrollTop = transcriptScrollRef.current.scrollHeight;
  }, [transcriptPreview, statusText, voiceActivityState]);

  // ── Auto-navigate to report after completion ──
  useEffect(() => {
    if (phase === 'completed' && completedSessionIdRef.current && !isGeneratingReport) {
      const sid = completedSessionIdRef.current;
      const timer = setTimeout(() => {
        router.push('/interview/report?sessionId=' + encodeURIComponent(sid));
      }, 2500);
      return () => clearTimeout(timer);
    }
  }, [phase, isGeneratingReport, router]);

  // ── Cleanup on unmount ──
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

  // ── Computed UI values ──
  const activeVoiceState = voiceStateMeta[voiceActivityState] ?? voiceStateMeta.Silent;
  const answerCountdownLabel = formatAnswerCountdown(answerCountdown);
  const showHeader = phase === 'playing' || phase === 'listening' || phase === 'processing';
  const showBottomCard = phase === 'playing' || phase === 'listening' || phase === 'processing';
  const isPlayingPhase = phase === 'playing';
  const isListeningPhase = phase === 'listening';

  // ── Render ──
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

          {/* ── Header: Transcript + Timer (playing/listening only) ── */}
          {showHeader && (
            <div className="flex max-sm:flex-col max-sm:gap-3 items-start justify-between gap-4">
              <div className="w-full max-sm:max-w-full max-w-[13.2rem] rounded-[16px] border border-white/6 bg-[linear-gradient(180deg,rgba(26,15,10,0.42),rgba(8,6,6,0.3))] px-2.5 py-2 shadow-[0_10px_24px_rgba(0,0,0,0.12)] backdrop-blur-md">
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
                  className="mt-2.5 h-[12.4rem] max-sm:h-[8rem] space-y-2 overflow-y-auto pr-1 text-[0.7rem] leading-6 text-white/74 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-white/12"
                >
                  <p>
                    <span className="text-white/56">{interviewerLabel}：</span>
                    {phase === 'processing' && isGeneratingReport ? '面试结束，正在生成面试报告...' : phase === 'processing' ? '正在分析问题内容...' : (currentQuestion || '请稍等，面试官正在进入面试室。')}
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

              <div className="rounded-[20px] max-sm:w-full border border-white/7 bg-[linear-gradient(180deg,rgba(52,45,40,0.34),rgba(23,19,18,0.34))] px-4 py-2.5 text-right shadow-[0_10px_28px_rgba(0,0,0,0.16)] backdrop-blur-md">
                <p className="text-[10px] uppercase tracking-[0.26em] text-white/56">
                  面试时长 / Duration
                </p>
                <p className="mt-2 text-[1.5rem] sm:text-[2.15rem] font-light tracking-[0.12em] text-white/92 md:text-[2.85rem]">
                  {formatDuration(elapsedSeconds)}
                </p>
              </div>
            </div>
          )}

          {/* ── Preparing State ── */}
          {phase === 'preparing' && (
            <div className="flex flex-1 flex-col items-center justify-center pb-24">
              <Loader2 className="h-10 w-10 animate-spin text-amber-200/70" />
              <p className="mt-6 text-xl font-light tracking-wider text-white/80">
                正在准备面试内容...
              </p>
              <p className="mt-2 text-sm text-white/50">请稍后</p>
            </div>
          )}

          {/* ── Ready State ── */}
          {phase === 'ready' && (
            <div className="flex flex-1 flex-col items-center justify-center pb-24">
              <p className="text-xl font-light tracking-wider text-white/90">
                面试内容已准备完成
              </p>
              <p className="mt-2 text-sm text-white/50">
                已准备好 {roleLabel} 岗位的模拟面试
              </p>
              <button
                type="button"
                onClick={handleStartInterview}
                className="mt-10 inline-flex items-center gap-2 rounded-full border border-[#f5c689]/24 bg-[#f5c689]/10 px-6 py-3 text-sm uppercase tracking-[0.22em] text-[#ffe2bf] transition hover:border-[#f5c689]/34 hover:bg-[#f5c689]/16 hover:text-white"
              >
                点击开始面试
              </button>
              <div className="mt-12 max-w-md rounded-xl border border-white/8 bg-white/5 px-5 py-4 text-center">
                <p className="text-xs leading-relaxed text-white/50">
                  为保证语音识别效果，建议佩戴耳机并使用收音清晰的麦克风，以确保您的回答被完整记录。
                </p>
              </div>
            </div>
          )}

          {/* ── Error State ── */}
          {phase === 'error' && (
            <div className="flex flex-1 flex-col items-center justify-center pb-24">
              <p className="text-xl font-light tracking-wider text-[#ffd1c6]/90">
                面试出现错误
              </p>
              {fatalError && (
                <p className="mt-3 max-w-md text-center text-sm leading-relaxed text-white/60">
                  {fatalError}
                </p>
              )}
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="mt-10 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/14 px-6 py-3 text-sm uppercase tracking-[0.22em] text-white/70 transition hover:border-white/30 hover:bg-white/22 hover:text-white"
              >
                刷新重试
              </button>
            </div>
          )}

          {/* ── Completed State ── */}
          {phase === 'completed' && (
            <div className="flex flex-1 flex-col items-center justify-center pb-24">
              <div className="inline-flex h-16 w-16 items-center justify-center rounded-full border border-emerald-400/30 bg-emerald-400/10">
                <svg className="h-8 w-8 text-emerald-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                </svg>
              </div>
              <p className="mt-6 text-xl font-light tracking-wider text-white/90">
                面试已结束
              </p>
              <p className="mt-2 text-sm text-white/50">
                {completedTurnsRef.current /* eslint-disable-line react-hooks/refs */} 轮 · 用时 {Math.floor(elapsedSeconds / 60)} 分 {elapsedSeconds % 60} 秒
              </p>
              <p className="mt-1 text-sm text-white/50">
                综合评分：{completedScoreRef.current /* eslint-disable-line react-hooks/refs */} 分
              </p>
              <button
                type="button"
                onClick={() => {
                  const sid = completedSessionIdRef.current;
                  if (sid) router.push('/interview/report?sessionId=' + encodeURIComponent(sid));
                }}
                className="mt-10 inline-flex items-center gap-2 rounded-full border border-[#f5c689]/24 bg-[#f5c689]/10 px-6 py-3 text-sm uppercase tracking-[0.22em] text-[#ffe2bf] transition hover:border-[#f5c689]/34 hover:bg-[#f5c689]/16 hover:text-white"
              >
                查看面试报告
              </button>
              <p className="mt-2 text-[0.6rem] tracking-[0.15em] text-[#f5c689]/50">
                报告已生成 · 即将自动跳转
              </p>
              <button
                type="button"
                onClick={() => router.push('/interview')}
                className="mt-4 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/14 px-4 py-2 text-xs uppercase tracking-[0.22em] text-white/60 transition hover:border-white/30 hover:bg-white/22 hover:text-white"
              >
                返回面试选择
              </button>
            </div>
          )}

          {/* ── Bottom Card (playing/listening) ── */}
          {showBottomCard && (
            <section className="relative flex flex-1 items-end justify-center pb-[6.5rem] pt-6 md:pb-[7.1rem]">
              <div className="relative w-full max-w-[1120px]">
                <div className="pointer-events-none absolute inset-x-0 bottom-[-1.1rem] flex justify-center px-5 md:px-8">
                  <div className="w-full max-w-[760px] rounded-[18px] border border-white/5 bg-[linear-gradient(180deg,rgba(18,11,9,0.3),rgba(8,7,7,0.18))] px-4 py-2 shadow-[0_10px_22px_rgba(0,0,0,0.16)] backdrop-blur-sm md:px-5 md:py-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <p className="flex items-center gap-2 text-[10px] uppercase tracking-[0.3em] text-[#f5c689]/72">
                        <span className={activeVoiceState.dotClassName || "h-1.5 w-1.5 rounded-full bg-[#f5c689]/90"} />
                        {phase === 'processing' && isGeneratingReport ? '面试结束 / Interview Complete' : phase === 'processing' ? 'AI 正在分析 / Processing' : isPlayingPhase ? '面试官正在提问 / AI Interviewer' : '答题阶段 / Answering'}
                      </p>
                      {isListeningPhase ? (
                        <span ref={recordingTimerRef} className="font-light tabular-nums text-[0.82rem] tracking-[0.12em] text-[#f5c689]/60">
                          00:00
                        </span>
                      ) : null}
                    </div>
                    {isListeningPhase ? (
                      <div className="mt-1.5">
                        <canvas
                          ref={waveformCanvasRef}
                          className="h-8 w-full rounded-sm"
                          style={{ height: '32px' }}
                        />
                        <div className="flex items-center justify-between mt-0.5">
                          <p className="text-[0.6rem] tracking-[0.2em] text-[#f5c689]/60">
                            {voiceActivityState === 'Listening' ? '正在聆听...' : voiceActivityState === 'waiting_answer' ? '等待你的回答' : '—'}
                          </p>
                          <p
                            ref={silenceWarningRef}
                            className="text-[0.6rem] tracking-[0.1em] text-amber-300/70"
                            style={{ display: 'none' }}
                          >
                            未检测到声音，请确认麦克风是否正常
                          </p>
                        </div>
                      </div>
                    ) : null}
                    <p className="mt-2 text-pretty text-[0.9rem] sm:text-[1rem] leading-[1.42] tracking-[-0.01em] text-white/92 drop-shadow-[0_2px_8px_rgba(0,0,0,0.2)] md:text-[1.28rem]">
                      {phase === 'processing' && isGeneratingReport ? '面试结束，正在生成面试报告...' : phase === 'processing' ? '正在分析问题内容...' : currentQuestion}
                    </p>
                    <div className="mt-2 flex max-sm:flex-col max-sm:items-stretch items-center justify-between gap-3">
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
                          {isPlayingPhase
                            ? 'AI 正在朗读题目...'
                            : isAnswering
                              ? '你可以继续作答，或主动结束当前回答'
                              : ''}
                        </p>
                      </div>
                      {autoplayBlocked && isPlayingPhase ? (
                        <button
                          type="button"
                          onClick={handleResumeAudioPlayback}
                          aria-label="播放面试官语音"
                          className="pointer-events-auto inline-flex items-center rounded-full border border-[#f5c689]/24 bg-[#f5c689]/10 px-4 py-2 text-[0.72rem] uppercase tracking-[0.22em] text-[#ffe2bf] transition hover:border-[#f5c689]/34 hover:bg-[#f5c689]/16 hover:text-white"
                        >
                          播放语音
                        </button>
                      ) : isListeningPhase ? (
                        <button
                          type="button"
                          onClick={handleEndAnswer}
                          aria-label="结束回答"
                          disabled={!isAnswering || isGeneratingReport}
                          className="pointer-events-auto inline-flex items-center rounded-full border border-white/20 bg-white/14 px-4 py-2 text-[0.72rem] uppercase tracking-[0.22em] text-white/88 transition hover:border-white/30 hover:bg-white/22 hover:text-white disabled:cursor-not-allowed disabled:border-white/8 disabled:bg-white/5 disabled:text-white/35"
                        >
                          End Answer
                        </button>
                      ) : null}
                    </div>
                  </div>
                </div>
              </div>
            </section>
          )}

        </div>
      </div>
    </main>
  );
}
