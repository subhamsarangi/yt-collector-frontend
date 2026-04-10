import { NextResponse } from "next/server";
import { requireOwner } from "@/lib/supabase/requireOwner";

export async function GET() {
  const denied = await requireOwner();
  if (denied) return denied;

  try {
    const res = await fetch(`${process.env.OCI_API_URL}/health`, {
      signal: AbortSignal.timeout(5000), // 5s timeout
    });
    const data = await res.json();
    return NextResponse.json({ ok: res.ok && data?.status === "ok" });
  } catch {
    return NextResponse.json({ ok: false });
  }
}
