import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await supabaseAdmin.from("queue").delete().eq("source_id", id);
  await supabaseAdmin.from("videos").update({ topic_id: null }).eq("topic_id", id);
  await supabaseAdmin.from("topics").delete().eq("id", id);
  return NextResponse.json({ ok: true });
}
