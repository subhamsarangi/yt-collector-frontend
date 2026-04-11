import { NextRequest, NextResponse } from "next/server";
import { requireOwner } from "@/lib/supabase/requireOwner";
import { supabaseAdmin } from "@/lib/supabase/server";

export async function GET() {
  const denied = await requireOwner();
  if (denied) return denied;

  const { data } = await supabaseAdmin
    .from("settings")
    .select("key, value")
    .eq("key", "audio_cap_minutes")
    .single();

  return NextResponse.json({ audio_cap_minutes: data?.value ?? 10 });
}

export async function POST(req: NextRequest) {
  const denied = await requireOwner();
  if (denied) return denied;

  const { audio_cap_minutes } = await req.json();
  const cap = Math.min(30, Math.max(5, Number(audio_cap_minutes)));

  await supabaseAdmin.from("settings").upsert(
    { key: "audio_cap_minutes", value: cap },
    { onConflict: "key" }
  );

  return NextResponse.json({ ok: true, audio_cap_minutes: cap });
}
