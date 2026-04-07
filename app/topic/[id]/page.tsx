import { supabaseAdmin } from "@/lib/supabase/server";
import VideoCard from "@/components/VideoCard";
import { notFound } from "next/navigation";

export const revalidate = 60;

export default async function TopicPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const { data: topic } = await supabaseAdmin.from("topics").select("*").eq("id", id).single();
  if (!topic) notFound();

  const { data: videos } = await supabaseAdmin
    .from("videos")
    .select("id, youtube_id, title, thumbnail_r2_url, published_at")
    .eq("topic_id", id)
    .order("published_at", { ascending: false });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">{topic.name}</h1>
        <a href={`${process.env.NEXT_PUBLIC_OCI_API_URL}/pdf/topic/${id}`}
          className="text-sm text-neutral-400 hover:text-white border border-neutral-700 rounded px-3 py-1">
          Export PDF
        </a>
      </div>
      <div className="flex flex-col gap-3">
        {videos?.map((v) => <VideoCard key={v.id} {...v} />)}
        {!videos?.length && <p className="text-neutral-500 text-sm">No videos yet — still processing.</p>}
      </div>
    </div>
  );
}
