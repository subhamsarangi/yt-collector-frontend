import { NextRequest, NextResponse } from "next/server";
import { requireOwner } from "@/lib/supabase/requireOwner";
import { supabaseAdmin } from "@/lib/supabase/server";

export async function GET() {
  const denied = await requireOwner();
  if (denied) return denied;

  const { data: rows } = await supabaseAdmin
    .from("settings")
    .select("key, value")
    .in("key", ["audio_cap_minutes", "scan_videos_per_run"]);

  const byKey = Object.fromEntries((rows ?? []).map((r) => [r.key, r.value]));

  return NextResponse.json({
    audio_cap_minutes: byKey["audio_cap_minutes"] ?? 10,
    scan_videos_per_run: byKey["scan_videos_per_run"] ?? 20,
  });
}

export async function POST(req: NextRequest) {
  const denied = await requireOwner();
  if (denied) return denied;

  const body = await req.json();
  const updates: { key: string; value: number }[] = [];

  if (body.audio_cap_minutes !== undefined) {
    const cap = Math.min(30, Math.max(5, Number(body.audio_cap_minutes)));
    updates.push({ key: "audio_cap_minutes", value: cap });
  }

  if (body.scan_videos_per_run !== undefined) {
    const limit = Math.min(100, Math.max(1, Number(body.scan_videos_per_run)));
    updates.push({ key: "scan_videos_per_run", value: limit });
  }

  if (updates.length) {
    await supabaseAdmin.from("settings").upsert(updates, { onConflict: "key" });
  }

  return NextResponse.json({ ok: true, ...Object.fromEntries(updates.map((u) => [u.key, u.value])) });
}
