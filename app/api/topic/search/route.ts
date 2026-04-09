import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";

const OCI = process.env.OCI_API_URL!;
const OCI_KEY = process.env.OCI_API_KEY!;

export async function POST(req: NextRequest) {
  const { topic } = await req.json();
  if (!topic) return NextResponse.json({ error: "Missing topic" }, { status: 400 });

  // Create or get topic record
  const { data: existing } = await supabaseAdmin
    .from("topics")
    .select("id")
    .eq("name", topic)
    .single();

  let topic_id: string;

  if (existing) {
    topic_id = existing.id;
  } else {
    const { data: created } = await supabaseAdmin
      .from("topics")
      .insert({ name: topic })
      .select("id")
      .single();
    topic_id = created!.id;
  }

  // Search via OCI
  const res = await fetch(`${OCI}/search/enhanced`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${OCI_KEY}` },
    body: JSON.stringify({ topic }),
  });

  if (!res.ok) return NextResponse.json({ error: "OCI search failed" }, { status: 500 });
  const { results } = await res.json();

  let added = 0;
  for (const entry of results ?? []) {
    const youtube_id = entry.id;
    if (!youtube_id) continue;

    const { data: existing } = await supabaseAdmin
      .from("videos")
      .select("id")
      .eq("youtube_id", youtube_id)
      .single();

    if (existing) continue;

    await supabaseAdmin.from("queue").insert({
      youtube_id,
      source: "topic",
      source_id: topic_id,
      status: "pending",
    });
    added++;
  }

  return NextResponse.json({ ok: true, topic_id, added });
}
