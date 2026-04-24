import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";

const PAGE_SIZE = 15;

export async function GET(request: NextRequest) {
  const page = parseInt(request.nextUrl.searchParams.get("page") ?? "1");
  const offset = (page - 1) * PAGE_SIZE;

  try {
    // Get all channel scan events, grouped by timestamp
    const { data: logs, error } = await supabaseAdmin
      .from("usage_logs")
      .select("created_at, meta")
      .eq("event", "ytdlp_channel_scan")
      .order("created_at", { ascending: false });

    if (error) throw error;

    // Group by scan timestamp (created_at)
    const scans = new Map<string, typeof logs>();
    logs?.forEach((log) => {
      const key = log.created_at;
      if (!scans.has(key)) scans.set(key, []);
      scans.get(key)!.push(log);
    });

    // Convert to array and paginate
    const scanArray = Array.from(scans.entries()).map(([timestamp, entries]) => ({
      timestamp,
      entries: entries as Array<{ created_at: string; meta: Record<string, unknown> }>,
    }));

    const total = scanArray.length;
    const paginatedScans = scanArray.slice(offset, offset + PAGE_SIZE);

    // Fetch channel names for display
    const { data: channels } = await supabaseAdmin
      .from("channels")
      .select("id, name, thumbnail_url");

    const channelMap = new Map(channels?.map((c) => [c.id, c]) ?? []);

    // Enrich scan data
    const enrichedScans = paginatedScans.map((scan) => {
      const stats = {
        channels_scanned: 0,
        channels_with_new_videos: 0,
        total_entries_found: 0,
        total_queued: 0,
        success_count: 0,
        error_count: 0,
        channels: [] as Array<{
          channel_id: string;
          channel_url: string;
          channel_name: string | null;
          thumbnail_url: string | null;
          entries_found: number;
          queued: number;
          error: string | null;
        }>,
      };

      scan.entries.forEach((entry) => {
        const meta = entry.meta as Record<string, unknown>;
        const channel_id = meta.channel_id as string;
        const channel_url = meta.channel_url as string;
        const entries_found = (meta.entries_found as number) ?? 0;
        const queued = (meta.queued as number) ?? 0;
        const error = (meta.error as string) ?? null;
        const source = (meta.source as string) ?? "unknown";

        stats.channels_scanned++;
        if (entries_found > 0) stats.channels_with_new_videos++;
        stats.total_entries_found += entries_found;
        stats.total_queued += queued;
        if (!error) stats.success_count++;
        else stats.error_count++;

        const channel = channelMap.get(channel_id);
        stats.channels.push({
          channel_id,
          channel_url,
          channel_name: channel?.name ?? null,
          thumbnail_url: channel?.thumbnail_url ?? null,
          entries_found,
          queued,
          error,
        });
      });

      return {
        scanned_at: scan.timestamp,
        source,
        ...stats,
      };
    });

    return NextResponse.json({
      scans: enrichedScans,
      page,
      total,
      pages: Math.ceil(total / PAGE_SIZE),
    });
  } catch (e) {
    console.error("[scan-history] Error:", e);
    return NextResponse.json(
      { error: "Failed to fetch scan history" },
      { status: 500 }
    );
  }
}
