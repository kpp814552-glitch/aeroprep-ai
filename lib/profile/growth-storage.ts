import type { InterviewSessionRecord } from "@/lib/interview/types";

const GROWTH_STORAGE_KEY = "aeroprep-ai-growth-records";
const GROWTH_EVENT = "aeroprep-ai-growth-updated";
const MAX_GROWTH_EVENTS = 120;

export type GrowthEventType =
  | "interview_started"
  | "interview_completed"
  | "question_answered"
  | "tts_played";

export type GrowthEventRecord = {
  id: string;
  type: GrowthEventType;
  sessionId: string;
  timestamp: string;
  company?: string;
  roleLabel?: string;
  mode?: string;
  score?: number;
  question?: string;
};

function safeParse(rawValue: string | null) {
  if (!rawValue) return [];

  try {
    const parsed = JSON.parse(rawValue);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function readGrowthEvents() {
  if (typeof window === "undefined") return [] as GrowthEventRecord[];

  return safeParse(window.localStorage.getItem(GROWTH_STORAGE_KEY)) as GrowthEventRecord[];
}

export function saveGrowthEvent(event: Omit<GrowthEventRecord, "id" | "timestamp">) {
  if (typeof window === "undefined") return;

  const existingEvents = readGrowthEvents();
  const nextEvent: GrowthEventRecord = {
    ...event,
    id: `growth-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    timestamp: new Date().toISOString(),
  };

  const nextEvents = [nextEvent, ...existingEvents].slice(0, MAX_GROWTH_EVENTS);
  window.localStorage.setItem(GROWTH_STORAGE_KEY, JSON.stringify(nextEvents));
  window.dispatchEvent(new Event(GROWTH_EVENT));
}

export function saveInterviewCompletionGrowth(record: InterviewSessionRecord) {
  saveGrowthEvent({
    type: "interview_completed",
    sessionId: record.sessionId,
    company: record.company,
    roleLabel: record.roleLabel,
    mode: record.mode,
    score: record.report?.totalScore,
  });
}

export function subscribeGrowthEvents(onStoreChange: () => void) {
  if (typeof window === "undefined") {
    return () => undefined;
  }

  const handleStorage = () => {
    onStoreChange();
  };

  window.addEventListener("storage", handleStorage);
  window.addEventListener(GROWTH_EVENT, handleStorage);

  return () => {
    window.removeEventListener("storage", handleStorage);
    window.removeEventListener(GROWTH_EVENT, handleStorage);
  };
}
