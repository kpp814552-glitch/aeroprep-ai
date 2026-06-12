import type { InterviewSessionRecord } from "@/lib/interview/types";

const STORAGE_KEY = "aeroprep-ai-interview-sessions";
const LATEST_SESSION_KEY = "aeroprep-ai-latest-session";
const MAX_SESSIONS = 16;
const SESSION_EVENT = "aeroprep-ai-session-updated";

function safeParse(rawValue: string | null) {
  if (!rawValue) return [];

  try {
    const parsed = JSON.parse(rawValue);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function readInterviewSessions() {
  if (typeof window === "undefined") return [] as InterviewSessionRecord[];

  return safeParse(window.localStorage.getItem(STORAGE_KEY)) as InterviewSessionRecord[];
}

export function readInterviewSession(sessionId?: string | null) {
  const sessions = readInterviewSessions();

  if (!sessions.length) return null;

  if (sessionId) {
    return sessions.find((item) => item.sessionId === sessionId) ?? null;
  }

  const latestSessionId = window.localStorage.getItem(LATEST_SESSION_KEY);
  return sessions.find((item) => item.sessionId === latestSessionId) ?? sessions[0] ?? null;
}

export function saveInterviewSession(record: InterviewSessionRecord) {
  if (typeof window === "undefined") return;

  const existingSessions = readInterviewSessions();
  const nextSessions = [
    record,
    ...existingSessions.filter((item) => item.sessionId !== record.sessionId),
  ].slice(0, MAX_SESSIONS);

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(nextSessions));
  window.localStorage.setItem(LATEST_SESSION_KEY, record.sessionId);
  window.dispatchEvent(new Event(SESSION_EVENT));
}

export function subscribeInterviewSessions(onStoreChange: () => void) {
  if (typeof window === "undefined") {
    return () => undefined;
  }

  const handleStorage = () => {
    onStoreChange();
  };

  window.addEventListener("storage", handleStorage);
  window.addEventListener(SESSION_EVENT, handleStorage);

  return () => {
    window.removeEventListener("storage", handleStorage);
    window.removeEventListener(SESSION_EVENT, handleStorage);
  };
}
