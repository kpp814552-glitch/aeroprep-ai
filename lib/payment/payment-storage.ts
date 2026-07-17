export type PaymentRecord = {
  orderId: string; planId: string; amount: number; status: "pending" | "confirmed";
  createdAt: string; confirmedAt?: string;
};

const KEY = "aeroprep_payments";
export function getPayments(): PaymentRecord[] {
  if (typeof window === "undefined") return [];
  try { return JSON.parse(localStorage.getItem(KEY) || "[]"); } catch { return []; }
}

export function createPayment(planId: string, amount: number): PaymentRecord {
  const records = getPayments();
  const r: PaymentRecord = { orderId: `AP${Date.now()}${Math.random().toString(36).slice(2,6).toUpperCase()}`, planId, amount, status: "pending", createdAt: new Date().toISOString() };
  records.unshift(r); localStorage.setItem(KEY, JSON.stringify(records)); return r;
}

export function confirmPayment(orderId: string): boolean {
  const records = getPayments(); const idx = records.findIndex((r) => r.orderId === orderId && r.status === "pending");
  if (idx === -1) return false;
  records[idx].status = "confirmed"; records[idx].confirmedAt = new Date().toISOString();
  localStorage.setItem(KEY, JSON.stringify(records)); return true;
}
