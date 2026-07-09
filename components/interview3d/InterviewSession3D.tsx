"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Scene3D } from "./Scene3D";
import { InterviewUI } from "./InterviewUI";
import { mapPhaseToAnimationState, createAnimationMachine } from "./AnimationMachine";
import type { AnimationState } from "@/lib/interview3d/types";

import { getTotalRoundsForMode } from "@/lib/interview/config";

import type { InterviewPhase, InterviewRole, InterviewStage, InterviewTurn } from "@/lib/interview/types";
import { useAuth } from "@/hooks/useAuth";

function normalizeRole(value: string | null): InterviewRole {
  const candidates: InterviewRole[] = ["pilot","dispatcher","maintenance","civil-aviation-electronics","cabin-crew","atc","aviation-meteorology"];
  return candidates.includes(value as InterviewRole) ? (value as InterviewRole) : "pilot";
}

export default function InterviewSession3D() {
  const router = useRouter();
  const params = useSearchParams();

  const company = params.get("company") ?? "国航";
  const role = normalizeRole(params.get("role"));
  const mode = params.get("mode") ?? "校招";
  const persona = params.get("persona") ?? "专业型HR";

  // Phase & UI state
  const [phase, setPhase] = useState<InterviewPhase>("preparing");
  const [animationState, setAnimationState] = useState<AnimationState>("loading");
  const [currentQuestion, setCurrentQuestion] = useState("");
  const [currentStage, setCurrentStage] = useState<InterviewStage>("self-intro");

  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [answerCountdown, setAnswerCountdown] = useState(0);
  const [liveTranscript, setLiveTranscript] = useState("");
  const [interimTranscript, setInterimTranscript] = useState("");
  const [roleLabel, setRoleLabel] = useState("飞行员");
  const [interviewerLabel, setInterviewerLabel] = useState("AI 面试官");
  const [turns, setTurns] = useState<InterviewTurn[]>([]);
  const [isAnswering, setIsAnswering] = useState(false);
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [fatalError, setFatalError] = useState("");
  const [statusText, setStatusText] = useState("");
  const [autoplayBlocked, setAutoplayBlocked] = useState(false);
  const [avatarReady, setAvatarReady] = useState(false);

  // Refs
  const startAtRef = useRef<number | null>(null);
  const elapsedTimerRef = useRef<number | null>(null);

  const totalRounds = getTotalRoundsForMode(mode);
  const transcriptPreview = `${liveTranscript}${interimTranscript ? " " + interimTranscript : ""}`;

  // Animation machine — syncs with interview phase
  useEffect(() => {
    setAnimationState(mapPhaseToAnimationState(phase));
  }, [phase]);

  // Timer
  const startElapsedTimer = useCallback(() => {
    if (elapsedTimerRef.current) return;
    startAtRef.current = Date.now();
    elapsedTimerRef.current = window.setInterval(() => {
      setElapsedSeconds(s => s + 1);
    }, 1000);
  }, []);

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-[#e8e0d8]">
      {/* 3D scene — full screen */}
      <Scene3D
        animationState={animationState}
        onAvatarReady={() => setAvatarReady(true)}
      />

      {/* UI overlay */}
      {avatarReady && (
        <InterviewUI
          phase={phase}
          currentQuestion={currentQuestion}
          currentStage={currentStage}
          elapsedSeconds={elapsedSeconds}
          answerCountdown={answerCountdown}
          isAnswering={isAnswering}
          isGeneratingReport={isGeneratingReport}
          transcriptPreview={transcriptPreview}
          roleLabel={roleLabel}
          interviewerLabel={interviewerLabel}
          turnsCount={turns.length}
          totalRounds={totalRounds}
          fatalError={fatalError}
          statusText={statusText}
          autoplayBlocked={autoplayBlocked}
          onEndAnswer={() => {}}
          onResumeAudio={() => {}}
        />
      )}
    </div>
  );
}
