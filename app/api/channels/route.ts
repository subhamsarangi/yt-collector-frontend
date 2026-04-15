import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { requireOwner } from "@/lib/supabase/requireOwner";
import { uploadToR2 } from "@/lib/r2";

export async function POST(req: NextRequest) {
  const denied = await requireOwner();
  if (denied) return denied;

  const { name, url, domain, thumbnail_url } = await req.json();
  if (!name || !url || !domain) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  // Mirror the YouTube thumbnail to R2 so we don't depend on YouTube URLs
  let storedThumbnail: string | null = thumbnail_url || null;
  if (thumbnail_url) {
    try {
      const imgRes = await fetch(thumbnail_url, { signal: AbortSignal.timeout(10_000) });
      if (imgRes.ok) {
        const buffer = Buffer.from(await imgRes.arrayBuffer());
        const contentType = imgRes.headers.get("content-type") ?? "image/jpeg";
        // Use a slug derived from the channel URL as the key
        const slug = url.replace(/https?:\/\/(www\.)?youtube\.com\/@?/, "").replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 64);
        storedThumbnail = await uploadToR2(`channels/${slug}.jpg`, buffer, contentType);
      }
    } catch {
      // Non-fatal — fall back to the original YouTube URL
    }
  }

  const { error } = await supabaseAdmin
    .from("channels")
    .insert({ name, url, domain, thumbnail_url: storedThumbnail });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
