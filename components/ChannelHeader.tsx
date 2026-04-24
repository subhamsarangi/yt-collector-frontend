"use client";
import { useState } from "react";
import Link from "next/link";
import ScanChannelButton from "@/components/ScanChannelButton";
import ToggleHighPriorityButton from "@/components/ToggleHighPriorityButton";
import EditChannelModal from "@/components/EditChannelModal";

type Channel = {
  id: string;
  name: string;
  url: string;
  domain: string;
  thumbnail_url: string | null;
  created_at: string;
  high_priority?: boolean;
};

export default function ChannelHeader({
  channel,
  isOwner,
}: {
  channel: Channel;
  isOwner: boolean;
}) {
  const [isHighPriority, setIsHighPriority] = useState(channel.high_priority ?? false);

  return (
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
          <div className="flex items-center gap-2">
            <a
              href={channel.url}
              target="_blank"
              rel="noopener noreferrer"
              className="font-bold text-lg hover:text-neutral-300 transition leading-tight"
            >
              {channel.name}
            </a>
            {isHighPriority && (
              <span className="text-red-500 text-xl" title="High priority channel">★</span>
            )}
          </div>
          <div className="flex items-center gap-2 text-xs text-neutral-500">
            <span className="bg-neutral-800 rounded px-2 py-0.5">{channel.domain}</span>
            <span>·</span>
            <span>Added {new Date(channel.created_at).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })}</span>
          </div>
        </div>
      </div>

      {isOwner && (
        <div className="flex items-center gap-2 flex-shrink-0">
          <ScanChannelButton channelId={channel.id} />
          <ToggleHighPriorityButton 
            channelId={channel.id} 
            isHighPriority={isHighPriority}
            onToggle={setIsHighPriority}
          />
          <EditChannelModal channel={channel} />
        </div>
      )}
    </div>
  );
}
