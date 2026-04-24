import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";

const PAGE_SIZE = 20;

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const cursor = searchParams.get("cursor");
  const youtube_id = searchParams.get("youtube_id");

  // Single video lookup by youtube_id
  if (youtube_id) {
    const { data } = await supabaseAdmin
      .from("videos").select("id, youtube_id, title").eq("youtube_id", youtube_id).single();
    return NextResponse.json({ videos: data ? [data] : [] });
  }

  let query = supabaseAdmin
    .from("videos")
    .select("id, youtube_id, title, thumbnail_r2_url, published_at, created_at, channel_id, topic_id, transcript, channels(name), topics(name)")
    .order("created_at", { ascending: false })
    .limit(PAGE_SIZE);

  if (cursor) {
    query = query.lt("created_at", cursor);
  }

  const { data, error } = await query;

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({
    videos: data ?? [],
    nextCursor: data && data.length === PAGE_SIZE ? data[data.length - 1].created_at : null,
  });
}
