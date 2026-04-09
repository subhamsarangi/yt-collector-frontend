import { supabaseAdmin } from "@/lib/supabase/server";
import VideoCard from "@/components/VideoCard";
import DeleteTopicButton from "@/components/DeleteTopicButton";
import ExportPdfButton from "@/components/ExportPdfButton";
import QueueItem from "@/components/QueueItem";
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

      {/* In-progress queue items */}
      {(queueItems?.length ?? 0) > 0 && (
        <div className="flex flex-col gap-2">
          <p className="text-xs text-neutral-500 uppercase tracking-wider">Processing</p>
          {queueItems?.map((item) => (
            <QueueItem key={item.id} {...item} />
          ))}
        </div>
      )}

      {/* Completed videos */}
      {(videos?.length ?? 0) > 0 && (
        <div className="flex flex-col gap-3">
          {videos?.map((v) => {
            const raw = v as unknown as { channels?: Array<{ name: string }> | null };
            const channelName = raw.channels?.[0]?.name ?? null;
            const queueItem = queueItems?.find((q) => q.youtube_id === v.youtube_id);
            const borderStatus: "processing" | "error" | undefined = queueItem
              ? queueItem.status.startsWith("error_") ? "error" : "processing"
              : undefined;
            return <VideoCard key={v.id} {...v} channel_name={channelName} borderStatus={borderStatus} />;
          })}
        </div>
      )}

      {!hasActivity && (
        <p className="text-neutral-500 text-sm">No videos found for this topic.</p>
      )}
    </div>
  );
}
