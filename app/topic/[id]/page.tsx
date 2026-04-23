import { supabaseAdmin } from "@/lib/supabase/server";
import { getUserRole } from "@/lib/supabase/userRole";
import VideoCard from "@/components/VideoCard";
import DeleteTopicButton from "@/components/DeleteTopicButton";
import ExportPdfButton from "@/components/ExportPdfButton";
import TriggerQueueButton from "@/components/TriggerQueueButton";
import SearchLog from "@/components/SearchLog";
import { notFound } from "next/navigation";

export const revalidate = 0;

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { data } = await supabaseAdmin.from("topics").select("name").eq("id", id).single();
  return { title: data?.name ?? "Topic" };
}

export default async function TopicPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const role = await getUserRole();
  const isOwner = role === "owner";

  const { data: topic } = await supabaseAdmin.from("topics").select("*").eq("id", id).single();
  if (!topic) notFound();

  const { data: videos } = await supabaseAdmin
    .from("videos")
    .select("id, youtube_id, title, thumbnail_r2_url, published_at, transcript, metadata, channels(name)")
    .eq("topic_id", id)
    .order("published_at", { ascending: false });

  // Queue items for this topic that aren't complete yet
  const { data: queueItems } = await supabaseAdmin
    .from("queue")
    .select("id, youtube_id, status, retries, whisper_retries, last_error")
    .eq("source_id", id)
    .neq("status", "complete")
    .order("created_at", { ascending: true });

  const hasErrors = (queueItems ?? []).some((i) => i.status.startsWith("error_"));
  const isProcessing = (queueItems ?? []).some((i) =>
    ["metadata_processing", "audio_processing", "transcribing", "summarizing"].includes(i.status)
  );
  const hasPending = (queueItems ?? []).some((i) =>
    ["pending", "metadata_done", "audio_done"].includes(i.status)
  );
  const canTrigger = (hasErrors || hasPending) && !isProcessing;
  const hasActivity = (videos?.length ?? 0) > 0 || (queueItems?.length ?? 0) > 0;

  // Use the stored shorts_only flag on the topic as the primary signal.
  // Fall back to inspecting video URLs in case the flag is missing (legacy topics).
  const isShortsOnly = topic.shorts_only || (videos ?? []).some((v: { metadata?: { duration?: number; webpage_url?: string } }) => {
    const meta = v.metadata ?? {};
    return meta.webpage_url?.includes("/shorts/") && meta.duration !== undefined && meta.duration <= 180;
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-bold">{topic.name}</h1>
          {isShortsOnly && (
            <span className="bg-red-500 text-white text-xs font-semibold px-2 py-1 rounded">
              Shorts only
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          {isOwner && hasActivity && <TriggerQueueButton enabled={canTrigger} />}
          {(videos?.length ?? 0) > 0 && (
            <ExportPdfButton href={`/api/pdf/topic/${id}`} filename={`topic-${id}.pdf`} />
          )}
          {isOwner && <DeleteTopicButton id={id} redirect={true} />}
        </div>
      </div>

      {/* Search log */}
      {topic.search_log && Array.isArray(topic.search_log) && topic.search_log.length > 0 && (
        <SearchLog log={topic.search_log as Record<string, unknown>[]} />
      )}

      {/* Unified video + queue list */}
      {hasActivity && (
        <div className={isShortsOnly
          ? "grid grid-cols-1 md:grid-cols-5 gap-3"
          : "grid grid-cols-1 md:grid-cols-2 gap-3"
        }>
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
                    shorts={isShortsOnly}
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
                  shorts={isShortsOnly}
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
