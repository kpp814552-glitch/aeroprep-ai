import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const supabase = createClient(request);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ isMember: false });

  const { data: profile } = await supabase
    .from("users")
    .select("member_until, pending_plan")
    .eq("id", user.id)
    .single();

  if (!profile) return NextResponse.json({ isMember: false });

  const memberUntil = profile.member_until;
  const now = new Date().toISOString();
  const isMember = !!memberUntil && memberUntil > now;

  // Calculate planId: prefer pending_plan, fall back to matching member_until duration
  let planId = profile.pending_plan || null;
  if (!planId && isMember && memberUntil) {
    const days = Math.round((new Date(memberUntil).getTime() - Date.now()) / 86400000);
    if (days >= 27) planId = "30day";
    else if (days >= 2) planId = "3day";
    else planId = "1day";
  }

  return NextResponse.json({
    isMember,
    memberUntil: memberUntil || null,
    planId,
  });
}
