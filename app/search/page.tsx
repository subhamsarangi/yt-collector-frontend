import { supabaseAdmin } from "@/lib/supabase/server";
import VideoCard from "@/components/VideoCard";

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; channel?: string; topic?: string }>;
}) {
  const { q, channel, topic } = await searchParams;

  let videos: any[] = [];

  if (q) {
    const { data } = await supabaseAdmin
      .from("videos")
      .select("id, youtube_id, title, thumbnail_r2_url, published_at, channel_id, topic_id, transcript")
      .textSearch("search_vector", q, { type: "websearch", config: "english" })
      .limit(30);
    videos = data ?? [];
  }

  if (channel) videos = videos.filter((v) => v.channel_id === channel);
  if (topic)   videos = videos.filter((v) => v.topic_id === topic);

  const { data: channels } = await supabaseAdmin.from("channels").select("id, name");
  const { data: topics }   = await supabaseAdmin.from("topics").select("id, name");

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-bold">Search</h1>

      <form className="flex gap-2">
        <input name="q" defaultValue={q} placeholder="Search videos, transcripts..."
          className="flex-1 bg-neutral-900 border border-neutral-700 rounded px-3 py-2 text-sm" />
        <button type="submit" className="bg-white text-black rounded px-4 py-2 text-sm font-medium hover:bg-neutral-200">
          Search
        </button>
      </form>

      {/* Filters */}
      {q && (
        <div className="flex gap-3 flex-wrap text-sm">
          <select name="channel" form="filter-form" defaultValue={channel}
            className="bg-neutral-900 border border-neutral-700 rounded px-3 py-1 text-sm">
            <option value="">All channels</option>
            {channels?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <select name="topic" form="filter-form" defaultValue={topic}
            className="bg-neutral-900 border border-neutral-700 rounded px-3 py-1 text-sm">
            <option value="">All topics</option>
            {topics?.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
          <form id="filter-form" method="GET">
            <input type="hidden" name="q" value={q} />
            <button type="submit" className="text-neutral-400 hover:text-white">Apply</button>
          </form>
        </div>
      )}

      <div className="flex flex-col gap-3">
        {q && !videos.length && <p className="text-neutral-500 text-sm">No results for "{q}".</p>}
        {videos.map((v) => {
          const snippet = v.transcript
            ? v.transcript.split("\n").find((l: string) => l.toLowerCase().includes(q?.toLowerCase() ?? ""))
            : undefined;
          return <VideoCard key={v.id} {...v} snippet={snippet} />;
        })}
        {!q && <p className="text-neutral-500 text-sm">Enter a search term above.</p>}
      </div>
    </div>
  );
}
