import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";

const OCI = process.env.OCI_API_URL!;
const OCI_KEY = process.env.OCI_API_KEY!;

export async function GET() {
  const { data: channels } = await supabaseAdmin
    .from("channels")
    .select("id, url");

  if (!channels?.length) return NextResponse.json({ ok: true, message: "No channels" });

  let added = 0;

  for (const channel of channels) {
    const res = await fetch(`${OCI}/channel/scan`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${OCI_KEY}` },
      body: JSON.stringify({ channel_url: channel.url }),
    });

    if (!res.ok) continue;
    const { entries } = await res.json();

    for (const entry of entries ?? []) {
      const youtube_id = entry.id;
      if (!youtube_id) continue;

      // Dedup check
      const { data: existing } = await supabaseAdmin
        .from("videos")
        .select("id")
        .eq("youtube_id", youtube_id)
        .single();

      if (existing) continue;

      await supabaseAdmin.from("queue").insert({
        youtube_id,
        source: "channel",
        source_id: channel.id,
        status: "pending",
      });
      added++;
    }
  }

  const selfUrl = process.env.NEXT_PUBLIC_APP_URL
    ?? (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");

  if (added > 0) {
    fetch(`${selfUrl}/api/cron/queue-runner`, {
      method: "POST",
      headers: { "x-webhook-secret": process.env.QUEUE_WEBHOOK_SECRET! },
    }).catch(() => null);
  }

  return NextResponse.json({ ok: true, added });
}
