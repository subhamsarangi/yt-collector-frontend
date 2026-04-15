import { NextResponse } from "next/server";
import { getUserRole } from "@/lib/supabase/userRole";
import { supabaseAdmin } from "@/lib/supabase/server";

export async function GET() {
  const role = await getUserRole();
  if (!role) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Find the most recent ytdlp_channel_scan event
  const { data: latest } = await supabaseAdmin
    .from("usage_logs")
    .select("created_at")
    .eq("event", "ytdlp_channel_scan")
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (!latest) return NextResponse.json({ scan: null });

  // Grab all scan events within 10 minutes of the latest one
  // (one scan run logs one row per channel, all within seconds of each other)
  const batchStart = new Date(
    new Date(latest.created_at).getTime() - 10 * 60 * 1000
  ).toISOString();

  const { data: scanRows } = await supabaseAdmin
    .from("usage_logs")
    .select("created_at, meta")
    .eq("event", "ytdlp_channel_scan")
    .gte("created_at", batchStart)
    .order("created_at", { ascending: false });

  if (!scanRows?.length) return NextResponse.json({ scan: null });

  // Collect channel_ids from the scan
  const channelIds = [
    ...new Set(
      scanRows
        .map((r) => (r.meta as Record<string, unknown>).channel_id as string)
        .filter(Boolean)
    ),
  ];

  // Fetch channel details (name, thumbnail) for all scanned channels
  const { data: channels } = channelIds.length
    ? await supabaseAdmin
        .from("channels")
        .select("id, name, thumbnail_url, url")
        .in("id", channelIds)
    : { data: [] };

  const channelMap = new Map(
    (channels ?? []).map((c) => [c.id, c])
  );

  // Build per-channel results
  const channelResults = scanRows.map((row) => {
    const meta = row.meta as Record<string, unknown>;
    const channelId = meta.channel_id as string;
    const channel = channelMap.get(channelId);
    return {
      channel_id: channelId,
      channel_url: meta.channel_url as string,
      channel_name: channel?.name ?? null,
      thumbnail_url: channel?.thumbnail_url ?? null,
      entries_found: (meta.entries_found as number) ?? 0,
      queued: (meta.queued as number) ?? 0,
      error: (meta.error as string) ?? null,
      scanned_at: row.created_at,
    };
  });

  const totalEntries = channelResults.reduce((s, r) => s + r.entries_found, 0);
  const totalQueued  = channelResults.reduce((s, r) => s + r.queued, 0);
  const activeChannels = channelResults.filter((r) => r.entries_found > 0).length;
  const errorCount   = channelResults.filter((r) => r.error).length;
  const successCount = channelResults.filter((r) => !r.error).length;

  return NextResponse.json({
    scan: {
      scanned_at: latest.created_at,
      channels_scanned: channelResults.length,
      channels_with_new_videos: activeChannels,
      total_entries_found: totalEntries,
      total_queued: totalQueued,
      success_count: successCount,
      error_count: errorCount,
      channels: channelResults,
    },
  });
}
