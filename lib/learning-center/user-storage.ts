/**
 * 用户学习笔记 —— localStorage 持久化存储
 * 支持 CRUD、岗位标签、招聘方式分类
 */

export type UserNote = {
  id: string;
  title: string;
  content: string;
  role?: string;
  tags?: string[];
  category?: string;
  createdAt: string;
  updatedAt: string;
};

const STORAGE_KEY = "aeroprep-user-notes";

export function getUserNotes(): UserNote[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveUserNote(
  data: Omit<UserNote, "id" | "createdAt" | "updatedAt">
): UserNote {
  const notes = getUserNotes();
  const note: UserNote = {
    ...data,
    id: `user-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  notes.unshift(note);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
  return note;
}

export function deleteUserNote(id: string): void {
  const notes = getUserNotes().filter((n) => n.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
}

export function updateUserNote(
  id: string,
  updates: Partial<Pick<UserNote, "title" | "content" | "role" | "tags" | "category">>
): UserNote | null {
  const notes = getUserNotes();
  const idx = notes.findIndex((n) => n.id === id);
  if (idx < 0) return null;
  notes[idx] = { ...notes[idx], ...updates, updatedAt: new Date().toISOString() };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
  return notes[idx];
}

export function getUserNote(id: string): UserNote | undefined {
  return getUserNotes().find((n) => n.id === id);
}
