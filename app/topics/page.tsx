import { supabaseAdmin } from "@/lib/supabase/server";
import { getUserRole } from "@/lib/supabase/userRole";
import Link from "next/link";
import TopicSearchForm from "@/components/TopicSearchForm";
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
      {isOwner && <TopicSearchForm />}

      {!topics?.length && (
        <p className="text-neutral-500 text-sm">No topics yet. Search for one above.</p>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {topics?.map((t) => {
          const thumb = pickThumb(t.id);
          const count = countMap[t.id] ?? 0;
          return (
            <div key={t.id} className="relative group">
              <Link href={`/topic/${t.id}`} className="block">
                <div className="relative rounded-xl overflow-hidden aspect-square bg-neutral-900 border border-white/10 shadow-lg shadow-black/40">
                  {/* Thumbnail */}
                  {thumb ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={thumb}
                      alt={t.name}
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                  ) : (
                    <div className="w-full h-full bg-neutral-800" />
                  )}

                  {/* Gradient overlay */}
                  <div className="absolute inset-0" style={{ background: "linear-gradient(to top, rgba(0,0,0,0.97) 0%, rgba(0,0,0,0.6) 50%, rgba(0,0,0,0.1) 100%)" }} />

                  {/* Topic name + count */}
                  <div className="absolute bottom-0 left-0 right-0 p-4">
                    <p
                      className="topic-card-name text-white font-semibold leading-snug"
                      // eslint-disable-next-line react/no-danger
                      {...{} as object}
                      style={{
                        fontSize: `${t.name.length < 15 ? 3.5 : t.name.length < 25 ? 3 : t.name.length < 40 ? 2.5 : t.name.length < 60 ? 2 : 1.6}rem`,
                        display: "-webkit-box",
                        WebkitLineClamp: 3,
                        WebkitBoxOrient: "vertical",
                        overflow: "hidden",
                        lineHeight: 1.2,
                      }}
                    >{t.name}</p>
                    <p className="text-neutral-400 text-xs mt-1">{count} video{count !== 1 ? "s" : ""}</p>
                  </div>
                </div>
              </Link>

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
