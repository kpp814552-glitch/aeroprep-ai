import type {
  FavoriteRecord,
  HistoryRecord,
  ProgressRecord,
  ProgressStatus,
} from "./types";

const FAVORITES_KEY = "aeroprep-learning-v2-favorites";
const HISTORY_KEY = "aeroprep-learning-v2-history";
const PROGRESS_KEY = "aeroprep-learning-v2-progress";
const STORAGE_EVENT = "aeroprep-learning-v2-updated";

function readArray<T>(key: string): T[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as T[]) : [];
  } catch {
    return [];
  }
}

function writeArray<T>(key: string, value: T[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(key, JSON.stringify(value));
  window.dispatchEvent(new Event(STORAGE_EVENT));
}

export function getFavorites(): FavoriteRecord[] {
  return readArray<FavoriteRecord>(FAVORITES_KEY);
}

export function isFavorited(itemId: string): boolean {
  return getFavorites().some((item) => item.itemId === itemId);
}

export function toggleFavorite(record: FavoriteRecord): FavoriteRecord[] {
  const favorites = getFavorites();
  const exists = favorites.some((item) => item.itemId === record.itemId);
  const next = exists
    ? favorites.filter((item) => item.itemId !== record.itemId)
    : [record, ...favorites].slice(0, 200);
  writeArray(FAVORITES_KEY, next);
  return next;
}

export function getHistory(): HistoryRecord[] {
  return readArray<HistoryRecord>(HISTORY_KEY);
}

export function addHistory(record: HistoryRecord): HistoryRecord[] {
  const next = [
    record,
    ...getHistory().filter((item) => item.itemId !== record.itemId),
  ].slice(0, 100);
  writeArray(HISTORY_KEY, next);
  return next;
}

export function clearHistory() {
  writeArray(HISTORY_KEY, []);
}

export function getProgress(): ProgressRecord[] {
  return readArray<ProgressRecord>(PROGRESS_KEY);
}

export function getProgressStatus(itemId: string): ProgressStatus | null {
  return getProgress().find((item) => item.itemId === itemId)?.status ?? null;
}

export function setProgress(itemId: string, status: ProgressStatus): ProgressRecord[] {
  const next = [
    { itemId, status, updatedAt: new Date().toISOString() },
    ...getProgress().filter((item) => item.itemId !== itemId),
  ].slice(0, 300);
  writeArray(PROGRESS_KEY, next);
  return next;
}

export function subscribeLearningState(onChange: () => void) {
  if (typeof window === "undefined") return () => undefined;
  window.addEventListener(STORAGE_EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(STORAGE_EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}
