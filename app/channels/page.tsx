import { supabaseAdmin } from "@/lib/supabase/server";
import { getUserRole } from "@/lib/supabase/userRole";
import VideoCard from "@/components/VideoCard";
import AddChannelForm from "../../components/AddChannelForm";
import DeleteChannelButton from "../../components/DeleteChannelButton";
import BulkImportChannels from "../../components/BulkImportChannels";
import ScanChannelsButton from "../../components/ScanChannelsButton";
import EditChannelModal from "../../components/EditChannelModal";

export const revalidate = 60;

const ACTIVE_STATUSES = [
  "pending",
  "metadata_processing",
  "metadata_done",
  "audio_processing",
  "audio_done",
  "transcribing",
  "summarizing",
];

export default async function ChannelsPage() {
  const role = await getUserRole();
  const isOwner = role === "owner";
  const { data: channels } = await supabaseAdmin
    .from("channels")
    .select("id, name, url, domain, thumbnail_url, created_at")
    .order("domain");

  const domains = [...new Set(channels?.map((c) => c.domain) ?? [])];

  const [{ data: videos }, { data: queueItems }] = await Promise.all([
    supabaseAdmin
      .from("videos")
      .select("id, youtube_id, title, thumbnail_r2_url, published_at, channel_id")
      .not("channel_id", "is", null)
      .order("published_at", { ascending: false })
      .limit(60),
    supabaseAdmin
      .from("queue")
      .select("id, youtube_id, source_id, status, last_error")
      .eq("source", "channel")
      .in("status", ACTIVE_STATUSES)
      .order("created_at", { ascending: false }),
  ]);

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Channels</h1>
        {isOwner && <ScanChannelsButton />}
      </div>
      {isOwner && <AddChannelForm />}
      {isOwner && <BulkImportChannels />}

      {domains.map((domain) => (
        <section key={domain}>
          <h2 className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-4">{domain}</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {channels?.filter((c) => c.domain === domain).map((channel) => {
              const channelVideos = videos?.filter((v) => v.channel_id === channel.id).slice(0, 3) ?? [];
              const channelQueue = queueItems?.filter((q) => q.source_id === channel.id) ?? [];
              const hasContent = channelVideos.length > 0 || channelQueue.length > 0;
              return (
                <div key={channel.id} className="bg-neutral-900 rounded-xl overflow-hidden flex flex-col">
                  {/* Channel header */}
                  <div className="flex items-center gap-3 px-4 py-3 border-b border-neutral-800">
                    {channel.thumbnail_url ? (
                      <img src={channel.thumbnail_url} alt={channel.name}
                        className="w-9 h-9 rounded-full object-cover flex-shrink-0" />
                    ) : (
                      <div className="w-9 h-9 rounded-full bg-neutral-700 flex items-center justify-center text-sm flex-shrink-0">
                        {channel.name[0]}
                      </div>
                    )}
                    <a href={channel.url} target="_blank" rel="noopener noreferrer"
                      className="font-medium text-sm hover:text-neutral-300 truncate flex-1">
                      {channel.name}
                    </a>
                    {isOwner && <EditChannelModal channel={channel} />}
                    {isOwner && <DeleteChannelButton id={channel.id} />}
                  </div>
                  {/* Queued / processing items */}
                  {channelQueue.map((q) => (
                    <VideoCard
                      key={q.id}
                      youtube_id={q.youtube_id}
                      compact={true}
                      queueStatus={q.status}
                      borderStatus={q.status.startsWith("error_") ? "error" : "processing"}
                      last_error={q.last_error}
                    />
                  ))}
                  {/* Latest completed videos */}
                  <div className="flex flex-col gap-0 divide-y divide-neutral-800 flex-1">
                    {channelVideos.map((v) => <VideoCard key={v.id} {...v} compact={true} />)}
                    {!hasContent && (
                      <p className="text-xs text-neutral-600 px-4 py-3">No videos yet.</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      ))}

      {!channels?.length && <p className="text-neutral-500 text-sm">No channels added yet.</p>}
    </div>
  );
}
