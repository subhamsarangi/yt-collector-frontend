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

async function transcribeWithGroq(audioUrl: string, offsetSeconds = 0): Promise<string> {
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
    throw new Error(`Audio chunk too large for Groq (${Math.round(audioBlob.size / 1024 / 1024)}MB > 25MB)`);
  }

  const audioFile = new File([audioBlob], "audio.mp3", { type: "audio/mpeg" });
  const result = await groq.audio.transcriptions.create({
    file: audioFile,
    model: "whisper-large-v3",
    response_format: "verbose_json",
    language: "en",
  });

  type Segment = { start: number; text: string };
  const segments = (result as { segments?: Segment[] }).segments ?? [];
  if (!segments.length) return result.text ?? "";

  return segments.map((seg: Segment) => {
    const start = Math.floor(seg.start + offsetSeconds);
    const m = Math.floor(start / 60).toString().padStart(2, "0");
    const s = (start % 60).toString().padStart(2, "0");
    return `[${m}:${s}] ${seg.text.trim()}`;
  }).join("\n");
}

async function transcribeChunks(
  chunks: Array<{ url: string; offset: number }>,
  onChunk: (i: number, total: number) => void
): Promise<string> {
  const parts: string[] = [];
  for (let i = 0; i < chunks.length; i++) {
    onChunk(i + 1, chunks.length);
    const part = await transcribeWithGroq(chunks[i].url, chunks[i].offset);
    parts.push(part);
  }
  return parts.join("\n");
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

  // Pick next pending or resumable item
  const { data: item } = await supabaseAdmin
    .from("queue")
    .select("*")
    .in("status", ["pending", "yt_dlp_done"])
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

    // Re-fetch current status — it may have advanced past pending before the timeout
    const { data: current } = await supabaseAdmin
      .from("queue").select("status, retries, whisper_retries").eq("id", item.id).single();

    const currentStatus = current?.status ?? item.status;
    const isWhisperStage = ["yt_dlp_done", "whisper_processing", "whisper_done"].includes(currentStatus);

    if (isWhisperStage) {
      // yt-dlp succeeded — only retry whisper
      const whisperRetries = (current?.whisper_retries || 0) + 1;
      await supabaseAdmin.from("queue").update({
        status: whisperRetries >= MAX_RETRIES ? "error_whisper" : "yt_dlp_done",
        whisper_retries: whisperRetries,
        last_error: message,
      }).eq("id", item.id);
    } else {
      // Failed during yt-dlp stage
      const retries = (current?.retries || 0) + 1;
      await supabaseAdmin.from("queue").update({
        status: retries >= MAX_RETRIES ? "error_ytdlp" : "pending",
        retries,
        last_error: message,
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

    // Step 1b: Audio download (slow for long videos — chunked if > 20 min)
    const duration = (meta.duration as number) ?? 0;
    const isLong = duration > 20 * 60;
    step(`Starting audio download... (${Math.round(duration / 60)} min${isLong ? ", will be chunked" : ""})`);
    await saveSteps();
    const audioResult = await ociPost("/video/audio", { youtube_id: item.youtube_id, duration });
    const ytdlpDoneAt = new Date().toISOString();

    const chunks: Array<{ url: string; offset: number }> = audioResult.chunked
      ? audioResult.chunks.map((c: { url: string; offset: number }) => c)
      : [{ url: audioResult.audio_url, offset: 0 }];

    step(`Audio ready — ${chunks.length} chunk(s) uploaded to R2`);

    await supabaseAdmin.from("videos")
      .update({ audio_r2_url: audioResult.chunked ? null : audioResult.audio_url })
      .eq("youtube_id", item.youtube_id);

    result = { ...result, chunks, audio_url: audioResult.audio_url };

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

  const chunks = (result.chunks as Array<{ url: string; offset: number }>) ?? [{ url: result.audio_url as string, offset: 0 }];
  const transcript = await transcribeChunks(chunks, (i, total) => {
    step(`Transcribing chunk ${i}/${total}...`);
  });
  const whisperDoneAt = new Date().toISOString();
  const lineCount = transcript.split("\n").filter(Boolean).length;
  step(`Transcription done — ${lineCount} segments across ${chunks.length} chunk(s)`);
  await saveSteps();

  // Clean up chunk files from R2
  for (const chunk of chunks) {
    const key = chunk.url.split("/").slice(-2).join("/"); // audio/id_chunk000.mp3
    try { await deleteFromR2(key); } catch { /* non-fatal */ }
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

  try {
    // For single-file (non-chunked) videos, delete the audio from R2
    const singleAudioUrl = result.audio_url as string | null;
    if (singleAudioUrl && (result.chunks as Array<unknown>).length === 1) {
      await deleteFromR2(`audio/${item.youtube_id}.mp3`);
      step("Audio file deleted from R2");
    }
  } catch (e) {
    step(`R2 audio delete failed (non-fatal): ${e instanceof Error ? e.message : String(e)}`, false);
  }

  await supabaseAdmin.from("queue").update({ status: "complete" }).eq("id", item.id);
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
