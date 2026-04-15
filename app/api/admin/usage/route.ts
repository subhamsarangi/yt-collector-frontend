import { NextRequest, NextResponse } from "next/server";
import { requireOwner } from "@/lib/supabase/requireOwner";
import { supabaseAdmin } from "@/lib/supabase/server";

// POST — internal: log a usage event (no auth check, called server-side only)
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { event, meta } = body as {
    event: string;
    meta?: Record<string, unknown>;
  };

  await supabaseAdmin.from("usage_logs").insert({
    event,
    meta: meta ?? {},
  });

  return NextResponse.json({ ok: true });
}

// GET — owner only: return aggregated usage for the last 24h and 1h
export async function GET() {
  const denied = await requireOwner();
  if (denied) return denied;

  const now = new Date();
  const since24h = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
  const since1h = new Date(now.getTime() - 60 * 60 * 1000).toISOString();

  const { data: rows24h } = await supabaseAdmin
    .from("usage_logs")
    .select("event, created_at, meta")
    .gte("created_at", since24h)
    .order("created_at", { ascending: false });

  const { data: rows1h } = await supabaseAdmin
    .from("usage_logs")
    .select("event, created_at, meta")
    .gte("created_at", since1h)
    .order("created_at", { ascending: false });

  return NextResponse.json({
    last24h: rows24h ?? [],
    last1h: rows1h ?? [],
  });
}
