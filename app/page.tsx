import { supabaseAdmin } from "@/lib/supabase/server";
import VideoCard from "@/components/VideoCard";
import Link from "next/link";

export const revalidate = 60;

export default async function Home() {
  const { data: videos } = await supabaseAdmin
    .from("videos")
    .select("id, youtube_id, title, thumbnail_r2_url, published_at")
    .order("created_at", { ascending: false })
    .limit(20);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">YT Collector</h1>
        <Link href="/search" className="text-sm text-neutral-400 hover:text-white">Search →</Link>
      </div>

      <Link href="/search" className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-4 py-3 text-neutral-500 text-sm hover:border-neutral-500 transition">
        Search videos, transcripts...
      </Link>

      <section>
        <h2 className="text-sm font-semibold text-neutral-400 mb-3">Recent Videos</h2>
        <div className="flex flex-col gap-3">
          {videos?.map((v) => <VideoCard key={v.id} {...v} />)}
          {!videos?.length && <p className="text-neutral-500 text-sm">No videos yet.</p>}
        </div>
      </section>
    </div>
  );
}
