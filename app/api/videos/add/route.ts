import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { requireOwner } from "@/lib/supabase/requireOwner";

function extractYoutubeId(input: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/,
    /^([a-zA-Z0-9_-]{11})$/,
  ];
  for (const re of patterns) {
    const m = input.trim().match(re);
    if (m) return m[1];
  }
  return null;
}

export async function POST(req: NextRequest) {
  const denied = await requireOwner();
  if (denied) return denied;

  const { url } = await req.json();
  if (!url) return NextResponse.json({ error: "Missing url" }, { status: 400 });

  const youtube_id = extractYoutubeId(url);
  if (!youtube_id) return NextResponse.json({ error: "Invalid YouTube URL or ID" }, { status: 400 });

  // Skip if already exists
  const { data: existing } = await supabaseAdmin
    .from("videos").select("id, title").eq("youtube_id", youtube_id).single();
  if (existing) {
    return NextResponse.json({ skipped: true, youtube_id, title: existing.title, id: existing.id });
  }

  // Skip if already queued
  const { data: queued } = await supabaseAdmin
    .from("queue").select("id, status").eq("youtube_id", youtube_id).single();
  if (queued) {
    return NextResponse.json({ skipped: true, youtube_id, queued: true, status: queued.status });
  }

  await supabaseAdmin.from("queue").insert({
    youtube_id,
    source: "manual",
    source_id: null,
    status: "pending",
  });

  return NextResponse.json({ ok: true, youtube_id });
}
