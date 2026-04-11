import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import Groq from "groq-sdk";
import { deleteFromR2 } from "@/lib/r2";

export const maxDuration = 300; // Vercel max; internal 270s soft timeout leaves 30s buffer

const OCI = process.env.OCI_API_URL!;
const OCI_KEY = process.env.OCI_API_KEY!;
const MAX_RETRIES = 3;

async function ociPost(path: string, body: object, timeoutMs = 240000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
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
  // Atomic claim: update a single pending/resumable item to metadata_processing in one query.
  // Only one concurrent caller can succeed — the other gets no rows back.
  const { data: claimed } = await supabaseAdmin.rpc("claim_next_queue_item");

  if (!claimed || claimed.length === 0) {
    return NextResponse.json({ ok: true, message: "Queue empty or already in progress" });
  }

  const item = claimed[0];

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

    const { data: current } = await supabaseAdmin
      .from("queue").select("status, retries, whisper_retries").eq("id", item.id).single();

    const currentStatus = current?.status ?? item.status;
    if (currentStatus === "complete") return NextResponse.json({ ok: true });

    // Determine which stage failed based on current status
    const isAudioOrLater = ["metadata_done", "audio_processing", "audio_done", "transcribing", "summarizing"].includes(currentStatus);

    if (isAudioOrLater) {
      const whisperRetries = (current?.whisper_retries || 0) + 1;
      const backoffMs = [2, 5, 15][Math.min(whisperRetries - 1, 2)] * 60 * 1000;
      await supabaseAdmin.from("queue").update({
        status: whisperRetries >= MAX_RETRIES ? "error_transcription" : "audio_done",
        whisper_retries: whisperRetries,
        last_error: message,
        retry_after: whisperRetries < MAX_RETRIES ? new Date(Date.now() + backoffMs).toISOString() : null,
      }).eq("id", item.id);
    } else {
      const retries = (current?.retries || 0) + 1;
      const backoffMs = [2, 5, 15][Math.min(retries - 1, 2)] * 60 * 1000;
      await supabaseAdmin.from("queue").update({
        status: retries >= MAX_RETRIES ? "error_metadata" : "pending",
        retries,
        last_error: message,
        retry_after: retries < MAX_RETRIES ? new Date(Date.now() + backoffMs).toISOString() : null,
      }).eq("id", item.id);
    }

    const { data: logRow } = await supabaseAdmin
      .from("processing_logs").select("steps").eq("queue_id", item.id).single();
    if (logRow) {
      const updatedSteps = [...((logRow.steps as Array<unknown>) ?? []),
        { ts: new Date().toISOString(), text: `Failed: ${message}`, ok: false }];
      await supabaseAdmin.from("processing_logs").update({ steps: updatedSteps }).eq("queue_id", item.id);
    }
  }

  return NextResponse.json({ ok: true });
}

