import { NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const q = searchParams.get("q");
  const cursor = searchParams.get("cursor");
  const channel = searchParams.get("channel");
  const topic = searchParams.get("topic");

  if (!q) {
    return Response.json({ videos: [], nextCursor: null, totalCount: 0 });
  }

  const PAGE_SIZE = 10;

  // Get total count — search title + description + transcript
  const { count: totalCount } = await supabaseAdmin
    .from("videos")
    .select("id", { count: "exact", head: true })
    .or(`title.ilike.%${q}%,description.ilike.%${q}%,transcript.ilike.%${q}%`);

  let query = supabaseAdmin
    .from("videos")
    .select("id, youtube_id, title, thumbnail_r2_url, published_at, channel_id, topic_id, transcript, created_at")
    .or(`title.ilike.%${q}%,description.ilike.%${q}%,transcript.ilike.%${q}%`);

  if (cursor) {
    query = query.lt("created_at", cursor);
  }

  const { data: videos } = await query
    .order("created_at", { ascending: false })
    .limit(PAGE_SIZE + 1);

  let filtered = videos ?? [];

  if (channel) {
    filtered = filtered.filter((v) => v.channel_id === channel);
  }
  if (topic) {
    filtered = filtered.filter((v) => v.topic_id === topic);
  }

  const hasMore = filtered.length > PAGE_SIZE;
  const results = filtered.slice(0, PAGE_SIZE);
  const nextCursor = hasMore ? results[results.length - 1]?.created_at : null;

  return Response.json({ videos: results, nextCursor, totalCount: totalCount ?? 0 });
}
