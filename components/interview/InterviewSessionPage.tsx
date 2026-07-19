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
  analyzeInterviewReport,
  buildSessionRecord } from "@/lib/interview/report";
import {
  readInterviewSession,
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
import { incrementFreeInterviewCount, isMember } from "@/lib/member/member-storage";
import {

  createInterviewVoiceSession,
  type InterviewVoiceSession,
  type VoiceProviderName,
} from "@/lib/interview/voice";
import {
  TtsAutoplayBlockedError } from "@/lib/audio/tts-player";
import {
  useAuth } from "@/hooks/useAuth";
import { useInterviewTimer } from "@/hooks/useInterviewTimer";
import { useInterviewVoice } from "@/hooks/useInterviewVoice";

function createSessionId() {
  return `session-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function normalizeRole(value: string | null): InterviewRole {
  const candidates: InterviewRole[] = [
    "pilot", "dispatcher", "maintenance", "civil-aviation-electronics",
    "cabin-crew", "atc", "aviation-meteorology",
    "air-marshal", "terminal-service",
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

type PendingQuestion = { stage: InterviewStage; text: string; interviewer?: string; roleLabel?: string };
type InterviewApiQuestion = { question: { stage: InterviewStage; text: string; turnCount?: number } | null; stage?: InterviewStage; interviewer?: string; roleLabel?: string };
type InterviewApiReport = { report: InterviewReport | null };

export default function InterviewSessionPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading } = useAuth();
  const sessionIdRef = useRef(createSessionId());
  const resumeTextRef = useRef(
  typeof window !== "undefined" ? sessionStorage.getItem("aeroprep_resume_text") || "" : ""
);
const resumeQualityRef = useRef<any>(
  typeof window !== "undefined"
    ? (() => { try { return JSON.parse(sessionStorage.getItem("aeroprep_resume_quality") || "null"); } catch { return null; } })()
    : null
);
  const endAnswerRef = useRef<() => void>(() => {});
  // ── Timer Hook ──
  const timer = useInterviewTimer();
  const listeningRef = useRef(false);
  const voiceSession = useMemo<InterviewVoiceSession | null>(() => {
    if (typeof window === "undefined") return null;

    return createInterviewVoiceSession({
      endpoint: "/api/tts",
    });
  }, []);
  const voice = useInterviewVoice(voiceSession, listeningRef);

  const company = searchParams.get("company") ?? "国航";
  const role = normalizeRole(searchParams.get("role"));
  const mode = searchParams.get("mode") ?? "校招";
  const persona = searchParams.get("persona") ?? "专业型HR";

  const recogCtor = typeof window !== "undefined"
    ? (window as any)?.SpeechRecognition || (window as any)?.webkitSpeechRecognition || null
    : null;
  const recognitionSupported = Boolean(recogCtor);
  const mediaSupported =
    typeof window !== "undefined" &&
    Boolean(navigator.mediaDevices?.getUserMedia) &&
    typeof window.AudioContext !== "undefined";

  // ── State Machine ──
  const [phase, setPhase] = useState<InterviewPhase>('preparing');

  // ── UI State ──
  // (timer.elapsedSeconds, answerCountdown from timer hook)
  const [currentQuestion, setCurrentQuestion] = useState("");
  const [currentStage, setCurrentStage] = useState<InterviewStage>("self-intro");
  const [interviewerLabel, setInterviewerLabel] = useState("AI 面试官");
  const [roleLabel, setRoleLabel] = useState("飞行员");
  const [voiceProviderName] =
    useState<VoiceProviderName | null>(null);
  const [statusText, setStatusText] = useState("正在连接面试室");
  const [turns, setTurns] = useState<InterviewTurn[]>([]);
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [fatalError, setFatalError] = useState("");

  // ── Refs for async-safe data flow ──
  const interviewFinishedRef = useRef(false);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const successPathRef = useRef(false);
  const pendingSaveDataRef = useRef<Record<string, unknown> | null>(null);
  const pendingQuestionRef = useRef<PendingQuestion | null>(null);
  const activeQuestionRef = useRef("");
  const completedSessionIdRef = useRef<string | null>(null);
  const completedScoreRef = useRef(0);
  const completedTurnsRef = useRef(0);

  const transcriptPreview = useMemo(() => {
    const combined = `${voice.liveTranscript}${voice.interimTranscript ? ` ${voice.interimTranscript}` : ""}`.trim();
    return combined || "面试开始后，这里会实时显示你的回答。";
  }, [voice.interimTranscript, voice.liveTranscript]);

  const transcriptScrollRef = useRef<HTMLDivElement | null>(null);



  // ── API callbacks ──
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
        resumeQuality: resumeQualityRef.current,
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
          resumeQuality: resumeQualityRef.current,
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
        voice.setVoiceActivityState('tts_generating');
        if (cancelled) return;

        const firstQuestion = firstQ!;
        const qText = firstQuestion.question?.text?.trim() ?? '';
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
    voice.setAutoplayBlocked(false);
    setStatusText('面试官正在提问...');
    voice.setVoiceActivityState('tts_playing');
    setLiveTranscript('');
    setInterimTranscript('');
    voice.finalTranscriptRef.current = '';

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
          voice.setVoiceActivityState('waiting_answer');
          setStatusText('请开始作答');
          const answerSeconds = getAnswerSecondsForStage(pending.stage);
          timer.setAnswerCountdown(answerSeconds);
          voice.startRecognition();
          timer.startAnswerCountdown(answerSeconds, () => endAnswerRef.current());
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
        voice.setAutoplayBlocked(true);
        setStatusText('请点击下方按钮播放语音');
        voice.setVoiceActivityState('tts_playing');
        return;
      }
      throw error;
    }
  }, [company, mode, timer.startAnswerCountdown, voice.startRecognition, voiceSession]);

  // ── Handle user clicking "开始面试" (ready → playing) ──
  const handleStartInterview = useCallback(async () => {
    if (phase !== 'ready') return;
    const pending = pendingQuestionRef.current;
    if (!pending) return;

    // Start elapsed timer
    timer.startElapsedTimer();

    saveGrowthEvent({
      type: 'interview_started',
      sessionId: sessionIdRef.current,
      company,
      roleLabel: pending.roleLabel,
      mode,
    });

    setPhase('playing');
    await playCurrentQuestion(pending);
  }, [company, mode, phase, playCurrentQuestion, timer.startElapsedTimer]);

  // ── Handle user ending answer (listening → processing → playing) ──
  const handleEndAnswer = useCallback(async () => {
    if (phase !== 'listening' || isGeneratingReport) return;
    if (interviewFinishedRef.current) {
      // console.log('[Interview] interviewFinishedRef=true, rejecting answer');
      return;
    }

    // Enter processing UI immediately
    setPhase('processing');
    voice.setVoiceActivityState('Processing');
    setStatusText('正在结束本轮回答...');
    timer.setAnswerCountdown(0);

    // Snapshot transcript BEFORE stopping recognition (protect against lost chunks)
    const transcriptSnapshot = voice.finalTranscriptRef.current.trim();

    const completeTranscript = await voice.stopRecognitionAsync();
    timer.clearAnswerTimer();
    voice.setIsAnswering(false);
    setLiveTranscript('');
    setInterimTranscript('');

    // Use the most complete transcript: prefer post-stop (may include final results),
    // but fall back to snapshot if stop resolved too early
    const transcriptAfterStop = voice.finalTranscriptRef.current.trim();
    const bestTranscript = transcriptAfterStop.length >= transcriptSnapshot.length
      ? transcriptAfterStop
      : transcriptSnapshot;
    const answerText = (completeTranscript || bestTranscript || voice.interimTranscriptRef.current).trim();
    // console.log('[ASR] Final transcript length=' + answerText.length + ' snapshot=' + transcriptSnapshot.length);
    const answerDurationSeconds = timer.turnStartedAtRef.current
      ? Math.max(1, Math.round((Date.now() - timer.turnStartedAtRef.current) / 1000))
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
      timer.startAtRef.current === null ? timer.elapsedSeconds : Math.round((Date.now() - timer.startAtRef.current) / 1000);

    const effectiveMaxRounds = getTotalRoundsForMode(mode);

    if (nextTurns.length >= effectiveMaxRounds) {
      await generateReportAndFinish(nextTurns, totalElapsedSeconds);
      return;
    }

    // Fetch next question + preload TTS (pipeline)
    try {
      const nextQ = await fetchNextQuestion(nextTurns);
      const qText = nextQ.question?.text?.trim() ?? '';
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
    timer.clearAnswerTimer,
    currentStage,
    company,
    timer.elapsedSeconds,
    fetchNextQuestion,
    generateReportAndFinish,
    interviewerLabel,
    isGeneratingReport,
    mode,
    phase,
    playCurrentQuestion,
    roleLabel,
    voice.stopRecognitionAsync,
    turns,
    voiceSession,
  ]);
  endAnswerRef.current = handleEndAnswer;

  // ── Handle autoplay-blocked resume ──
  const handleResumeAudioPlayback = useCallback(async () => {
    if (!autoplayBlocked || phase !== 'playing') return;
    const pending = pendingQuestionRef.current;
    if (!pending) return;

    voice.setAutoplayBlocked(false);
    try {
      await voiceSession?.speakQuestion(pending.text, {
        onPlayStart: () => {
          setCurrentQuestion(pending.text);
          setCurrentStage(pending.stage);
        },
        onPlayEnd: () => {
          setPhase('listening');
          voice.setVoiceActivityState('waiting_answer');
          setStatusText('请开始作答');
          const answerSeconds = getAnswerSecondsForStage(pending.stage);
          timer.setAnswerCountdown(answerSeconds);
          voice.startRecognition();
          timer.startAnswerCountdown(answerSeconds, () => endAnswerRef.current());
        },
      });
    } catch (error) {
      if (error instanceof TtsAutoplayBlockedError) {
        voice.setAutoplayBlocked(true);
        setStatusText('请点击下方按钮播放语音');
        return;
      }
      setFatalError(error instanceof Error ? error.message : '语音播放失败');
      setPhase('error');
    }
  }, [autoplayBlocked, phase, timer.startAnswerCountdown, voice.startRecognition, voiceSession]);

  // ── Scroll transcript ──
  useEffect(() => {
    if (!transcriptScrollRef.current) return;
    transcriptScrollRef.current.scrollTop = transcriptScrollRef.current.scrollHeight;
  }, [transcriptPreview, statusText, voiceActivityState]);

  // ── Download interview data to local file ──
  const handleDownloadSave = useCallback(() => {
    const data = pendingSaveDataRef.current;
    if (!data) { setShowSaveDialog(false); setPhase('completed'); return; }
    try {
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'aeroprep-interview-' + (data.sessionId || Date.now()) + '.json';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e) { console.error('[Download] Failed:', e); }
    setShowSaveDialog(false);
    setPhase('completed');
  }, []);

  const handleDismissSave = useCallback(() => {
    pendingSaveDataRef.current = null;
    setShowSaveDialog(false);
    setPhase('completed');
  }, []);

  // ── Retry report generation (for network failure recovery) ──
  const handleRetryReport = useCallback(async () => {
    const sid = completedSessionIdRef.current;
    if (!sid || isGeneratingReport) return;

    const savedRecord = readInterviewSession(sid);
    if (!savedRecord) return;

    setIsGeneratingReport(true);
    setStatusText('正在重新生成面试报告...');

    try {
      const resp = await fetch("/api/interview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "report",
          role: savedRecord.role,
          company: savedRecord.company,
          mode: savedRecord.mode,
          persona: savedRecord.persona,
          resumeText: resumeTextRef.current,
      resumeQuality: resumeQualityRef.current,
          turns: savedRecord.turns,
        }),
      });
      const payload = await resp.json();
      if (!resp.ok || !payload.report) throw new Error("报告生成失败");

      savedRecord.report = payload.report;
      saveInterviewSession(savedRecord);
      router.push('/interview/report?sessionId=' + encodeURIComponent(sid));
    } catch (err) {
      console.error('[Retry Report] Failed:', err);
      setStatusText('网络连接异常，请稍后重试');
      setIsGeneratingReport(false);
    }
  }, [isGeneratingReport, router]);

  // ── Auth guard ──
  useEffect(() => {
    if (!loading && !user) { const t = setTimeout(() => router.replace('/login?redirect=/interview/session'), 300); return () => clearTimeout(t); }
  }, [loading, user, router]);

  if (loading) return null;
  if (!user) return null;

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
      voice.stopRecognition();
      voiceSession?.stop();

      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, [voice.stopRecognition, voiceSession]);

  // ── Computed UI values ──
  const activeVoiceState = voiceStateMeta[voiceActivityState] ?? voiceStateMeta.Silent;
  const answerCountdownLabel = formatAnswerCountdown(timer.answerCountdown);
  const showHeader = phase === 'playing' || phase === 'listening' || phase === 'processing';
  const showBottomCard = phase === 'playing' || phase === 'listening' || phase === 'processing';
  const isPlayingPhase = phase === 'playing';
  const isListeningPhase = phase === 'listening';

  // ── Save dialog (shown when API fails) ──
  return showSaveDialog ? (
    <main className="relative min-h-screen overflow-hidden bg-[#1f140f] text-white">
      <div className="absolute inset-0 bg-cover bg-center bg-no-repeat" style={{ backgroundImage: 'url("/session-background.png")' }} />
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(17,10,7,0.08),rgba(24,13,10,0.18)_34%,rgba(14,8,6,0.42)_100%)]" />
      <div className="relative z-10 flex min-h-screen items-center justify-center px-4">
        <div className="w-full max-w-md rounded-[24px] border border-white/10 bg-[linear-gradient(180deg,rgba(26,15,10,0.85),rgba(8,6,6,0.85))] px-6 py-8 shadow-[0_24px_64px_rgba(0,0,0,0.4)] backdrop-blur-xl">
          <p className="text-sm uppercase tracking-[0.3em] text-[#f5c689]/80">数据保存</p>
          <p className="mt-4 text-base leading-7 text-white/80">
            面试数据未完成上传至服务器，是否将本次面试数据导出到本地电脑备用？
          </p>

          <div className="mt-8 flex flex-col gap-3">
            <button
              type="button"
              onClick={handleDownloadSave}
              className="inline-flex items-center justify-center gap-2 rounded-full border border-[#f5c689]/24 bg-[#f5c689]/10 px-6 py-3 text-sm uppercase tracking-[0.22em] text-[#ffe2bf] transition hover:border-[#f5c689]/34 hover:bg-[#f5c689]/16 hover:text-white"
            >
              保存到电脑
            </button>
            <button
              type="button"
              onClick={handleDismissSave}
              className="inline-flex items-center justify-center gap-2 rounded-full border border-white/20 bg-white/14 px-5 py-2.5 text-xs uppercase tracking-[0.22em] text-white/60 transition hover:border-white/30 hover:bg-white/22 hover:text-white"
            >
              不保存，直接查看本地报告
            </button>
          </div>
        </div>
      </div>
    </main>
  ) : (
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
                  {formatDuration(timer.elapsedSeconds)}
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
              <p className="mt-2 text-sm text-white/85">
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
                <p className="text-xs leading-relaxed text-white/80">
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
                {completedTurnsRef.current /* eslint-disable-line react-hooks/refs */} 轮 · 用时 {Math.floor(timer.elapsedSeconds / 60)} 分 {timer.elapsedSeconds % 60} 秒
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

              {successPathRef.current ? (
                <p className="mt-2 text-[0.6rem] tracking-[0.15em] text-[#f5c689]/50">
                  报告已生成 · 即将自动跳转
                </p>
              ) : null}
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
                        <span ref={voice.recordingTimerRef} className="font-light tabular-nums text-[0.82rem] tracking-[0.12em] text-[#f5c689]/60">
                          00:00
                        </span>
                      ) : null}
                    </div>
                    {isListeningPhase ? (
                      <div className="mt-1.5">
                        <canvas
                          ref={voice.waveformCanvasRef}
                          className="h-8 w-full rounded-sm"
                          style={{ height: '32px' }}
                        />
                        <div className="flex items-center justify-between mt-0.5">
                          <p className="text-[0.6rem] tracking-[0.2em] text-[#f5c689]/60">
                            {voiceActivityState === 'Listening' ? '正在聆听...' : voiceActivityState === 'waiting_answer' ? '等待你的回答' : '—'}
                          </p>
                          <p
                            ref={voice.silenceWarningRef}
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
