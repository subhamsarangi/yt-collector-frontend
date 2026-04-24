import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { requireOwner } from "@/lib/supabase/requireOwner";
import { logUsage } from "@/lib/logUsage";

const OCI = process.env.OCI_API_URL!;
const OCI_KEY = process.env.OCI_API_KEY!;
const SCAN_LIMIT = 3;

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const denied = await requireOwner();
  if (denied) return denied;

  const { id } = await params;

  const { data: channel } = await supabaseAdmin
    .from("channels")
    .select("id, url")
    .eq("id", id)
    .single();

  if (!channel) return NextResponse.json({ error: "Channel not found" }, { status: 404 });

  // Call OCI to get latest videos for this channel
  let res: Response;
  try {
    res = await fetch(`${OCI}/channel/scan`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${OCI_KEY}` },
      body: JSON.stringify({ channel_url: channel.url, count: 3 }),
      signal: AbortSignal.timeout(60_000),
    });
  } catch (e) {
    const error = e instanceof Error ? e.message : "Network error";
    await logUsage("ytdlp_channel_scan", { channel_url: channel.url, channel_id: channel.id, entries_found: 0, queued: 0, error, source: "manual" });
    return NextResponse.json({ error }, { status: 502 });
  }

  if (!res.ok) {
    const body = await res.text().catch(() => "(unreadable)");
    const error = `OCI ${res.status}: ${body}`;
    await logUsage("ytdlp_channel_scan", { channel_url: channel.url, channel_id: channel.id, entries_found: 0, queued: 0, error, source: "manual" });
    return NextResponse.json({ error }, { status: 502 });
  }

  const json = await res.json();
  const entries: { id?: string }[] = json.entries ?? [];

  let queued = 0;
  let skipped = 0;

  // OCI returns newest-first; take up to SCAN_LIMIT new (not already in DB) videos
  for (const entry of entries) {
    if (queued >= SCAN_LIMIT) break;

    const youtube_id = entry.id;
    if (!youtube_id) continue;

    // Skip if already in videos table
    const { data: existingVideo } = await supabaseAdmin
      .from("videos")
      .select("id")
      .eq("youtube_id", youtube_id)
      .single();

    if (existingVideo) {
      skipped++;
      continue;
    }

    // Skip if already queued
    const { data: existingQueue } = await supabaseAdmin
      .from("queue")
      .select("id")
      .eq("youtube_id", youtube_id)
      .single();

    if (existingQueue) {
      skipped++;
      continue;
    }

    const { error: insertError } = await supabaseAdmin.from("queue").insert({
      youtube_id,
      source: "channel",
      source_id: channel.id,
      status: "pending",
    });

    if (!insertError) queued++;
  }

  await logUsage("ytdlp_channel_scan", {
    channel_url: channel.url,
    channel_id: channel.id,
    entries_found: entries.length,
    queued,
    source: "manual",
  });

  return NextResponse.json({ ok: true, queued, skipped, entries_found: entries.length });
}
