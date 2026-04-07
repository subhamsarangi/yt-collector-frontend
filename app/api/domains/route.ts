import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";

export async function GET() {
  const { data } = await supabaseAdmin
    .from("domains")
    .select("name")
    .order("name");
  return NextResponse.json(data ?? []);
}
