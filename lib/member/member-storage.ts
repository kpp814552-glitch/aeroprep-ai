export type PlanId = "1day" | "3day" | "30day";

export type PlanInfo = {
  id: PlanId;
  label: string;
  price: string;
  priceNum: number;
  days: number;
  desc: string;
  recommended?: boolean;
};

export const PLANS: PlanInfo[] = [
  { id: "1day", label: "1天限时会员", price: "3.99元", priceNum: 3.99, days: 1, desc: "24小时全站功能无限制开放" },
  { id: "3day", label: "3天限时会员", price: "5.99元", priceNum: 5.99, days: 3, desc: "72小时全站功能无限制开放" },
  { id: "30day", label: "30天月度会员", price: "9.99元", priceNum: 9.99, days: 30, desc: "30天全站不限次使用", recommended: true },
];

export type MemberInfo = { plan: PlanId; activatedAt: string; expiresAt: string } | null;

const MEMBER_KEY = "aeroprep_member";
const COUNT_KEY = "aeroprep_free_count";

export function getMember(): MemberInfo {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(MEMBER_KEY);
    if (!raw) return null;
    const m = JSON.parse(raw) as NonNullable<MemberInfo>;
    if (new Date(m.expiresAt) < new Date()) {
      localStorage.removeItem(MEMBER_KEY);
      return null;
    }
    return m;
  } catch { return null; }
}

export function activateMember(planId: PlanId): MemberInfo {
  const plan = PLANS.find((p) => p.id === planId);
  if (!plan) return null;
  const now = new Date();
  const expires = new Date(now.getTime() + plan.days * 86400000);
  const info: NonNullable<MemberInfo> = { plan: planId, activatedAt: now.toISOString(), expiresAt: expires.toISOString() };
  localStorage.setItem(MEMBER_KEY, JSON.stringify(info));
  localStorage.removeItem(COUNT_KEY);
  return info;
}

export function activateFromServer(expiresAt: string, planId?: PlanId): MemberInfo {
  if (new Date(expiresAt) < new Date()) return null;
  const planIdValue: PlanId = (planId && PLANS.some((p) => p.id === planId)) ? planId : "30day";
  const info: NonNullable<MemberInfo> = {
    plan: planIdValue,
    activatedAt: new Date().toISOString(),
    expiresAt: expiresAt,
  };
  localStorage.setItem(MEMBER_KEY, JSON.stringify(info));
  localStorage.removeItem(COUNT_KEY);
  return info;
}

export function isMember(): boolean {
  return getMember() !== null;
}

export function getExpiresAt(): string | null {
  const m = getMember();
  return m ? m.expiresAt : null;
}

export function getMemberRemainingSeconds(): number {
  const m = getMember();
  if (!m) return 0;
  return Math.max(0, Math.floor((new Date(m.expiresAt).getTime() - Date.now()) / 1000));
}

// Free user interview count
export function getFreeInterviewCount(): number {
  if (typeof window === "undefined") return 0;
  try { return parseInt(localStorage.getItem(COUNT_KEY) || "0", 10); } catch { return 0; }
}

export function incrementFreeInterviewCount(): number {
  const next = getFreeInterviewCount() + 1;
  localStorage.setItem(COUNT_KEY, String(next));
  return next;
}

export function getRemainingFreeInterviews(): number {
  return Math.max(0, 3 - getFreeInterviewCount());
}

export function canStartInterview(): boolean {
  if (isMember()) return true;
  return getFreeInterviewCount() < 3;
}

/**
 * Sync membership from server (Supabase users.member_until)
 * Call this on page load or after login to check if admin has approved membership.
 */
export async function syncServerMember(): Promise<boolean> {
  try {
    const res = await fetch("/api/member/status");
    if (!res.ok) return false;
    const data = await res.json();
    if (data.isMember && data.memberUntil) {
      const existing = getMember();
      // Only activate if local is expired or missing
      if (!existing || new Date(existing.expiresAt) < new Date()) {
        activateFromServer(data.memberUntil, (data.planId && PLANS.some(p => p.id === data.planId) ? data.planId as PlanId : undefined));
        return true;
      }
    }
    return false;
  } catch {
    return false;
  }
}
