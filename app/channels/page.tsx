import { supabaseAdmin } from "@/lib/supabase/server";
import VideoCard from "@/components/VideoCard";
import AddChannelForm from "../../components/AddChannelForm";

export const revalidate = 60;

export default async function ChannelsPage() {
  const { data: channels } = await supabaseAdmin
    .from("channels")
    .select("id, name, url, domain")
    .order("domain");

  const domains = [...new Set(channels?.map((c) => c.domain) ?? [])];

  // Fetch latest 3 videos per channel
  const { data: videos } = await supabaseAdmin
    .from("videos")
    .select("id, youtube_id, title, thumbnail_r2_url, published_at, channel_id")
    .not("channel_id", "is", null)
    .order("published_at", { ascending: false })
    .limit(60);

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Channels</h1>
      </div>

      <AddChannelForm />

      {domains.map((domain) => (
        <section key={domain}>
          <h2 className="text-sm font-semibold text-neutral-400 uppercase tracking-wider mb-3">{domain}</h2>
          <div className="flex flex-col gap-6">
            {channels?.filter((c) => c.domain === domain).map((channel) => {
              const channelVideos = videos?.filter((v) => v.channel_id === channel.id).slice(0, 3) ?? [];
              return (
                <div key={channel.id} className="bg-neutral-900 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <a href={channel.url} target="_blank" rel="noopener noreferrer"
                      className="font-medium hover:text-neutral-300">{channel.name}</a>
                    <DeleteChannelButton id={channel.id} />
                  </div>
                  <div className="flex flex-col gap-2">
                    {channelVideos.map((v) => <VideoCard key={v.id} {...v} />)}
                    {!channelVideos.length && <p className="text-xs text-neutral-600">No videos yet.</p>}
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

function DeleteChannelButton({ id }: { id: string }) {
  return (
    <form action={`/api/channels/${id}/delete`} method="POST">
      <button type="submit" className="text-xs text-red-500 hover:text-red-400">Remove</button>
    </form>
  );
}
