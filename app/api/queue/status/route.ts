import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { requireOwner } from "@/lib/supabase/requireOwner";

export async function GET(req: NextRequest) {
  const denied = await requireOwner();
  if (denied) return denied;

  const youtube_id = req.nextUrl.searchParams.get("youtube_id");
  if (!youtube_id) return NextResponse.json({ error: "Missing youtube_id" }, { status: 400 });

  const { data } = await supabaseAdmin
    .from("queue").select("status").eq("youtube_id", youtube_id).order("created_at", { ascending: false }).limit(1).single();

  return NextResponse.json({ status: data?.status ?? null });
}
