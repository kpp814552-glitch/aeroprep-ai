"use client";

import { interviewStageLabels } from "@/lib/interview/config";
import type { InterviewStage } from "@/lib/interview/types";

type InterviewUIProps = {
  phase: string;
  currentQuestion: string;
  currentStage: InterviewStage;
  elapsedSeconds: number;
  answerCountdown: number;
  isAnswering: boolean;
  isGeneratingReport: boolean;
  transcriptPreview: string;
  roleLabel: string;
  interviewerLabel: string;
  turnsCount: number;
  totalRounds: number;
  fatalError: string;
  statusText: string;
  autoplayBlocked: boolean;
  onEndAnswer: () => void;
  onResumeAudio: () => void;
};

const glassCardClass = "backdrop-blur-lg bg-white/18 border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.06)] rounded-[20px]";

function formatDuration(s: number) {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}

function formatCountdown(s: number) {
  const m = Math.floor(Math.max(0, s) / 60);
  const sec = Math.floor(Math.max(0, s) % 60);
  return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}

/**
 * Apple-style glass UI overlay for the 3D interview scene.
 */
export function InterviewUI({
  phase,
  currentQuestion,
  currentStage,
  elapsedSeconds,
  answerCountdown,
  isAnswering,
  isGeneratingReport,
  transcriptPreview,
  roleLabel,
  interviewerLabel,
  turnsCount,
  totalRounds,
  fatalError,
  statusText,
  autoplayBlocked,
  onEndAnswer,
  onResumeAudio,
}: InterviewUIProps) {
  const isProcessing = phase === "processing";

  return (
    <div className="absolute inset-0 pointer-events-none z-10 flex flex-col">
      {/* ─── Top bar ─── */}
      <div className="flex items-start justify-between px-6 pt-6 pointer-events-auto">
        {/* Transcript card */}
        <div className={`${glassCardClass} w-72 p-4 max-h-48 overflow-y-auto`}>
          <div className="flex items-center gap-2 mb-2">
            {phase === "listening" && (
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            )}
            <span className="text-[10px] uppercase tracking-[0.12em] text-white/70">
              实时回答
            </span>
          </div>
          <p className="text-sm leading-6 text-white/85 break-words">
            {transcriptPreview}
          </p>
          {phase === "listening" && isAnswering && (
            <span className="text-xs text-emerald-300/80">Listening…</span>
          )}
        </div>

        {/* Timer & progress card */}
        <div className={`${glassCardClass} px-5 py-4 text-right min-w-[140px]`}>
          <p className="text-[10px] uppercase tracking-[0.12em] text-white/70">
            面试时间
          </p>
          <p className="mt-1 text-2xl font-light tracking-[0.08em] text-white/95 tabular-nums">
            {formatDuration(elapsedSeconds)}
          </p>
          <p className="mt-2 text-[11px] text-white/60">
            第 {turnsCount + 1} / {totalRounds} 题
          </p>
        </div>
      </div>

      {/* ─── Bottom question area ─── */}
      <div className="mt-auto px-6 pb-8 pointer-events-auto">
        <div className={`${glassCardClass} mx-auto max-w-[70%] px-8 py-6`}>
          {/* Stage label */}
          <p className="text-[10px] uppercase tracking-[0.16em] text-white/50 mb-2">
            {interviewStageLabels[currentStage] || "问答"} · 第 {turnsCount + 1} 题
          </p>

          {/* Question text */}
          {isProcessing ? (
            <div className="space-y-3 animate-pulse">
              <div className="h-4 w-3/4 rounded bg-white/10" />
              <div className="h-4 w-1/2 rounded bg-white/10" />
            </div>
          ) : (
            <p className="text-lg leading-relaxed text-white/90 font-light">
              {currentQuestion || "即将开始面试..."}
            </p>
          )}

          {/* Controls */}
          <div className="flex items-center justify-between mt-5">
            <p className="text-xs text-white/50">{statusText}</p>
            <div className="flex items-center gap-3">
              {autoplayBlocked ? (
                <button
                  type="button"
                  onClick={onResumeAudio}
                  className="rounded-full px-5 py-2 text-sm bg-white/15 text-white/90 hover:bg-white/25 transition border border-white/10"
                >
                  播放语音
                </button>
              ) : (
                <button
                  type="button"
                  onClick={onEndAnswer}
                  disabled={!isAnswering || isGeneratingReport}
                  className="rounded-full px-5 py-2 text-sm bg-white/15 text-white/90 hover:bg-white/25 transition border border-white/10 disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  {isProcessing ? "分析中..." : "结束回答"}
                </button>
              )}
            </div>
          </div>

          {/* Countdown */}
          {isAnswering && (
            <div className="mt-3">
              <div className="h-1 rounded-full bg-white/10 overflow-hidden">
                <div
                  className="h-full rounded-full bg-white/30 transition-all duration-1000"
                  style={{ width: `${(answerCountdown / 120) * 100}%` }}
                />
              </div>
              <p className="mt-1 text-xs text-white/40 text-right tabular-nums">
                {formatCountdown(answerCountdown)}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
