import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { requireOwner } from "@/lib/supabase/requireOwner";

const OCI = process.env.OCI_API_URL!;
const OCI_KEY = process.env.OCI_API_KEY!;

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const denied = await requireOwner();
  if (denied) return denied;

  const { id } = await params;

  const { data: video } = await supabaseAdmin
    .from("videos")
    .select("id, youtube_id, transcript")
    .eq("id", id)
    .single();

  if (!video) return NextResponse.json({ error: "Video not found" }, { status: 404 });
  if (!video.transcript) return NextResponse.json({ error: "No transcript available" }, { status: 400 });

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 240000);

  let summary: string;
  try {
    const res = await fetch(`${OCI}/summarize`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${OCI_KEY}` },
      body: JSON.stringify({ transcript: video.transcript }),
      signal: controller.signal,
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      return NextResponse.json(
        { error: `OCI /summarize failed: ${res.status} — ${body}` },
        { status: 502 }
      );
    }
    const data = await res.json();
    summary = data.summary;
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : String(e) },
      { status: 500 }
    );
  } finally {
    clearTimeout(timer);
  }

  await supabaseAdmin
    .from("videos")
    .update({ summary })
    .eq("id", id);

  return NextResponse.json({ ok: true, summary });
}
