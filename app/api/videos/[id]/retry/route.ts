import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { requireOwner } from "@/lib/supabase/requireOwner";

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const denied = await requireOwner();
  if (denied) return denied;

  const { id } = await params;

  // Get the video's youtube_id
  const { data: video } = await supabaseAdmin
    .from("videos").select("youtube_id").eq("id", id).single();
  if (!video) return NextResponse.json({ error: "Video not found" }, { status: 404 });

  // Find the latest queue item for this video
  const { data: queueItem } = await supabaseAdmin
    .from("queue").select("id, status")
    .eq("youtube_id", video.youtube_id)
    .order("created_at", { ascending: false })
    .limit(1).single();

  if (!queueItem) return NextResponse.json({ error: "No queue item found" }, { status: 404 });

  const { status } = queueItem;

  if (status === "error_ytdlp") {
    // Restart from the beginning
    await supabaseAdmin.from("queue").update({
      status: "pending",
      retries: 0,
      last_error: null,
      retry_after: null,
    }).eq("id", queueItem.id);
  } else if (status === "error_whisper") {
    // Audio already in R2 — skip re-download, retry from whisper
    await supabaseAdmin.from("queue").update({
      status: "yt_dlp_done",
      whisper_retries: 0,
      last_error: null,
      retry_after: null,
    }).eq("id", queueItem.id);
  } else {
    return NextResponse.json({ error: `Cannot retry status: ${status}` }, { status: 400 });
  }

  return NextResponse.json({ ok: true, retryFrom: status === "error_ytdlp" ? "download" : "transcription" });
}