async function processItem(item: Record<string, unknown>) {
  // original_status is what the item was BEFORE the atomic claim set it to an active status
  const originalStatus = (item.original_status ?? item.status) as string;
  const steps: Array<{ ts: string; text: string; ok?: boolean }> = [];
  const step = (text: string, ok = true) => {
    steps.push({ ts: new Date().toISOString(), text, ok });
    console.log(`[queue:${item.youtube_id}] ${text}`);
  };
  const saveSteps = () =>
    supabaseAdmin.from("processing_logs").update({ steps }).eq("queue_id", item.id);

  let result: Record<string, unknown>;

  // ── Resume from audio_done → transcribing ──
  if (originalStatus === "audio_done") {
    step("Resuming from audio_done — fetching audio URL from DB");
    const { data: video } = await supabaseAdmin
      .from("videos").select("audio_r2_url, metadata").eq("youtube_id", item.youtube_id).single();

    if (video?.audio_r2_url) {
      result = { audio_url: video.audio_r2_url, metadata: video.metadata };
    } else {
      // Audio URL missing — download timed out before upload completed, re-download
      step("audio_r2_url missing — re-downloading audio");
      await supabaseAdmin.from("queue").update({ status: "audio_processing" }).eq("id", item.id);
      await saveSteps();
      const audioResultRetry = await ociPost("/video/audio", { youtube_id: item.youtube_id, duration_seconds: (video?.metadata as Record<string, unknown>)?.duration ?? 0 }, 600000);
      step(`Audio downloaded — ${audioResultRetry.downloaded_duration_s ? Math.round(audioResultRetry.downloaded_duration_s/60)+"min" : "?min"} | ${audioResultRetry.size_mb ?? "?"}MB | ${audioResultRetry.elapsed_s ?? "?"}s @ ${audioResultRetry.speed_mbps ?? "?"}MB/s`);
      await supabaseAdmin.from("videos").update({ audio_r2_url: audioResultRetry.audio_url }).eq("youtube_id", item.youtube_id);
      await supabaseAdmin.from("queue").update({ status: "audio_done" }).eq("id", item.id);
      result = { audio_url: audioResultRetry.audio_url, metadata: video?.metadata ?? {} };
      await saveSteps();
    }

  // ── Resume from metadata_done → audio_processing ──
  } else if (originalStatus === "metadata_done") {
    step("Resuming from metadata_done — restarting audio download");
    const { data: video } = await supabaseAdmin
      .from("videos").select("metadata").eq("youtube_id", item.youtube_id).single();
    result = { metadata: video?.metadata ?? {} };

    await supabaseAdmin.from("queue").update({ status: "audio_processing" }).eq("id", item.id);
    const speedTest2 = await fetch(`${OCI}/speed-test`, {
      headers: { Authorization: `Bearer ${OCI_KEY}` },
      signal: AbortSignal.timeout(15000),
    }).then(r => r.ok ? r.json() : null).catch(() => null);
    if (speedTest2?.speed_mbps) {
      const meta2 = result.metadata as Record<string, unknown>;
      const dur2 = (meta2?.duration as number) ?? 0;
      const downloadMins2 = Math.min(dur2, 20 * 60) / 60;
      const estimatedMb2 = Math.round(downloadMins2 * 0.25 * 10) / 10;
      const etaSec2 = Math.round(estimatedMb2 / speedTest2.speed_mbps);
      step(`Speed test: ${speedTest2.speed_mbps}MB/s — estimated ~${estimatedMb2}MB download in ~${etaSec2}s`);
    } else {
      step("Speed test failed — proceeding without estimate");
    }
    step("Starting audio download... (downloading first 20 min)");
    await saveSteps();
    const audioResultMd = await ociPost("/video/audio", { youtube_id: item.youtube_id, duration_seconds: (result.metadata as Record<string, unknown>)?.duration ?? 0 }, 600000);
    step(`Audio downloaded — ${audioResultMd.downloaded_duration_s ? Math.round(audioResultMd.downloaded_duration_s/60)+"min" : "?min"} | ${audioResultMd.size_mb ?? "?"}MB | ${audioResultMd.elapsed_s ?? "?"}s @ ${audioResultMd.speed_mbps ?? "?"}MB/s`);
    await supabaseAdmin.from("videos").update({ audio_r2_url: audioResultMd.audio_url }).eq("youtube_id", item.youtube_id);
    result = { ...result, audio_url: audioResultMd.audio_url };
    await supabaseAdmin.from("queue").update({ status: "audio_done" }).eq("id", item.id);
    await saveSteps();

  // ── Fresh start from pending ──
  } else {
    const ytdlpStartedAt = new Date().toISOString();
    const { data: existingLog } = await supabaseAdmin
      .from("processing_logs").select("id, steps").eq("queue_id", item.id).single();
    const priorSteps: Array<{ ts: string; text: string; ok?: boolean }> = existingLog?.steps ?? [];

    if (existingLog) {
      priorSteps.push({ ts: new Date().toISOString(), text: "── Retry attempt ──", ok: true });
      await supabaseAdmin.from("processing_logs")
        .update({ steps: priorSteps, ytdlp_started_at: ytdlpStartedAt }).eq("queue_id", item.id);
    } else {
      await supabaseAdmin.from("processing_logs").insert({
        queue_id: item.id, youtube_id: item.youtube_id, ytdlp_started_at: ytdlpStartedAt, steps: [],
      });
    }
    steps.push(...priorSteps);

    step("Fetching metadata and thumbnail via OCI");
    await saveSteps();

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
    await supabaseAdmin.from("queue").update({ status: "metadata_done" }).eq("id", item.id);
    await saveSteps();

    // Channel videos: done after metadata
    if (item.source === "channel") {
      await supabaseAdmin.from("queue").update({ status: "complete", retry_after: null }).eq("id", item.id);
      step("Channel video — metadata only, no transcription ✓");
      await supabaseAdmin.from("processing_logs").update({ ytdlp_done_at: new Date().toISOString(), steps }).eq("queue_id", item.id);
      return;
    }

    // Audio download
    const duration = (meta.duration as number) ?? 0;
    await supabaseAdmin.from("queue").update({ status: "audio_processing" }).eq("id", item.id);

    const speedTest = await fetch(`${OCI}/speed-test`, {
      headers: { Authorization: `Bearer ${OCI_KEY}` },
      signal: AbortSignal.timeout(15000),
    }).then(r => r.ok ? r.json() : null).catch(() => null);
    if (speedTest?.speed_mbps) {
      const downloadMins = Math.min(duration, 20 * 60) / 60;
      const estimatedMb = Math.round(downloadMins * 0.25 * 10) / 10; // ~0.25 MB/min at 16kHz mono mp3
      const etaSec = Math.round(estimatedMb / speedTest.speed_mbps);
      step(`Speed test: ${speedTest.speed_mbps}MB/s — estimated ~${estimatedMb}MB download in ~${etaSec}s`);
    } else {
      step("Speed test failed — proceeding without estimate");
    }
    step(`Starting audio download... (video is ${Math.round(duration / 60)} min${duration > 1200 ? ", downloading first 20 min" : ""})`);
    await saveSteps();

    const audioResult2 = await ociPost("/video/audio", { youtube_id: item.youtube_id, duration_seconds: duration }, 600000);
    step(`Audio downloaded — ${audioResult2.downloaded_duration_s ? Math.round(audioResult2.downloaded_duration_s/60)+"min" : "?min"} | ${audioResult2.size_mb ?? "?"}MB | ${audioResult2.elapsed_s ?? "?"}s @ ${audioResult2.speed_mbps ?? "?"}MB/s`);
    await supabaseAdmin.from("videos").update({ audio_r2_url: audioResult2.audio_url }).eq("youtube_id", item.youtube_id);
    result = { ...result, audio_url: audioResult2.audio_url };

    await supabaseAdmin.from("queue").update({ status: "audio_done" }).eq("id", item.id);
    await supabaseAdmin.from("processing_logs").update({ ytdlp_done_at: new Date().toISOString(), steps }).eq("queue_id", item.id);
  }

  // ── Transcription ──
  await supabaseAdmin.from("queue").update({ status: "transcribing" }).eq("id", item.id);
  await supabaseAdmin.from("processing_logs").update({ whisper_started_at: new Date().toISOString() }).eq("queue_id", item.id);
  step("Transcription started via Groq (whisper-large-v3-turbo)");
  await saveSteps();

  const audioUrl = result.audio_url as string;
  const transcript = await transcribeWithGroq(audioUrl);
  const lineCount = transcript.split("\n").filter(Boolean).length;
  step(`Transcription done — ${lineCount} segments`);
  await saveSteps();

  try { await deleteFromR2(`audio/${item.youtube_id}.mp3`); step("Audio deleted from R2"); }
  catch (e) { step(`R2 delete failed (non-fatal): ${e instanceof Error ? e.message : String(e)}`, false); }

  // ── Summarization ──
  let summary: string | null = null;
  try {
    await supabaseAdmin.from("queue").update({ status: "summarizing" }).eq("id", item.id);
    step("Summarization started via Groq (moonshotai/kimi-k2-instruct)");
    await saveSteps();
    const sumRes = await ociPost("/summarize", { transcript });
    summary = sumRes.summary ?? null;
    step(`Summarization done — ${summary?.split("\n").length ?? 0} bullet points`);
  } catch (e) {
    step(`Summarization failed (non-fatal): ${e instanceof Error ? e.message : String(e)}`, false);
  }

  // ── Complete ──
  await supabaseAdmin.from("videos").update({ transcript, summary, audio_r2_url: null }).eq("youtube_id", item.youtube_id);
  step("Transcript and summary saved to database");
  await supabaseAdmin.from("queue").update({ status: "complete", retry_after: null }).eq("id", item.id);
  step("Processing complete ✓");
  await supabaseAdmin.from("processing_logs").update({ whisper_done_at: new Date().toISOString(), steps }).eq("queue_id", item.id);
}



