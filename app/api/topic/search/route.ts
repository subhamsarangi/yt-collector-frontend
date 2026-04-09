import { NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";

const OCI = process.env.OCI_API_URL!;
const OCI_KEY = process.env.OCI_API_KEY!;

function sse(data: object) {
  return `data: ${JSON.stringify(data)}\n\n`;
}

export async function POST(req: NextRequest) {
  const { topic } = await req.json();
  if (!topic) {
    return new Response(JSON.stringify({ error: "Missing topic" }), { status: 400 });
  }

  const stream = new TransformStream();
  const writer = stream.writable.getWriter();
  const enc = new TextEncoder();
  const send = (payload: object) => writer.write(enc.encode(sse(payload)));

  (async () => {
    try {
      // Upsert topic record
      await send({ step: "Creating topic record..." });
      const { data: existing } = await supabaseAdmin
        .from("topics").select("id").eq("name", topic).single();

      let topic_id: string;
      if (existing) {
        topic_id = existing.id;
      } else {
        const { data: created } = await supabaseAdmin
          .from("topics").insert({ name: topic }).select("id").single();
        topic_id = created!.id;
      }

      // Stream from OCI — pipe all events straight through to the client
      await send({ step: "Connecting to search service..." });
      const ociRes = await fetch(`${OCI}/search/enhanced/stream`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${OCI_KEY}` },
        body: JSON.stringify({ topic }),
      });

      if (!ociRes.ok || !ociRes.body) {
        await send({ error: "OCI search failed" });
        await writer.close();
        return;
      }

      // Read OCI SSE stream, forward events, collect final results
      const reader = ociRes.body.getReader();
      const dec = new TextDecoder();
      let buf = "";
      let results: Array<{ id: string }> = [];

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });

        const lines = buf.split("\n");
        buf = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const payload = JSON.parse(line.slice(6));
            // Forward everything from OCI as-is
            await send(payload);
            // Capture results when they arrive
            if (payload.results) results = payload.results;
          } catch { /* skip malformed */ }
        }
      }

      // Step — dedup and queue
      await send({ step: `Deduplicating and queuing ${results.length} videos...` });
      let added = 0;
      for (const entry of results) {
        const youtube_id = entry.id;
        if (!youtube_id) continue;

        const { data: dupe } = await supabaseAdmin
          .from("videos").select("id").eq("youtube_id", youtube_id).single();
        if (dupe) {
          await send({ step: `Skipped (already exists): ${youtube_id}` });
          continue;
        }

        await supabaseAdmin.from("queue").insert({
          youtube_id,
          source: "topic",
          source_id: topic_id,
          status: "pending",
        });
        added++;
        await send({ step: `Queued: ${youtube_id}` });
      }

      await send({ done: true, topic_id, added });
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
