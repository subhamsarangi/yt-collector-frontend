import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { requireOwner } from "@/lib/supabase/requireOwner";

export async function POST(req: NextRequest) {
  const denied = await requireOwner();
  if (denied) return denied;
  const { name, url, domain, thumbnail_url } = await req.json();
  if (!name || !url || !domain) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }
  const { error } = await supabaseAdmin.from("channels").insert({ name, url, domain, thumbnail_url: thumbnail_url || null });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
