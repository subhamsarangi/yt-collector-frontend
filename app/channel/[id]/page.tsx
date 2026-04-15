import { supabaseAdmin } from "@/lib/supabase/server";
import { getUserRole } from "@/lib/supabase/userRole";
import { notFound } from "next/navigation";
import Link from "next/link";
import VideoCard from "@/components/VideoCard";
import EditChannelModal from "@/components/EditChannelModal";
import DeleteChannelButton from "@/components/DeleteChannelButton";

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
    .select("id, name, url, domain, thumbnail_url, created_at")
    .eq("id", id)
    .single();

  if (!channel) notFound();

  const { data: videos } = await supabaseAdmin
    .from("videos")
    .select("id, youtube_id, title, thumbnail_r2_url, published_at, transcript, summary")
    .eq("channel_id", id)
    .order("published_at", { ascending: false });

  // Active queue items for this channel
  const { data: queueItems } = await supabaseAdmin
    .from("queue")
    .select("id, youtube_id, status, last_error")
    .eq("source_id", id)
    .neq("status", "complete")
    .order("created_at", { ascending: false });

  const videoMap = new Map((videos ?? []).map((v) => [v.youtube_id, v]));
  const queueMap = new Map((queueItems ?? []).map((q) => [q.youtube_id, q]));

  // Merge: completed videos + any queue-only entries not yet in videos
  const allYtIds = [
    ...(videos ?? []).map((v) => v.youtube_id),
    ...(queueItems ?? [])
      .filter((q) => !videoMap.has(q.youtube_id))
      .map((q) => q.youtube_id),
  ];

  const transcribedCount = (videos ?? []).filter((v) => v.transcript).length;
  const totalCount = videos?.length ?? 0;

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          {channel.thumbnail_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={channel.thumbnail_url}
              alt={channel.name}
              className="w-12 h-12 rounded-full object-cover flex-shrink-0"
            />
          ) : (
            <div className="w-12 h-12 rounded-full bg-neutral-700 flex items-center justify-center text-lg font-bold flex-shrink-0">
              {channel.name[0]}
            </div>
          )}
          <div className="flex flex-col gap-0.5">
            <a
              href={channel.url}
              target="_blank"
              rel="noopener noreferrer"
              className="font-bold text-lg hover:text-neutral-300 transition leading-tight"
            >
              {channel.name}
            </a>
            <div className="flex items-center gap-2 text-xs text-neutral-500">
              <span className="bg-neutral-800 rounded px-2 py-0.5">{channel.domain}</span>
              <span>·</span>
              <span>Added {new Date(channel.created_at).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })}</span>
            </div>
          </div>
        </div>

        {isOwner && (
          <div className="flex items-center gap-2 flex-shrink-0">
            <EditChannelModal channel={channel} />
          </div>
        )}
      </div>

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
        <div className="flex flex-col gap-3">
          {allYtIds.map((ytId) => {
            const video = videoMap.get(ytId);
            const queueItem = queueMap.get(ytId);
            const borderStatus: "processing" | "error" | undefined = queueItem
              ? queueItem.status.startsWith("error_") ? "error" : "processing"
              : undefined;

            if (video) {
              return (
                <VideoCard
                  key={ytId}
                  {...video}
                  borderStatus={borderStatus}
                  queueStatus={queueItem?.status ?? null}
                  last_error={queueItem?.last_error ?? null}
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
