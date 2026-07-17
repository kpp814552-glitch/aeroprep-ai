import type { PlanId } from "@/lib/member/member-storage";

const MEMBER_RECORDS_KEY = "aeroprep_member_records";
export interface AdminMemberRecord {
  email: string; plan: string; activatedAt: string; expiresAt: string; addedBy: string;
}

export function getMemberRecords(): AdminMemberRecord[] {
  if (typeof window === "undefined") return [];
  try { return JSON.parse(localStorage.getItem(MEMBER_RECORDS_KEY) || "[]"); } catch { return []; }
}

export function addMemberDays(email: string, days: number, adminEmail: string): AdminMemberRecord | string {
  if (!email || !email.includes("@")) return "请输入有效的邮箱地址";
  if (days < 1 || days > 3650) return "天数范围为 1-3650";

  const records = getMemberRecords();
  const existing = records.find((r) => r.email === email.toLowerCase());
  const now = new Date();
  let start = now;
  if (existing) {
    const existExpiry = new Date(existing.expiresAt);
    if (existExpiry > now) start = existExpiry;
  }
  const newExpiry = new Date(start.getTime() + days * 86400000);
  const record: AdminMemberRecord = {
    email: email.toLowerCase(),
    plan: `手动添加${days}天`,
    activatedAt: now.toISOString(),
    expiresAt: newExpiry.toISOString(),
    addedBy: adminEmail,
  };
  if (existing) Object.assign(existing, record);
  else records.push(record);
  localStorage.setItem(MEMBER_RECORDS_KEY, JSON.stringify(records));
  return record;
}

export function removeMemberRecord(email: string): void {
  const records = getMemberRecords().filter((r) => r.email !== email.toLowerCase());
  localStorage.setItem(MEMBER_RECORDS_KEY, JSON.stringify(records));
}
