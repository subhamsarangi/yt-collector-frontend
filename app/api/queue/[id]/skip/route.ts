import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { requireOwner } from "@/lib/supabase/requireOwner";

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const denied = await requireOwner();
  if (denied) return denied;
  const { id } = await params;
  await supabaseAdmin
    .from("queue")
    .update({ status: "error_metadata", last_error: "Manually skipped" })
    .eq("id", id);

  // Trigger next item
  const host = _req.headers.get("host") ?? "localhost:3000";
  const protocol = host.includes("localhost") ? "http" : "https";
  fetch(`${protocol}://${host}/api/cron/queue-runner`, {
    method: "POST",
    headers: { "x-webhook-secret": process.env.QUEUE_WEBHOOK_SECRET! },
  }).catch(() => null);

  return NextResponse.json({ ok: true });
}
