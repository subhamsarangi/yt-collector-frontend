import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { deleteFromR2 } from "@/lib/r2";

export async function POST(req: NextRequest) {
  const secret = req.headers.get("x-callback-secret");
  if (secret !== process.env.WHISPER_CALLBACK_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { queue_id, transcript } = await req.json();
  if (!queue_id || !transcript) {
    return NextResponse.json({ error: "Missing queue_id or transcript" }, { status: 400 });
  }

  // Get queue item to find youtube_id
  const { data: queueItem } = await supabaseAdmin
    .from("queue")
    .select("youtube_id")
    .eq("id", queue_id)
    .single();

  if (!queueItem) {
    return NextResponse.json({ error: "Queue item not found" }, { status: 404 });
  }

  const { youtube_id } = queueItem;

  // Save transcript and clear audio URL
  await supabaseAdmin
    .from("videos")
    .update({ transcript, audio_r2_url: null })
    .eq("youtube_id", youtube_id);

  // Delete audio from R2
  try {
    await deleteFromR2(`audio/${youtube_id}.mp3`);
  } catch (e) {
    console.error("R2 delete failed:", e);
  }

  // Mark queue complete
  await supabaseAdmin
    .from("queue")
    .update({ status: "complete" })
    .eq("id", queue_id);

  return NextResponse.json({ ok: true });
}
