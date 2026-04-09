import { NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";

const OCI = process.env.OCI_API_URL!;
const OCI_KEY = process.env.OCI_API_KEY!;

function sse(data: object) {
  return `data: ${JSON.stringify(data)}\n\n`;
}

function extractYouTubeUrls(text: string): string[] {
  return text
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.startsWith("https://www.youtube.com"));
}

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  if (!file) return new Response(JSON.stringify({ error: "No file" }), { status: 400 });

  const text = await file.text();
  const urls = extractYouTubeUrls(text);

  const stream = new TransformStream();
  const writer = stream.writable.getWriter();
  const enc = new TextEncoder();
  const send = (payload: object) => writer.write(enc.encode(sse(payload)));

  (async () => {
    try {
      await send({ step: `Found ${urls.length} YouTube URLs in file.` });

      // Fetch existing URLs to dedup
      const { data: existing } = await supabaseAdmin.from("channels").select("url");
      const existingSet = new Set((existing ?? []).map((c) => c.url));

      const toProcess = urls.filter((u) => !existingSet.has(u));
      const skipped = urls.length - toProcess.length;

      if (skipped > 0) await send({ step: `Skipped ${skipped} already-existing channel(s).` });
      await send({ step: `Processing ${toProcess.length} new channel(s)...` });

      let added = 0;
      let failed = 0;

      for (const url of toProcess) {
        try {
          await send({ step: `Fetching info: ${url}` });
          const res = await fetch(`${OCI}/channel/info`, {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${OCI_KEY}` },
            body: JSON.stringify({ channel_url: url }),
          });

          if (!res.ok) throw new Error(`OCI returned ${res.status}`);
          const info = await res.json();
          const name = info.name || url;

          await supabaseAdmin.from("channels").insert({
            name,
            url,
            domain: "Uncategorized",
            thumbnail_url: info.thumbnail_url || null,
          });

          added++;
          await send({ added_channel: { url, name } });
        } catch (e) {
          failed++;
          await send({ failed_channel: { url, error: e instanceof Error ? e.message : String(e) } });
        }
      }

      await send({ done: true, added, failed, skipped });
    } catch (e) {
      await send({ error: e instanceof Error ? e.message : "Unexpected error" });
    } finally {
      await writer.close();
    }
  })();

  return new Response(stream.readable, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
