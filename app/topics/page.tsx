import { supabaseAdmin } from "@/lib/supabase/server";
import Link from "next/link";
import TopicSearchForm from "@/components/TopicSearchForm";

import DeleteTopicButton from "@/components/DeleteTopicButton";

export const revalidate = 60;

export default async function TopicsPage() {
  const { data: topics } = await supabaseAdmin
    .from("topics")
    .select("id, name, created_at")
    .order("created_at", { ascending: false });

  // Get video counts per topic
  const { data: counts } = await supabaseAdmin
    .from("videos")
    .select("topic_id")
    .not("topic_id", "is", null);

  const countMap: Record<string, number> = {};
  counts?.forEach((v) => { if (v.topic_id) countMap[v.topic_id] = (countMap[v.topic_id] ?? 0) + 1; });

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-bold">Topics</h1>
      <TopicSearchForm />
      <div className="flex flex-col gap-2">
        {topics?.map((t) => (
          <Link key={t.id} href={`/topic/${t.id}`}
            className="flex items-center justify-between bg-neutral-900 rounded-lg px-4 py-3 hover:bg-neutral-800 transition">
            <span className="font-medium">{t.name}</span>
            <div className="flex items-center gap-3">
              <span className="text-xs text-neutral-500">{countMap[t.id] ?? 0} videos</span>
              <DeleteTopicButton id={t.id} />
            </div>
          </Link>
        ))}
        {!topics?.length && <p className="text-neutral-500 text-sm">No topics yet. Search for one above.</p>}
      </div>
    </div>
  );
}
