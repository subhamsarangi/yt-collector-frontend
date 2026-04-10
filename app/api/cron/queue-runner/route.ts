import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import Groq from "groq-sdk";
import { deleteFromR2 } from "@/lib/r2";

export const maxDuration = 300; // Vercel max; internal 270s soft timeout leaves 30s buffer

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

  const audioController = new AbortController();
  const audioTimer = setTimeout(() => audioController.abort(), 60000);
  let audioRes: Response;
  try {
    audioRes = await fetch(audioUrl, { signal: audioController.signal });
  } finally {
    clearTimeout(audioTimer);
  }
  if (!audioRes.ok) throw new Error(`Failed to fetch audio: ${audioRes.status}`);

  const audioBlob = await audioRes.blob();
  if (audioBlob.size > 25 * 1024 * 1024) {
    throw new Error(`Audio too large for Groq (${Math.round(audioBlob.size / 1024 / 1024)}MB > 25MB)`);
  }

  const audioFile = new File([audioBlob], "audio.mp3", { type: "audio/mpeg" });
  const result = await groq.audio.transcriptions.create({
    file: audioFile,
    model: "whisper-large-v3-turbo",
    response_format: "verbose_json",
    language: "en",
  });

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
    .in("status", ["yt_dlp_processing", "whisper_processing", "whisper_done"])
    .limit(1)
    .single();

  if (inProgress) return NextResponse.json({ ok: true, message: "Job already in progress" });

  // Pick next pending or resumable item — skip items in retry cooldown
  const { data: item } = await supabaseAdmin
    .from("queue")
    .select("*")
    .in("status", ["pending", "yt_dlp_done"])
    .or("retry_after.is.null,retry_after.lte." + new Date().toISOString())
    .order("created_at", { ascending: true })
    .limit(1)
    .single();

  if (!item) return NextResponse.json({ ok: true, message: "Queue empty" });

  // Wrap in a 55s timeout so we never silently die
  let timeoutHandle: ReturnType<typeof setTimeout>;
  const timeout = new Promise<never>((_, reject) => {
    timeoutHandle = setTimeout(
      () => reject(new Error("Function timeout after 270s")),
      270000
    );
  });

  try {
    await Promise.race([processItem(item), timeout]);
    clearTimeout(timeoutHandle!);
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e);

    // Re-fetch current status — it may have advanced past pending before the timeout
    const { data: current } = await supabaseAdmin
      .from("queue").select("status, retries, whisper_retries").eq("id", item.id).single();

    const currentStatus = current?.status ?? item.status;

    // If already complete, the timeout fired after success — don't overwrite
    if (currentStatus === "complete") return NextResponse.json({ ok: true });

    const isWhisperStage = ["yt_dlp_done", "whisper_processing", "whisper_done"].includes(currentStatus);

    if (isWhisperStage) {
      const whisperRetries = (current?.whisper_retries || 0) + 1;
      const backoffMs = [2, 5, 15][Math.min(whisperRetries - 1, 2)] * 60 * 1000;
      await supabaseAdmin.from("queue").update({
        status: whisperRetries >= MAX_RETRIES ? "error_whisper" : "yt_dlp_done",
        whisper_retries: whisperRetries,
        last_error: message,
        retry_after: whisperRetries < MAX_RETRIES ? new Date(Date.now() + backoffMs).toISOString() : null,
      }).eq("id", item.id);
    } else {
      const retries = (current?.retries || 0) + 1;
      const backoffMs = [2, 5, 15][Math.min(retries - 1, 2)] * 60 * 1000;
      await supabaseAdmin.from("queue").update({
        status: retries >= MAX_RETRIES ? "error_ytdlp" : "pending",
        retries,
        last_error: message,
        retry_after: retries < MAX_RETRIES ? new Date(Date.now() + backoffMs).toISOString() : null,
      }).eq("id", item.id);
    }

    // Append failure step to existing processing log
    const { data: logRow } = await supabaseAdmin
      .from("processing_logs").select("steps").eq("queue_id", item.id).single();
    if (logRow) {
      const updatedSteps = [...((logRow.steps as Array<unknown>) ?? []),
        { ts: new Date().toISOString(), text: `Failed: ${message}`, ok: false }];
      await supabaseAdmin.from("processing_logs").update({ steps: updatedSteps }).eq("queue_id", item.id);
    }
    // Poller will pick up the next item automatically
  }

  return NextResponse.json({ ok: true });
}

