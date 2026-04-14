import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";

const OCI = process.env.OCI_API_URL!;
const OCI_KEY = process.env.OCI_API_KEY!;

export async function GET() {
  console.log("[scan-channels] Starting channel scan");

  const { data: channels, error: dbError } = await supabaseAdmin
    .from("channels")
    .select("id, url");

  if (dbError) {
    console.error("[scan-channels] Failed to fetch channels from DB:", dbError.message);
    return NextResponse.json({ ok: false, error: dbError.message }, { status: 500 });
  }

  if (!channels?.length) {
    console.log("[scan-channels] No channels in DB, nothing to do");
    return NextResponse.json({ ok: true, message: "No channels" });
  }

  console.log(`[scan-channels] Found ${channels.length} channel(s) to scan`);
  let added = 0;

  for (const channel of channels) {
    console.log(`[scan-channels] Scanning: ${channel.url}`);
    let res: Response;
    try {
      res = await fetch(`${OCI}/channel/scan`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${OCI_KEY}` },
        body: JSON.stringify({ channel_url: channel.url }),
        signal: AbortSignal.timeout(60_000), // 60s per channel
      });
    } catch (e) {
      console.error(`[scan-channels] Network error for ${channel.url}:`, e);
      continue;
    }

    if (!res.ok) {
      const body = await res.text().catch(() => "(unreadable)");
      console.error(`[scan-channels] OCI returned ${res.status} for ${channel.url}: ${body}`);
      continue;
    }

    const json = await res.json();
    const entries: { id?: string }[] = json.entries ?? [];
    console.log(`[scan-channels] Got ${entries.length} entries for ${channel.url}`);

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
      }
    }
  }

  console.log(`[scan-channels] Done — ${added} new video(s) queued`);
  // Poller on OCI will pick up new items within 10s automatically
  return NextResponse.json({ ok: true, added });
}
