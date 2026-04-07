import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await supabaseAdmin.from("channels").delete().eq("id", id);
  return NextResponse.json({ ok: true });
}