async function processItem(item: Record<string, unknown>) {
  const alreadyDownloaded = item.status === "yt_dlp_done";
  const steps: Array<{ ts: string; text: string; ok?: boolean }> = [];
  const step = (text: string, ok = true) => {
    steps.push({ ts: new Date().toISOString(), text, ok });
    console.log(`[queue:${item.youtube_id}] ${text}`);
  };

  const saveSteps = () =>
    supabaseAdmin.from("processing_logs")
      .update({ steps })
      .eq("queue_id", item.id);

  let result: Record<string, unknown>;

  if (alreadyDownloaded) {
    step("Resuming from yt_dlp_done — audio already in R2");
    const { data: video } = await supabaseAdmin
      .from("videos").select("audio_r2_url, metadata").eq("youtube_id", item.youtube_id).single();
    if (!video?.audio_r2_url) throw new Error("yt_dlp_done but audio_r2_url missing — cannot resume");
    result = { audio_url: video.audio_r2_url, metadata: video.metadata };
  } else {
    await supabaseAdmin.from("queue").update({ status: "yt_dlp_processing" }).eq("id", item.id);

    const ytdlpStartedAt = new Date().toISOString();
    const { data: logRow } = await supabaseAdmin.from("processing_logs").insert({
      queue_id: item.id,
      youtube_id: item.youtube_id,
      ytdlp_started_at: ytdlpStartedAt,
      steps: [],
    }).select("id").single();

    step("yt-dlp started — fetching metadata and thumbnail via OCI");
    await saveSteps();

    // Step 1a: Metadata + thumbnail (fast, always completes)
    result = await ociPost("/video", { youtube_id: item.youtube_id });
    const meta = result.metadata as Record<string, unknown>;
    step(`Metadata fetched — title: "${meta.title}", duration: ${meta.duration}s`);

    await supabaseAdmin.from("videos").upsert({
      youtube_id: item.youtube_id,
      title: meta.title,
      description: meta.description,
      channel_id: item.source === "channel" ? item.source_id : null,
      topic_id: item.source === "topic" ? item.source_id : null,
      metadata: result.metadata,
      thumbnail_r2_url: result.thumbnail_url,
      published_at: meta.upload_date
        ? new Date((meta.upload_date as string).replace(/^(\d{4})(\d{2})(\d{2})$/, "$1-$2-$3")).toISOString()
        : null,
    }, { onConflict: "youtube_id" });

    step("Metadata and thumbnail saved — video visible in UI");
    await saveSteps();

    // Channel-sourced videos: metadata only, no audio/transcription
    if (item.source === "channel") {
      await supabaseAdmin.from("queue").update({ status: "complete", retry_after: null }).eq("id", item.id);
      step("Channel video — skipping audio/transcription (metadata only) ✓");
      await supabaseAdmin.from("processing_logs")
        .update({ ytdlp_done_at: new Date().toISOString(), steps })
        .eq("queue_id", item.id);
      void logRow;
      return;
    }

    // Step 1b: Audio download (capped at 38 min via --download-sections)
    const duration = (meta.duration as number) ?? 0;
    step(`Starting audio download... (video is ${Math.round(duration / 60)} min, downloading first 38 min max)`);
    await saveSteps();
    const audioResult = await ociPost("/video/audio", { youtube_id: item.youtube_id });
    const ytdlpDoneAt = new Date().toISOString();
    step(`Audio downloaded and uploaded to R2 (${audioResult.size_mb ?? "?"}MB)`);

    await supabaseAdmin.from("videos")
      .update({ audio_r2_url: audioResult.audio_url })
      .eq("youtube_id", item.youtube_id);

    result = { ...result, audio_url: audioResult.audio_url };

    await supabaseAdmin.from("queue").update({ status: "yt_dlp_done" }).eq("id", item.id);
    await supabaseAdmin.from("processing_logs")
      .update({ ytdlp_done_at: ytdlpDoneAt, steps })
      .eq("queue_id", item.id);

    void logRow; // used implicitly via queue_id
  }

  // Step 2: Transcribe
  await supabaseAdmin.from("queue").update({ status: "whisper_processing" }).eq("id", item.id);
  const whisperStartedAt = new Date().toISOString();
  await supabaseAdmin.from("processing_logs")
    .update({ whisper_started_at: whisperStartedAt })
    .eq("queue_id", item.id);

  step("Whisper transcription started via Groq");
  await saveSteps();

  const audioUrl = result.audio_url as string;
  const transcript = await transcribeWithGroq(audioUrl);
  const whisperDoneAt = new Date().toISOString();
  const lineCount = transcript.split("\n").filter(Boolean).length;
  step(`Transcription done — ${lineCount} segments`);
  await saveSteps();

  // Delete audio from R2
  try {
    await deleteFromR2(`audio/${item.youtube_id}.mp3`);
    step("Audio deleted from R2");
  } catch (e) {
    step(`R2 audio delete failed (non-fatal): ${e instanceof Error ? e.message : String(e)}`, false);
  }

  // Step 3: Summarize
  let summary: string | null = null;
  try {
    step("Summarization started via Groq");
    await saveSteps();
    const sumRes = await ociPost("/summarize", { transcript });
    summary = sumRes.summary ?? null;
    step(`Summarization done — ${summary?.split("\n").length ?? 0} bullet points`);
  } catch (e) {
    step(`Summarization failed (non-fatal): ${e instanceof Error ? e.message : String(e)}`, false);
    console.error("Summarization failed:", e);
  }

  // Step 4: Save and complete
  await supabaseAdmin.from("videos").update({ transcript, summary, audio_r2_url: null }).eq("youtube_id", item.youtube_id);
  step("Transcript and summary saved to database");

  await supabaseAdmin.from("queue").update({ status: "complete", retry_after: null }).eq("id", item.id);
  step("Processing complete ✓");
  await supabaseAdmin.from("processing_logs")
    .update({ whisper_done_at: whisperDoneAt, steps })
    .eq("queue_id", item.id);
  // Poller will pick up the next item automatically
}

// [COLAB] The following route was used when Colab handled transcription:
// POST /api/whisper/callback — received transcript from Colab, saved it, deleted audio, marked complete
// It is now superseded by the inline Groq transcription above.
// File kept at: frontend/app/api/whisper/callback/route.ts
