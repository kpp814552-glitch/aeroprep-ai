import type { FavoriteRecord, HistoryRecord } from "./types";

const FAV_KEY = "aeroprep-learning-favorites";
const HIST_KEY = "aeroprep-learning-history";

export function getFavorites(): FavoriteRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(FAV_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

export function toggleFavorite(rec: FavoriteRecord): FavoriteRecord[] {
  const favs = getFavorites();
  const exists = favs.find((f) => f.itemId === rec.itemId);
  const next = exists ? favs.filter((f) => f.itemId !== rec.itemId) : [rec, ...favs].slice(0, 200);
  localStorage.setItem(FAV_KEY, JSON.stringify(next));
  return next;
}

export function isFavorited(itemId: string): boolean {
  return getFavorites().some((f) => f.itemId === itemId);
}

export function getHistory(): HistoryRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(HIST_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

export function addHistory(rec: HistoryRecord): void {
  const hist = getHistory();
  const next = [rec, ...hist.filter((h) => h.itemId !== rec.itemId)].slice(0, 100);
  localStorage.setItem(HIST_KEY, JSON.stringify(next));
}

export function clearHistory(): void {
  localStorage.removeItem(HIST_KEY);
}
