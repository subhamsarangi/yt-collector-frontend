import { NextResponse } from "next/server";
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

export async function GET() {
  // Pick next pending item
  const { data: item } = await supabaseAdmin
    .from("queue")
    .select("*")
    .eq("status", "pending")
    .order("created_at", { ascending: true })
    .limit(1)
    .single();

  if (!item) return NextResponse.json({ ok: true, message: "Queue empty" });

  // Mark as processing
  await supabaseAdmin
    .from("queue")
    .update({ status: "yt_dlp_processing" })
    .eq("id", item.id);

  try {
    const result = await ociPost("/video", { youtube_id: item.youtube_id });

    // Save metadata + URLs to videos table (upsert)
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
        ? new Date(result.metadata.upload_date).toISOString()
        : null,
    }, { onConflict: "youtube_id" });

    await supabaseAdmin
      .from("queue")
      .update({ status: "yt_dlp_done" })
      .eq("id", item.id);

    // Trigger Whisper
    const callbackUrl = `${process.env.VERCEL_URL || "http://localhost:3000"}/api/whisper/callback`;
    await fetch(`${OCI}/whisper/trigger`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${OCI_KEY}` },
      body: JSON.stringify({
        queue_id: item.id,
        audio_url: result.audio_url,
        callback_url: callbackUrl,
      }),
    }).catch(() => null); // Whisper trigger is fire-and-forget

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
