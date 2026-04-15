import { NextResponse } from "next/server";
import { requireOwner } from "@/lib/supabase/requireOwner";
import { supabaseAdmin } from "@/lib/supabase/server";
import { uploadToR2 } from "@/lib/r2";

export const maxDuration = 300;

export async function POST() {
  const denied = await requireOwner();
  if (denied) return denied;

  // Fetch channels whose thumbnail is still a YouTube/Google URL (not already in R2)
  const { data: channels } = await supabaseAdmin
    .from("channels")
    .select("id, url, thumbnail_url")
    .not("thumbnail_url", "is", null);

  const r2Base = (process.env.R2_PUBLIC_URL ?? "").replace(/\/$/, "");
  const toMigrate = (channels ?? []).filter(
    (c) => c.thumbnail_url && !c.thumbnail_url.startsWith(r2Base)
  );

  let migrated = 0;
  let failed = 0;

  for (const channel of toMigrate) {
    try {
      const imgRes = await fetch(channel.thumbnail_url!, { signal: AbortSignal.timeout(10_000) });
      if (!imgRes.ok) { failed++; continue; }

      const buffer = Buffer.from(await imgRes.arrayBuffer());
      const contentType = imgRes.headers.get("content-type") ?? "image/jpeg";
      const slug = channel.url
        .replace(/https?:\/\/(www\.)?youtube\.com\/@?/, "")
        .replace(/[^a-zA-Z0-9_-]/g, "_")
        .slice(0, 64);

      const r2Url = await uploadToR2(`channels/${slug}.jpg`, buffer, contentType);

      await supabaseAdmin
        .from("channels")
        .update({ thumbnail_url: r2Url })
        .eq("id", channel.id);

      migrated++;
    } catch {
      failed++;
    }
  }

  return NextResponse.json({ ok: true, migrated, failed, skipped: (channels?.length ?? 0) - toMigrate.length });
}
