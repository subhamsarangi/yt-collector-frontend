import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await supabaseAdmin.from("users").update({ approved: false }).eq("id", id);
  return NextResponse.redirect(new URL("/admin", _req.url));
}
