import { supabaseAdmin } from "@/lib/supabase/server";
import SearchForm from "@/components/SearchForm";
import SearchFeed from "@/components/SearchFeed";

export const metadata = { title: "Search" };

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; channel?: string; topic?: string }>;
}) {
  const { q, channel, topic } = await searchParams;

  let videos: any[] = [];
  let nextCursor: string | null = null;
  let totalCount = 0;

  if (q) {
    const PAGE_SIZE = 10;

    // Get total count — search title + description + transcript
    const { count } = await supabaseAdmin
      .from("videos")
      .select("id", { count: "exact", head: true })
      .or(`title.ilike.%${q}%,description.ilike.%${q}%,transcript.ilike.%${q}%`);

    totalCount = count ?? 0;

    const { data } = await supabaseAdmin
      .from("videos")
      .select("id, youtube_id, title, thumbnail_r2_url, published_at, channel_id, topic_id, transcript, created_at")
      .or(`title.ilike.%${q}%,description.ilike.%${q}%,transcript.ilike.%${q}%`)
      .order("created_at", { ascending: false })
      .limit(PAGE_SIZE + 1);

    let filtered = data ?? [];

    if (channel) {
      filtered = filtered.filter((v) => v.channel_id === channel);
    }
    if (topic) {
      filtered = filtered.filter((v) => v.topic_id === topic);
    }

    const hasMore = filtered.length > PAGE_SIZE;
    videos = filtered.slice(0, PAGE_SIZE);
    nextCursor = hasMore ? videos[videos.length - 1]?.created_at : null;
  }

  const { data: channels } = await supabaseAdmin.from("channels").select("id, name");
  const { data: topics }   = await supabaseAdmin.from("topics").select("id, name");

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-bold">Search</h1>

      <SearchForm q={q} />

      {/* Suggestion chips — shown when no query */}
      {!q && (
        <div className="flex flex-wrap gap-2">
          {["AI explained", "history documentary", "coding tutorial", "science news", "startup advice", "philosophy lecture", "economics", "space exploration"].map((term) => (
            <a
              key={term}
              href={`/search?q=${encodeURIComponent(term)}`}
              className="text-xs bg-neutral-800 hover:bg-neutral-700 text-neutral-400 hover:text-white rounded-full px-3 py-1.5 transition"
            >
              {term}
            </a>
          ))}
        </div>
      )}

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

      {q ? (
        <SearchFeed initialVideos={videos} initialCursor={nextCursor} initialTotalCount={totalCount} q={q} channel={channel} topic={topic} />
      ) : (
        <p className="text-neutral-500 text-sm">Enter a search term above.</p>
      )}
    </div>
  );
}
