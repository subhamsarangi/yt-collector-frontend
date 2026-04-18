import { supabaseAdmin } from "@/lib/supabase/server";
import HomeSearchBox from "@/components/HomeSearchBox";
import VideoFeed from "@/components/VideoFeed";

export const revalidate = 60;

export const metadata = { title: "Home" };

const PAGE_SIZE = 20;

export default async function Home() {
  const { data: videos } = await supabaseAdmin
    .from("videos")
    .select("id, youtube_id, title, thumbnail_r2_url, published_at, created_at, channel_id, topic_id, channels(name), topics(name)")
    .order("created_at", { ascending: false })
    .limit(PAGE_SIZE);

  const initialVideos = (videos ?? []) as any[];
  const initialCursor =
    initialVideos.length === PAGE_SIZE
      ? initialVideos[initialVideos.length - 1].created_at
      : null;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">YT Collector</h1>
      </div>

      <HomeSearchBox />

      <section>
        <h2 className="text-sm font-semibold text-neutral-400 mb-3">Recent Videos</h2>
        {initialVideos.length === 0 ? (
          <p className="text-neutral-500 text-sm">No videos yet.</p>
        ) : (
          <VideoFeed initialVideos={initialVideos} initialCursor={initialCursor} />
        )}
      </section>
    </div>
  );
}
