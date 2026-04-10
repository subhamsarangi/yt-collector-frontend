import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { requireOwner } from "@/lib/supabase/requireOwner";

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const denied = await requireOwner();
  if (denied) return denied;
  const { id } = await params;
  await supabaseAdmin.from("users").update({ approved: false }).eq("id", id);
  return NextResponse.redirect(new URL("/admin", _req.url));
}
