// ============================================================
// 面试记录跨设备同步（本机 localStorage ⇄ 服务端 interviews 表）
// ------------------------------------------------------------
// 报告详情原先只存在浏览器里，换设备或清缓存就看不到历史报告。
// 这里把服务端的完整报告取回来，并写回本机缓存，页面逻辑无需改动。
// ============================================================

import type { InterviewReport, InterviewRole, InterviewSessionRecord, InterviewTurn } from "./types";
import { readInterviewSessions, saveInterviewSession } from "./session-storage";

export type ServerInterviewRow = {
  id?: string;
  session_id?: string | null;
  role?: string | null;
  role_label?: string | null;
  company?: string | null;
  mode?: string | null;
  persona?: string | null;
  duration_seconds?: number | null;
  started_at?: string | null;
  created_at?: string | null;
  report?: InterviewReport | null;
  turns?: InterviewTurn[] | null;
};

export function rowToSessionRecord(row: ServerInterviewRow | null | undefined): InterviewSessionRecord | null {
  if (!row?.session_id) return null;

  return {
    sessionId: row.session_id,
    company: row.company ?? "",
    role: (row.role as InterviewRole) ?? "pilot",
    roleLabel: row.role_label ?? "",
    mode: row.mode ?? "校招",
    persona: row.persona ?? "专业型HR",
    interviewer: "",
    voiceProviderName: null,
    elapsedSeconds: row.duration_seconds ?? 0,
    turns: Array.isArray(row.turns) ? row.turns : [],
    createdAt: row.started_at ?? row.created_at ?? new Date().toISOString(),
    report: row.report ?? undefined,
  };
}

/** 取单场面试（含完整报告）；本机没有时用它恢复 */
export async function fetchServerSession(sessionId: string): Promise<InterviewSessionRecord | null> {
  if (!sessionId) return null;
  try {
    const res = await fetch(`/api/interview/history?sessionId=${encodeURIComponent(sessionId)}`, {
      cache: "no-store",
    });
    if (!res.ok) return null;
    const data = await res.json();
    const row = Array.isArray(data?.records) ? (data.records[0] as ServerInterviewRow) : null;
    const record = rowToSessionRecord(row);
    return record?.report ? record : null;
  } catch {
    return null;
  }
}

/**
 * 把服务端的历史（含报告）合并进本机缓存。
 * 返回新增条数；任何失败都静默忽略，绝不影响本机已有的记录。
 */
export async function syncServerSessions(limit = 20, maxDetails = 10): Promise<number> {
  try {
    const res = await fetch(`/api/interview/history?limit=${limit}`, { cache: "no-store" });
    if (!res.ok) return 0;
    const data = await res.json();
    if (!data?.migrated) return 0; // 迁移还没执行，退回只读本机

    const rows = Array.isArray(data.records) ? (data.records as ServerInterviewRow[]) : [];
    const localIds = new Set(readInterviewSessions().map((item) => item.sessionId));
    const missing = rows.filter((row) => row.session_id && !localIds.has(row.session_id));

    let added = 0;
    for (const row of missing.slice(0, maxDetails)) {
      const record = await fetchServerSession(row.session_id as string);
      if (record) {
        saveInterviewSession(record); // 触发 storage 事件，页面自动刷新
        added += 1;
      }
    }
    return added;
  } catch {
    return 0;
  }
}
