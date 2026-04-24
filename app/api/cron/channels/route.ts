import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { logUsage } from "@/lib/logUsage";

const OCI = process.env.OCI_API_URL!;
const OCI_KEY = process.env.OCI_API_KEY!;

export async function GET() {
  console.log("[scan-channels] Starting channel scan");

  const { data: channels, error: dbError } = await supabaseAdmin
    .from("channels")
    .select("id, url")
    .order("high_priority", { ascending: false })
    .order("created_at", { ascending: true });

  if (dbError) {
    console.error("[scan-channels] Failed to fetch channels from DB:", dbError.message);
    return NextResponse.json({ ok: false, error: dbError.message }, { status: 500 });
  }

  if (!channels?.length) {
    console.log("[scan-channels] No channels in DB, nothing to do");
    return NextResponse.json({ ok: true, message: "No channels" });
  }

  // Fetch the per-run video cap from settings (default 20)
  const { data: limitSetting } = await supabaseAdmin
    .from("settings")
    .select("value")
    .eq("key", "scan_videos_per_run")
    .single();
  const scanLimit: number = (limitSetting?.value as number) ?? 20;
  console.log(`[scan-channels] Found ${channels.length} channel(s) to scan — cap: ${scanLimit} new videos per run`);

  let added = 0;

  for (const channel of channels) {
    if (added >= scanLimit) {
      console.log(`[scan-channels] Reached scan limit (${scanLimit}), stopping early`);
      break;
    }

    console.log(`[scan-channels] Scanning: ${channel.url}`);
    let res: Response;
    try {
      res = await fetch(`${OCI}/channel/scan`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${OCI_KEY}` },
        body: JSON.stringify({ channel_url: channel.url }),
        signal: AbortSignal.timeout(60_000),
      });
    } catch (e) {
      console.error(`[scan-channels] Network error for ${channel.url}:`, e);
      await logUsage("ytdlp_channel_scan", {
        channel_url: channel.url,
        channel_id: channel.id,
        entries_found: 0,
        queued: 0,
        error: e instanceof Error ? e.message : "Network error",
        source: "automated",
      });
      continue;
    }

    if (!res.ok) {
      const body = await res.text().catch(() => "(unreadable)");
      console.error(`[scan-channels] OCI returned ${res.status} for ${channel.url}: ${body}`);
      await logUsage("ytdlp_channel_scan", {
        channel_url: channel.url,
        channel_id: channel.id,
        entries_found: 0,
        queued: 0,
        error: `OCI ${res.status}`,
        source: "automated",
      });
      continue;
    }

    const json = await res.json();
    const entries: { id?: string }[] = json.entries ?? [];
    console.log(`[scan-channels] Got ${entries.length} entries for ${channel.url}`);

    let channelQueued = 0;

    for (const entry of entries) {
      const youtube_id = entry.id;
      if (!youtube_id) continue;

      const { data: existing } = await supabaseAdmin
        .from("videos")
        .select("id")
        .eq("youtube_id", youtube_id)
        .single();

      if (existing) {
        console.log(`[scan-channels] Already exists, skipping: ${youtube_id}`);
        continue;
      }

      const { error: insertError } = await supabaseAdmin.from("queue").insert({
        youtube_id,
        source: "channel",
        source_id: channel.id,
        status: "pending",
      });

      if (insertError) {
        console.error(`[scan-channels] Failed to queue ${youtube_id}:`, insertError.message);
      } else {
        console.log(`[scan-channels] Queued: ${youtube_id}`);
        added++;
        channelQueued++;
        if (added >= scanLimit) {
          console.log(`[scan-channels] Reached scan limit (${scanLimit}), stopping early`);
          break;
        }
      }
    }

    await logUsage("ytdlp_channel_scan", {
      channel_url: channel.url,
      channel_id: channel.id,
      entries_found: entries.length,
      queued: channelQueued,
      source: "automated",
    });
  }

  console.log(`[scan-channels] Done — ${added} new video(s) queued`);
  // Poller on OCI will pick up new items within 10s automatically
  return NextResponse.json({ ok: true, added });
}
