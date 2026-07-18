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

  return NextResponse.json({
    isMember,
    memberUntil: memberUntil || null,
    planId: profile.pending_plan || null,
  });
}
