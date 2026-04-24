import { supabaseAdmin } from "@/lib/supabase/server";
import { getUserRole } from "@/lib/supabase/userRole";
import { notFound } from "next/navigation";
import Link from "next/link";
import VideoCard from "@/components/VideoCard";
import DeleteChannelButton from "@/components/DeleteChannelButton";
import ChannelHeader from "@/components/ChannelHeader";

export const revalidate = 0;

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { data } = await supabaseAdmin.from("channels").select("name").eq("id", id).single();
  return { title: data?.name ?? "Channel" };
}

export default async function ChannelPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const role = await getUserRole();
  const isOwner = role === "owner";

  const { data: channel } = await supabaseAdmin
    .from("channels")
    .select("id, name, url, domain, thumbnail_url, created_at, high_priority")
    .eq("id", id)
    .single();

  if (!channel) notFound();

  const { data: videos } = await supabaseAdmin
    .from("videos")
    .select("id, youtube_id, title, thumbnail_r2_url, published_at, transcript, summary, metadata, topic_id, topics(name)")
    .eq("channel_id", id)
    .order("published_at", { ascending: false });

  // Also fetch topic videos that match this channel by URL
  // Extract channel ID and handle from channel.url for matching
  const channelIdMatch = channel.url.match(/\/channel\/([^/?]+)/);
  const handleMatch = channel.url.match(/\/@([^/?]+)/);
  const channelId = channelIdMatch?.[1];
  const handle = handleMatch?.[1];

  let topicVideos: any[] = [];
  if (channelId || handle) {
    const { data: allTopicVideos } = await supabaseAdmin
      .from("videos")
      .select("id, youtube_id, title, thumbnail_r2_url, published_at, transcript, summary, metadata, topic_id, topics(name)")
      .is("channel_id", null)
      .not("metadata", "is", null);

    // Filter in code: match by channel_id or @handle in metadata
    topicVideos = (allTopicVideos ?? []).filter((v) => {
      const meta = v.metadata ?? {};
      if (channelId && meta.channel_id === channelId) return true;
      if (handle && meta.uploader_url?.includes(`@${handle}`)) return true;
      return false;
    });
  }

  // Merge tracked + topic videos, dedupe by youtube_id, sort by date
  const allVideos = [...(videos ?? []), ...topicVideos];
  const deduped = Array.from(
    new Map(allVideos.map((v) => [v.youtube_id, v])).values()
  ).sort((a, b) => {
    const dateA = a.published_at ? new Date(a.published_at).getTime() : 0;
    const dateB = b.published_at ? new Date(b.published_at).getTime() : 0;
    return dateB - dateA;
  });

  // Active queue items for this channel
  const { data: queueItems } = await supabaseAdmin
    .from("queue")
    .select("id, youtube_id, status, last_error")
    .eq("source_id", id)
    .neq("status", "complete")
    .order("created_at", { ascending: false });

  const videoMap = new Map(deduped.map((v) => [v.youtube_id, v]));
  const queueMap = new Map((queueItems ?? []).map((q) => [q.youtube_id, q]));

  // Merge: all videos + any queue-only entries not yet in videos
  const allYtIds = [
    ...deduped.map((v) => v.youtube_id),
    ...(queueItems ?? [])
      .filter((q) => !videoMap.has(q.youtube_id))
      .map((q) => q.youtube_id),
  ];

  // Last manual scan time for this channel
  const { data: lastScanLog } = await supabaseAdmin
    .from("usage_logs")
    .select("created_at")
    .eq("event", "ytdlp_channel_scan")
    .eq("meta->>channel_id", id)
    .eq("meta->>source", "manual")
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  const lastManualScanAt = lastScanLog?.created_at ?? null;
  const scanCooldownMs = 24 * 60 * 60 * 1000;
  const scanDisabled = lastManualScanAt
    ? Date.now() - new Date(lastManualScanAt).getTime() < scanCooldownMs
    : false;
  const scanEnabledAt = lastManualScanAt && scanDisabled
    ? new Date(new Date(lastManualScanAt).getTime() + scanCooldownMs).toISOString()
    : null;

  const transcribedCount = deduped.filter((v) => v.transcript).length;
  const totalCount = deduped.length;

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <ChannelHeader channel={channel} isOwner={isOwner} scanDisabled={scanDisabled} scanEnabledAt={scanEnabledAt} />

      {/* Back link + stats */}
      <div className="flex items-center justify-between">
        <Link href="/channels" className="text-sm text-neutral-500 hover:text-white transition">
          ← All channels
        </Link>
        <span className="text-xs text-neutral-600">
          {totalCount} video{totalCount !== 1 ? "s" : ""}
          {totalCount > 0 && ` · ${transcribedCount} transcribed`}
        </span>
      </div>

      {/* Video list */}
      {allYtIds.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-stretch">
          {allYtIds.map((ytId) => {
            const video = videoMap.get(ytId);
            const queueItem = queueMap.get(ytId);
            const borderStatus: "processing" | "error" | undefined = queueItem
              ? queueItem.status.startsWith("error_") ? "error" : "processing"
              : undefined;
            const source = video?.topic_id ? "topic" : "channel";
            const topicName = (video?.topics as any)?.name ?? null;

            if (video) {
              return (
                <VideoCard
                  key={ytId}
                  {...video}
                  source={source}
                  topic_name={topicName}
                  borderStatus={borderStatus}
                  queueStatus={queueItem?.status ?? null}
                  last_error={queueItem?.last_error ?? null}
                  duration={(video.metadata as any)?.duration ?? null}
                  vertical
                />
              );
            }

            return (
              <VideoCard
                key={ytId}
                youtube_id={ytId}
                borderStatus={borderStatus}
                queueStatus={queueItem?.status ?? null}
                last_error={queueItem?.last_error ?? null}
                vertical
              />
            );
          })}
        </div>
      ) : (
        <p className="text-neutral-500 text-sm">No videos yet.</p>
      )}

      {/* Danger zone */}
      {isOwner && (
        <div className="mt-8 border-t border-neutral-800 pt-6 flex flex-col gap-3">
          <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">Danger zone</p>
          <DeleteChannelButton id={channel.id} redirect="/channels" />
        </div>
      )}
    </div>
  );
}
