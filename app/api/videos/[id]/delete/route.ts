import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { deleteFromR2 } from "@/lib/r2";

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const { data: video } = await supabaseAdmin
    .from("videos")
    .select("youtube_id, thumbnail_r2_url, audio_r2_url")
    .eq("id", id)
    .single();

  if (video) {
    // Clean up R2 files
    try { await deleteFromR2(`thumbnails/${video.youtube_id}.jpg`); } catch {}
    if (video.audio_r2_url) {
      try { await deleteFromR2(`audio/${video.youtube_id}.mp3`); } catch {}
    }
  }

  await supabaseAdmin.from("queue").delete().eq("youtube_id", video?.youtube_id ?? "");
  await supabaseAdmin.from("videos").delete().eq("id", id);

  return NextResponse.json({ ok: true });
}
