"use client";
import { useEffect, useRef, useState } from "react";
import VideoCard from "@/components/VideoCard";

type Video = {
  id: string;
  youtube_id: string;
  title: string | null;
  thumbnail_r2_url: string | null;
  published_at: string | null;
  channel_id: string | null;
  topic_id: string | null;
  transcript: string | null;
  created_at: string;
};

export default function SearchFeed({
  initialVideos,
  initialCursor,
  initialTotalCount,
  q,
  channel,
  topic,
}: {
  initialVideos: Video[];
  initialCursor: string | null;
  initialTotalCount: number;
  q: string;
  channel?: string;
  topic?: string;
}) {
  const [videos, setVideos] = useState<Video[]>(initialVideos);
  const [cursor, setCursor] = useState<string | null>(initialCursor);
  const [totalCount, setTotalCount] = useState(initialTotalCount);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(!initialCursor);
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (done) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !loading) {
          loadMore();
        }
      },
      { rootMargin: "200px" }
    );

    const el = sentinelRef.current;
    if (el) observer.observe(el);
    return () => { if (el) observer.unobserve(el); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cursor, loading, done]);

  async function loadMore() {
    if (loading || done) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({ q });
      if (cursor) params.append("cursor", cursor);
      if (channel) params.append("channel", channel);
      if (topic) params.append("topic", topic);

      const res = await fetch(`/api/search?${params}`);
      const data = await res.json();
      setVideos((prev) => [...prev, ...(data.videos ?? [])]);
      if (data.totalCount) setTotalCount(data.totalCount);
      if (data.nextCursor) {
        setCursor(data.nextCursor);
      } else {
        setDone(true);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <div className="flex flex-col gap-3">
        <p className="text-sm text-neutral-500">
          {totalCount} result{totalCount !== 1 ? "s" : ""} found
        </p>
        {videos.map((v) => (
          <VideoCard key={v.id} {...v} compact={true} />
        ))}
      </div>

      {/* Sentinel — triggers next load when visible */}
      {!done && <div ref={sentinelRef} className="h-1" />}

      {loading && (
        <div className="flex flex-col gap-3 mt-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="flex gap-3 bg-neutral-900 rounded-lg p-3">
              <div className="w-32 h-20 rounded bg-neutral-800 animate-pulse flex-shrink-0" />
              <div className="flex flex-col gap-2 flex-1 justify-center">
                <div className="h-3 w-3/4 rounded bg-neutral-800 animate-pulse" />
                <div className="h-3 w-1/2 rounded bg-neutral-800 animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      )}

      {done && videos.length > 0 && (
        <p className="text-xs text-neutral-600 text-center pt-2">All caught up</p>
      )}
    </>
  );
}
