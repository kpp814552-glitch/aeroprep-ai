import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const all = url.searchParams.get("all") === "true";
  
  const supabase = createClient(request);
  const { data: { user } } = await supabase.auth.getUser();
  
  if (all) {
    // Return all members (for admin panel)
    if (!user) return NextResponse.json({ members: [] });
    const { data: adminCheck } = await supabase.from("users").select("is_admin").eq("id", user.id).single();
    if (!adminCheck?.is_admin) return NextResponse.json({ members: [] });
    
    const { data: members } = await supabase
      .from("users")
      .select("id, email, username, member_until")
      .not("member_until", "is", null)
      .order("member_until", { ascending: false });
    
    return NextResponse.json({ members: members || [] });
  }
  
  // Normal: return current user status
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
