import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { requireOwner } from "@/lib/supabase/requireOwner";

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const denied = await requireOwner();
  if (denied) return denied;

  const { id } = await params;

  const { data: video } = await supabaseAdmin
    .from("videos")
    .select("youtube_id, transcript, channel_id, topic_id")
    .eq("id", id)
    .single();

  if (!video) return NextResponse.json({ error: "Video not found" }, { status: 404 });
  if (video.transcript) return NextResponse.json({ error: "Already has a transcript" }, { status: 400 });

  // Check for an existing queue item
  const { data: existing } = await supabaseAdmin
    .from("queue")
    .select("id, status")
    .eq("youtube_id", video.youtube_id)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  const activeStatuses = new Set([
    "pending", "metadata_processing", "metadata_done",
    "audio_processing", "audio_done", "transcribing", "summarizing",
  ]);

  if (existing && activeStatuses.has(existing.status)) {
    return NextResponse.json({ error: "Already processing" }, { status: 409 });
  }

  if (existing) {
    // Reuse the existing queue row — resume from metadata_done so it
    // downloads audio then transcribes + summarizes
    await supabaseAdmin
      .from("queue")
      .update({
        status: "metadata_done",
        retries: 0,
        whisper_retries: 0,
        last_error: null,
        retry_after: null,
      })
      .eq("id", existing.id);
  } else {
    // No queue row at all — insert fresh, starting from metadata_done
    // (metadata was already fetched when the channel video was first processed)
    const source = video.topic_id ? "topic" : "channel";
    const source_id = video.topic_id ?? video.channel_id;

    const { data: queueRow, error: insertError } = await supabaseAdmin
      .from("queue")
      .insert({
        youtube_id: video.youtube_id,
        source,
        source_id,
        status: "metadata_done",
      })
      .select("id")
      .single();

    if (insertError || !queueRow) {
      return NextResponse.json({ error: "Failed to create queue item" }, { status: 500 });
    }

    // Seed a processing log so the UI has something to show
    await supabaseAdmin.from("processing_logs").insert({
      queue_id: queueRow.id,
      youtube_id: video.youtube_id,
      steps: [{ ts: new Date().toISOString(), text: "Transcription requested manually", ok: true }],
    });
  }

  return NextResponse.json({ ok: true });
}
