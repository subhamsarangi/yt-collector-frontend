import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  // id here is the video id
  const { data: video } = await supabaseAdmin
    .from("videos").select("youtube_id").eq("id", id).single();
  if (!video) return NextResponse.json({ steps: [], status: null });

  const { data: queueRow } = await supabaseAdmin
    .from("queue").select("id, status")
    .eq("youtube_id", video.youtube_id)
    .order("created_at", { ascending: false })
    .limit(1).single();

  if (!queueRow) return NextResponse.json({ steps: [], status: null });

  const { data: logRow } = await supabaseAdmin
    .from("processing_logs").select("steps")
    .eq("queue_id", queueRow.id).single();

  return NextResponse.json({
    steps: logRow?.steps ?? [],
    status: queueRow.status,
  });
}
