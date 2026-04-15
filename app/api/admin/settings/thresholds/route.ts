import { NextRequest, NextResponse } from "next/server";
import { requireOwner } from "@/lib/supabase/requireOwner";
import { supabaseAdmin } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  const denied = await requireOwner();
  if (denied) return denied;

  const { event, hourly, daily } = await req.json();
  if (!event || hourly == null || daily == null) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  const h = Math.max(1, Number(hourly));
  const d = Math.max(1, Number(daily));

  await supabaseAdmin.from("settings").upsert(
    { key: `threshold_${event}`, value: { hourly: h, daily: d } },
    { onConflict: "key" }
  );

  return NextResponse.json({ ok: true, event, hourly: h, daily: d });
}
