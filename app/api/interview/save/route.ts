import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { NextRequest } from "next/server";

export async function POST(request: NextRequest) {
  const supabase = createClient(request);
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { data: interview, error } = await supabase
    .from("interviews")
    .insert({
      user_id: user.id,
      role: body.role || "",
      role_label: body.role_label || "",
      company: body.company || "",
      mode: body.mode || "",
      persona: body.persona || "",
      score: body.score || 0,
      evaluation: body.evaluation || "",
      strengths: body.strengths || [],
      weaknesses: body.weaknesses || [],
      started_at: body.started_at || new Date().toISOString(),
      ended_at: body.ended_at || new Date().toISOString(),
      duration_seconds: body.duration_seconds || 0,
      total_turns: body.total_turns || 0,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Update user profile stats
  const { data: userProfile } = await supabase
    .from("users")
    .select("interview_count, highest_score, average_score, total_duration, continuous_days, last_login")
    .eq("id", user.id)
    .single();

  if (userProfile) {
    const newCount = (userProfile.interview_count || 0) + 1;
    const prevTotal = (userProfile.average_score || 0) * (userProfile.interview_count || 0);
    const newAvg = newCount > 0 ? ((prevTotal + (body.score as number || 0)) / newCount) : 0;

    await supabase
      .from("users")
      .update({
        interview_count: newCount,
        highest_score: Math.max(userProfile.highest_score || 0, body.score as number || 0),
        average_score: Math.round(newAvg * 10) / 10,
        total_duration: (userProfile.total_duration || 0) + (body.duration_seconds as number || 0),
        last_login: new Date().toISOString(),
      })
      .eq("id", user.id);
  }

  return NextResponse.json({ success: true, interview });
}
