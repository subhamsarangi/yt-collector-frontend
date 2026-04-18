import { supabaseAdmin } from "@/lib/supabase/server";
import { getUserRole } from "@/lib/supabase/userRole";
import TopicSearchForm from "@/components/TopicSearchForm";
import TopicsFilter from "@/components/TopicsFilter";
import TopicCard from "@/components/TopicCard";
import DeleteTopicButton from "@/components/DeleteTopicButton";

export const revalidate = 60;

export const metadata = { title: "Topics" };

export default async function TopicsPage() {
  const role = await getUserRole();
  const isOwner = role === "owner";

  const { data: topics } = await supabaseAdmin
    .from("topics")
    .select("id, name, created_at")
    .order("created_at", { ascending: false });

  // Fetch thumbnails for each topic — pick one randomly server-side
  const { data: videos } = await supabaseAdmin
    .from("videos")
    .select("topic_id, thumbnail_r2_url")
    .not("topic_id", "is", null)
    .not("thumbnail_r2_url", "is", null);

  // Group thumbnails by topic_id
  const thumbMap: Record<string, string[]> = {};
  videos?.forEach((v) => {
    if (v.topic_id && v.thumbnail_r2_url) {
      if (!thumbMap[v.topic_id]) thumbMap[v.topic_id] = [];
      thumbMap[v.topic_id].push(v.thumbnail_r2_url);
    }
  });

  // Pick a random thumbnail per topic
  const pickThumb = (topicId: string): string | null => {
    const arr = thumbMap[topicId];
    if (!arr?.length) return null;
    return arr[Math.floor(Math.random() * arr.length)];
  };

  const countMap: Record<string, number> = {};
  videos?.forEach((v) => {
    if (v.topic_id) countMap[v.topic_id] = (countMap[v.topic_id] ?? 0) + 1;
  });

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-bold">Topics</h1>

      {isOwner && (
        <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-4">
          <h2 className="text-sm font-semibold text-neutral-400 mb-3 uppercase tracking-wider">Create new topic</h2>
          <TopicSearchForm />
        </div>
      )}

      {!topics?.length && (
        <p className="text-neutral-500 text-sm">No topics yet. Search for one above.</p>
      )}

      {topics && topics.length > 0 && (
        <TopicsFilter />
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {topics?.map((t) => {
          const thumb = pickThumb(t.id);
          const count = countMap[t.id] ?? 0;
          return (
            <div key={t.id} className="relative group" data-topic-card data-topic-name={t.name}>
              <TopicCard id={t.id} name={t.name} thumb={thumb} count={count} />

              {/* Delete button — top right, owner only */}
              {isOwner && (
                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <DeleteTopicButton id={t.id} />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
