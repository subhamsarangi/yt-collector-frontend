"use client";
import { useState } from "react";
import Link from "next/link";
import VideoCard from "@/components/VideoCard";

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

export default function ChannelCard({
  channel,
  videos,
  queueItems,
}: {
  channel: Channel;
  videos: Video[];
  queueItems: QueueItem[];
}) {
  const [loading, setLoading] = useState(false);
  const channelVideos = videos.filter((v) => v.channel_id === channel.id);
  const channelQueue = queueItems.filter((q) => q.source_id === channel.id);
  const hasContent = channelVideos.length > 0 || channelQueue.length > 0;

  return (
    <div className="bg-neutral-900 rounded-xl overflow-hidden flex flex-col">
      {/* Channel header */}
      <div className="flex items-center gap-3 px-4 py-3 bg-neutral-800 border-b border-neutral-700">
        {channel.thumbnail_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={channel.thumbnail_url}
            alt={channel.name}
            className="w-9 h-9 rounded-full object-cover flex-shrink-0"
          />
        ) : (
          <div className="w-9 h-9 rounded-full bg-neutral-700 flex items-center justify-center text-sm flex-shrink-0">
            {channel.name[0]}
          </div>
        )}
        <Link
          href={`/channel/${channel.id}`}
          onClick={() => !loading && setLoading(true)}
          className={`font-medium text-sm hover:text-neutral-300 truncate flex-1 ${loading ? "cursor-not-allowed" : ""}`}
        >
          {channel.name}
        </Link>
      </div>

      {/* Loading overlay */}
      {loading && (
        <div className="absolute inset-0 bg-black/50 rounded-xl flex items-center justify-center z-10">
          <svg
            className="w-8 h-8 animate-spin text-white"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        </div>
      )}

      {/* Queued / processing items */}
      <div className="pt-3 pb-3">
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
          {channelVideos.map((v) => (
            <VideoCard key={v.id} {...v} compact={true} />
          ))}
          {!hasContent && (
            <p className="text-xs text-neutral-600 px-4 py-3">No videos in the last 24hrs.</p>
          )}
        </div>
      </div>
    </div>
  );
}
