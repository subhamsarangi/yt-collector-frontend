import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { requireOwner } from "@/lib/supabase/requireOwner";

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const denied = await requireOwner();
  if (denied) return denied;
  const { id } = await params;
  await supabaseAdmin.from("queue").delete().eq("source_id", id);
  await supabaseAdmin.from("videos").update({ topic_id: null }).eq("topic_id", id);
  await supabaseAdmin.from("topics").delete().eq("id", id);
  return NextResponse.json({ ok: true });
}
