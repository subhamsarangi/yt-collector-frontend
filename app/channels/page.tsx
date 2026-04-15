import { supabaseAdmin } from "@/lib/supabase/server";
import { getUserRole } from "@/lib/supabase/userRole";
import AddChannelForm from "../../components/AddChannelForm";
import BulkImportChannels from "../../components/BulkImportChannels";
import ScanChannelsButton from "../../components/ScanChannelsButton";
import LastScanModal from "../../components/LastScanModal";
import ChannelsGrid from "../../components/ChannelsGrid";

export const revalidate = 60;

export const metadata = { title: "Channels" };

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

  const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const [{ data: videos }, { data: queueItems }] = await Promise.all([
    supabaseAdmin
      .from("videos")
      .select("id, youtube_id, title, thumbnail_r2_url, published_at, channel_id")
      .not("channel_id", "is", null)
      .gte("created_at", since24h)
      .order("created_at", { ascending: false }),
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
        {role !== null && (
          <div className="flex items-center gap-2">
            <LastScanModal />
            {isOwner && <ScanChannelsButton channelCount={channels?.length ?? 0} />}
          </div>
        )}
      </div>
      {isOwner && <AddChannelForm />}
      {isOwner && <BulkImportChannels />}

      <ChannelsGrid
        channels={channels ?? []}
        videos={videos ?? []}
        queueItems={queueItems ?? []}
        isOwner={isOwner}
      />

      {!channels?.length && (
        <p className="text-neutral-500 text-sm">No channels added yet.</p>
      )}
    </div>
  );
}
