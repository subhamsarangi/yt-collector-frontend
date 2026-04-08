import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";

const OCI = process.env.OCI_API_URL!;
const OCI_KEY = process.env.OCI_API_KEY!;
const MAX_RETRIES = 3;

async function ociPost(path: string, body: object) {
  const res = await fetch(`${OCI}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${OCI_KEY}` },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`OCI ${path} failed: ${res.status}`);
  return res.json();
}

// Called by Supabase webhook on queue INSERT, or manually via GET for testing
export async function GET(req: NextRequest) {
  return processQueue();
}

export async function POST(req: NextRequest) {
  // Validate Supabase webhook secret
  const secret = req.headers.get("x-webhook-secret");
  if (secret !== process.env.QUEUE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return processQueue();
}

async function processQueue() {
  // If anything is already being processed, skip — one job at a time
  const { data: inProgress } = await supabaseAdmin
    .from("queue")
    .select("id")
    .in("status", ["yt_dlp_processing", "yt_dlp_done", "whisper_processing", "whisper_done"])
    .limit(1)
    .single();

  if (inProgress) return NextResponse.json({ ok: true, message: "Job already in progress" });

  const { data: item } = await supabaseAdmin
    .from("queue")
    .select("*")
    .eq("status", "pending")
    .order("created_at", { ascending: true })
    .limit(1)
    .single();

  if (!item) return NextResponse.json({ ok: true, message: "Queue empty" });

  await supabaseAdmin
    .from("queue")
    .update({ status: "yt_dlp_processing" })
    .eq("id", item.id);

  const ytdlpStartedAt = new Date().toISOString();

  // Create processing log row
  await supabaseAdmin.from("processing_logs").insert({
    queue_id: item.id,
    youtube_id: item.youtube_id,
    ytdlp_started_at: ytdlpStartedAt,
  });

  try {
    const result = await ociPost("/video", { youtube_id: item.youtube_id });
    const ytdlpDoneAt = new Date().toISOString();

    await supabaseAdmin.from("videos").upsert({
      youtube_id: item.youtube_id,
      title: result.metadata.title,
      description: result.metadata.description,
      channel_id: item.source === "channel" ? item.source_id : null,
      topic_id: item.source === "topic" ? item.source_id : null,
      metadata: result.metadata,
      thumbnail_r2_url: result.thumbnail_url,
      audio_r2_url: result.audio_url,
      published_at: result.metadata.upload_date
        ? new Date(
            result.metadata.upload_date.replace(/^(\d{4})(\d{2})(\d{2})$/, "$1-$2-$3")
          ).toISOString()
        : null,
    }, { onConflict: "youtube_id" });

    await supabaseAdmin
      .from("queue")
      .update({ status: "yt_dlp_done" })
      .eq("id", item.id);

    // Record yt-dlp completion time
    await supabaseAdmin
      .from("processing_logs")
      .update({ ytdlp_done_at: ytdlpDoneAt })
      .eq("queue_id", item.id);

    await supabaseAdmin
      .from("queue")
      .update({ status: "whisper_processing" })
      .eq("id", item.id);

  } catch (e: unknown) {
    const retries = (item.retries || 0) + 1;
    const message = e instanceof Error ? e.message : String(e);
    await supabaseAdmin.from("queue").update({
      status: retries >= MAX_RETRIES ? "error_ytdlp" : "pending",
      retries,
      last_error: message,
    }).eq("id", item.id);
  }

  return NextResponse.json({ ok: true });
}
