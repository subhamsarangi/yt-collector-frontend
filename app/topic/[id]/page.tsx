import { supabaseAdmin } from "@/lib/supabase/server";
import VideoCard from "@/components/VideoCard";
import DeleteTopicButton from "@/components/DeleteTopicButton";
import ExportPdfButton from "@/components/ExportPdfButton";
import TriggerQueueButton from "@/components/TriggerQueueButton";
import { notFound } from "next/navigation";

export const revalidate = 0;

export default async function TopicPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const { data: topic } = await supabaseAdmin.from("topics").select("*").eq("id", id).single();
  if (!topic) notFound();

  const { data: videos } = await supabaseAdmin
    .from("videos")
    .select("id, youtube_id, title, thumbnail_r2_url, published_at, channels(name)")
    .eq("topic_id", id)
    .order("published_at", { ascending: false });

  // Queue items for this topic that aren't complete yet
  const { data: queueItems } = await supabaseAdmin
    .from("queue")
    .select("id, youtube_id, status, retries, whisper_retries, last_error")
    .eq("source_id", id)
    .neq("status", "complete")
    .order("created_at", { ascending: true });

  const allPending = (queueItems?.length ?? 0) > 0 && (queueItems ?? []).every((i) => i.status === "pending");
  const hasActivity = (videos?.length ?? 0) > 0 || (queueItems?.length ?? 0) > 0;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">{topic.name}</h1>
        <div className="flex items-center gap-3">
          <TriggerQueueButton enabled={allPending} />
          {(videos?.length ?? 0) > 0 && (
            <ExportPdfButton href={`/api/pdf/topic/${id}`} filename={`topic-${id}.pdf`} />
          )}
          <DeleteTopicButton id={id} redirect={true} />
        </div>
      </div>

      {/* Unified video + queue list */}
      {hasActivity && (
        <div className="flex flex-col gap-3">
          {(() => {
            const completedVideos = videos ?? [];
            const pendingItems = queueItems ?? [];
            const videoMap = new Map(completedVideos.map((v) => [v.youtube_id, v]));
            const allIds = [
              ...completedVideos.map((v) => v.youtube_id),
              ...pendingItems.filter((q) => !videoMap.has(q.youtube_id)).map((q) => q.youtube_id),
            ];
            return allIds.map((ytId) => {
              const video = videoMap.get(ytId);
              const queueItem = pendingItems.find((q) => q.youtube_id === ytId);
              const borderStatus: "processing" | "error" | undefined = queueItem
                ? queueItem.status.startsWith("error_") ? "error" : "processing"
                : undefined;

              if (video) {
                const raw = video as unknown as { channels?: Array<{ name: string }> | null };
                const channelName = raw.channels?.[0]?.name ?? null;
                return (
                  <VideoCard
                    key={ytId}
                    {...video}
                    channel_name={channelName}
                    borderStatus={borderStatus}
                    queueStatus={queueItem?.status ?? null}
                    last_error={queueItem?.last_error ?? null}
                  />
                );
              }

              // Queue-only entry — no video data yet, show placeholders
              return (
                <VideoCard
                  key={ytId}
                  youtube_id={ytId}
                  borderStatus={borderStatus}
                  queueStatus={queueItem?.status ?? null}
                  last_error={queueItem?.last_error ?? null}
                />
              );
            });
          })()}
        </div>
      )}

      {!hasActivity && (
        <p className="text-neutral-500 text-sm">No videos found for this topic.</p>
      )}
    </div>
  );
}
