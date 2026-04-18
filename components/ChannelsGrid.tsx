"use client";
import { useState } from "react";
import VideoCard from "@/components/VideoCard";
import EditChannelModal from "@/components/EditChannelModal";
import ChannelCard from "@/components/ChannelCard";

type Channel = {
  id: string;
  name: string;
  url: string;
  domain: string;
  thumbnail_url: string | null;
  created_at: string;
};

type Video = {
  id: string;
  youtube_id: string;
  title: string | null;
  thumbnail_r2_url: string | null;
  published_at: string | null;
  channel_id: string | null;
};

type QueueItem = {
  id: string;
  youtube_id: string;
  source_id: string | null;
  status: string;
  last_error: string | null;
};

export default function ChannelsGrid({
  channels,
  videos,
  queueItems,
  isOwner,
}: {
  channels: Channel[];
  videos: Video[];
  queueItems: QueueItem[];
  isOwner: boolean;
}) {
  const [activeOnly, setActiveOnly] = useState(false);

  const domains = [...new Set(channels.map((c) => c.domain))];

  // Channel ids that have videos or queue items in the last 24h
  const activeChannelIds = new Set([
    ...videos.map((v) => v.channel_id).filter(Boolean),
    ...queueItems.map((q) => q.source_id).filter(Boolean),
  ] as string[]);

  const visibleChannels = activeOnly
    ? channels.filter((c) => activeChannelIds.has(c.id))
    : channels;

  const visibleDomains = [...new Set(visibleChannels.map((c) => c.domain))];

  return (
    <div className="flex flex-col gap-8">
      {/* Toggle */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setActiveOnly((v) => !v)}
          className={`text-sm px-3 py-1.5 rounded-lg transition cursor-pointer ${
            activeOnly
              ? "bg-green-700 text-white hover:bg-green-600"
              : "bg-neutral-800 text-neutral-400 hover:bg-neutral-700 hover:text-white"
          }`}
        >
          {activeOnly ? "✓ Active in last 24h" : "Show active only"}
        </button>
        {activeOnly && (
          <span className="text-xs text-neutral-500">
            {visibleChannels.length} of {channels.length} channel{channels.length !== 1 ? "s" : ""}
          </span>
        )}
      </div>

      {visibleDomains.length === 0 && activeOnly && (
        <p className="text-neutral-500 text-sm">No channels had new videos in the last 24hrs.</p>
      )}

      {visibleDomains.map((domain) => (
        <section key={domain}>
          <div className="flex items-center gap-4 mb-4">
            <h2 className="text-base font-bold text-neutral-100 whitespace-nowrap">{domain}</h2>
            <div className="flex-1 h-px bg-neutral-800" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {visibleChannels.filter((c) => c.domain === domain).map((channel) => {
              const channelVideos = videos.filter((v) => v.channel_id === channel.id);
              const channelQueue = queueItems.filter((q) => q.source_id === channel.id);
              return (
                <ChannelCard
                  key={channel.id}
                  channel={channel}
                  videos={channelVideos}
                  queueItems={channelQueue}
                />
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
