import type { PlanId } from "@/lib/member/member-storage";

const ADMIN_KEY = "aeroprep_admin_emails";
const MEMBER_RECORDS_KEY = "aeroprep_member_records";

export function getAdminEmails(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(ADMIN_KEY);
    return raw ? JSON.parse(raw) : ["admin@aeroprep.top"];
  } catch { return ["admin@aeroprep.top"]; }
}

export function isAdminEmail(email?: string | null): boolean {
  if (!email) return false;
  return getAdminEmails().includes(email.toLowerCase());
}

export function addAdminEmail(email: string): void {
  const list = getAdminEmails();
  const e = email.toLowerCase().trim();
  if (!e) return;
  if (!list.includes(e)) localStorage.setItem(ADMIN_KEY, JSON.stringify([...list, e]));
}

export function removeAdminEmail(email: string): void {
  const list = getAdminEmails().filter((x) => x !== email.toLowerCase().trim());
  localStorage.setItem(ADMIN_KEY, JSON.stringify(list));
}

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
