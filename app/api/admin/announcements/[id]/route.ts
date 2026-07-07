import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

async function checkAdmin(request: NextRequest) {
  const supabase = createClient(request);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized", status: 401 };
  const { data: profile } = await supabase.from("users").select("is_admin").eq("id", user.id).single();
  if (!profile?.is_admin) return { error: "Forbidden", status: 403 };
  return { supabase, user };
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await checkAdmin(request);
  if ("error" in ctx) return NextResponse.json({ error: ctx.error }, { status: ctx.status });
  const { supabase } = ctx;
  const id = (await params).id;

  let body;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  const updates: Record<string, unknown> = {};
  if (body.title?.trim()) updates.title = body.title.trim();
  if (body.content?.trim()) updates.content = body.content.trim();
  if (body.type !== undefined) updates.type = body.type;
  if (body.is_published !== undefined) updates.is_published = body.is_published;
  updates.updated_at = new Date().toISOString();

  const { data, error } = await supabase.from("announcements").update(updates).eq("id", id).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ announcement: data });
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await checkAdmin(request);
  if ("error" in ctx) return NextResponse.json({ error: ctx.error }, { status: ctx.status });
  const { supabase } = ctx;
  const id = (await params).id;

  const { error } = await supabase.from("announcements").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
