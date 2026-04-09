import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import Groq from "groq-sdk";
import { deleteFromR2 } from "@/lib/r2";

export const maxDuration = 300; // Match Vercel cron max; internal 55s soft timeout handles regular calls

const OCI = process.env.OCI_API_URL!;
const OCI_KEY = process.env.OCI_API_KEY!;
const MAX_RETRIES = 3;

async function ociPost(path: string, body: object) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 240000); // 4 min max for OCI
  try {
    const res = await fetch(`${OCI}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${OCI_KEY}` },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    if (!res.ok) throw new Error(`OCI ${path} failed: ${res.status}`);
    return res.json();
  } finally {
    clearTimeout(timer);
  }
}

async function transcribeWithGroq(audioUrl: string): Promise<string> {
  const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

  // Download audio from R2 with timeout
  const audioController = new AbortController();
  const audioTimer = setTimeout(() => audioController.abort(), 30000); // 30s max download
  let audioRes: Response;
  try {
    audioRes = await fetch(audioUrl, { signal: audioController.signal });
  } finally {
    clearTimeout(audioTimer);
  }
  if (!audioRes.ok) throw new Error(`Failed to fetch audio: ${audioRes.status}`);

  const contentLength = audioRes.headers.get("content-length");
  if (contentLength && parseInt(contentLength) > 25 * 1024 * 1024) {
    throw new Error(`Audio file too large for Groq (${Math.round(parseInt(contentLength) / 1024 / 1024)}MB > 25MB)`);
  }

  const audioBlob = await audioRes.blob();

  if (audioBlob.size > 25 * 1024 * 1024) {
    throw new Error(`Audio file too large for Groq (${Math.round(audioBlob.size / 1024 / 1024)}MB > 25MB)`);
  }
  const audioFile = new File([audioBlob], "audio.mp3", { type: "audio/mpeg" });

  const result = await groq.audio.transcriptions.create({
    file: audioFile,
    model: "whisper-large-v3",
    response_format: "verbose_json",
    language: "en",
  });

  // Format as timestamped transcript
  type Segment = { start: number; text: string };
  const segments = (result as { segments?: Segment[] }).segments ?? [];
  if (!segments.length) return result.text ?? "";

  return segments.map((seg: Segment) => {
    const start = Math.floor(seg.start);
    const m = Math.floor(start / 60).toString().padStart(2, "0");
    const s = (start % 60).toString().padStart(2, "0");
    return `[${m}:${s}] ${seg.text.trim()}`;
  }).join("\n");
}

const SELF_URL = process.env.VERCEL_URL
  ? `https://${process.env.VERCEL_URL}`
  : process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

function triggerNextItem() {
  fetch(`${SELF_URL}/api/cron/queue-runner`, {
    method: "POST",
    headers: { "x-webhook-secret": process.env.QUEUE_WEBHOOK_SECRET! },
  }).catch(() => null);
}
export async function GET() {
  return processQueue();
}

export async function POST(req: NextRequest) {
  const secret = req.headers.get("x-webhook-secret");
  if (secret !== process.env.QUEUE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return processQueue();
}

async function processQueue() {
  // One job at a time
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

  // Wrap in a 55s timeout so we never silently die
  const timeout = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error("Function timeout after 55s — video may be too long")), 55000)
  );

  try {
    await Promise.race([processItem(item), timeout]);
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e);
    const retries = (item.retries || 0) + 1;
    await supabaseAdmin.from("queue").update({
      status: retries >= MAX_RETRIES ? "error_ytdlp" : "pending",
      retries,
      last_error: message,
    }).eq("id", item.id);
    triggerNextItem();
  }

  return NextResponse.json({ ok: true });
}

async function processItem(item: Record<string, unknown>) {
  await supabaseAdmin.from("queue").update({ status: "yt_dlp_processing" }).eq("id", item.id);

  const ytdlpStartedAt = new Date().toISOString();
  await supabaseAdmin.from("processing_logs").insert({
    queue_id: item.id,
    youtube_id: item.youtube_id,
    ytdlp_started_at: ytdlpStartedAt,
  });

  // Step 1: Download via OCI
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
      ? new Date(result.metadata.upload_date.replace(/^(\d{4})(\d{2})(\d{2})$/, "$1-$2-$3")).toISOString()
      : null,
  }, { onConflict: "youtube_id" });

  await supabaseAdmin.from("queue").update({ status: "yt_dlp_done" }).eq("id", item.id);
  await supabaseAdmin.from("processing_logs").update({ ytdlp_done_at: ytdlpDoneAt }).eq("queue_id", item.id);

  // Step 2: Transcribe via Groq Whisper
  await supabaseAdmin.from("queue").update({ status: "whisper_processing" }).eq("id", item.id);
  const whisperStartedAt = new Date().toISOString();
  await supabaseAdmin.from("processing_logs").update({ whisper_started_at: whisperStartedAt }).eq("queue_id", item.id);

  const transcript = await transcribeWithGroq(result.audio_url);
  const whisperDoneAt = new Date().toISOString();

  // Step 3: Save transcript, delete audio, mark complete
  await supabaseAdmin.from("videos").update({ transcript, audio_r2_url: null }).eq("youtube_id", item.youtube_id);

  try {
    await deleteFromR2(`audio/${item.youtube_id}.mp3`);
  } catch (e) {
    console.error("R2 delete failed:", e);
  }

  await supabaseAdmin.from("queue").update({ status: "complete" }).eq("id", item.id);
  await supabaseAdmin.from("processing_logs").update({ whisper_done_at: whisperDoneAt }).eq("queue_id", item.id);

  // Trigger next pending item
  triggerNextItem();
}

// [COLAB] The following route was used when Colab handled transcription:
// POST /api/whisper/callback — received transcript from Colab, saved it, deleted audio, marked complete
// It is now superseded by the inline Groq transcription above.
// File kept at: frontend/app/api/whisper/callback/route.ts
