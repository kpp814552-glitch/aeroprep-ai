import { useCallback, useEffect, useRef, useState } from "react";

export function useInterviewTimer() {
  const startAtRef = useRef<number | null>(null);
  const elapsedTimerRef = useRef<number | null>(null);
  const answerTimerRef = useRef<number | null>(null);
  const turnStartedAtRef = useRef<number | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [answerCountdown, setAnswerCountdown] = useState(0);

  const clearAnswerTimer = useCallback(() => {
    if (answerTimerRef.current) {
      window.clearInterval(answerTimerRef.current);
      answerTimerRef.current = null;
    }
  }, []);

  const clearElapsedTimer = useCallback(() => {
    if (elapsedTimerRef.current) {
      window.clearInterval(elapsedTimerRef.current);
      elapsedTimerRef.current = null;
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

  const startAnswerCountdown = useCallback((seconds: number, onEnd: () => void) => {
    clearAnswerTimer();
    setAnswerCountdown(seconds);
    let remaining = seconds;
    answerTimerRef.current = window.setInterval(() => {
      remaining -= 1;
      setAnswerCountdown(Math.max(remaining, 0));
      if (remaining <= 0) {
        clearAnswerTimer();
        onEnd();
      }
    }, 1000);
  }, [clearAnswerTimer]);

  const getTurnDuration = useCallback(() => {
    return turnStartedAtRef.current
      ? Math.max(1, Math.round((Date.now() - turnStartedAtRef.current) / 1000))
      : 0;
  }, []);

  const getTotalElapsedSeconds = useCallback(() => {
    return startAtRef.current === null ? elapsedSeconds : Math.round((Date.now() - startAtRef.current) / 1000);
  }, [elapsedSeconds]);

  useEffect(() => {
    return () => { clearAnswerTimer(); clearElapsedTimer(); };
  }, [clearAnswerTimer, clearElapsedTimer]);

  return {
    elapsedSeconds, answerCountdown, setAnswerCountdown,
    turnStartedAtRef, startAtRef,
    startElapsedTimer, startAnswerCountdown, clearAnswerTimer, clearElapsedTimer,
    getTurnDuration, getTotalElapsedSeconds,
  };
}
