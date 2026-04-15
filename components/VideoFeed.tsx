"use client";
import { useEffect, useRef, useState } from "react";
import VideoCard from "@/components/VideoCard";

type Video = {
  id: string;
  youtube_id: string;
  title: string | null;
  thumbnail_r2_url: string | null;
  published_at: string | null;
  created_at: string;
  channel_id: string | null;
  topic_id: string | null;
  channels: { name: string } | null;
  topics: { name: string } | null;
};

export default function VideoFeed({ initialVideos, initialCursor }: {
  initialVideos: Video[];
  initialCursor: string | null;
}) {
  const [videos, setVideos] = useState<Video[]>(initialVideos);
  const [cursor, setCursor] = useState<string | null>(initialCursor);
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
      const url = cursor ? `/api/videos?cursor=${encodeURIComponent(cursor)}` : "/api/videos";
      const res = await fetch(url);
      const data = await res.json();
      setVideos((prev) => [...prev, ...(data.videos ?? [])]);
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
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {videos.map((v) => {
          const source = v.channel_id ? "channel" : v.topic_id ? "topic" : null;
          return (
            <VideoCard
              key={v.id}
              {...v}
              channel_name={v.channels?.name ?? null}
              source={source}
              topic_name={v.topics?.name ?? null}
            />
          );
        })}
      </div>

      {/* Sentinel — triggers next load when visible */}
      {!done && <div ref={sentinelRef} className="h-1" />}

      {loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
          {[...Array(4)].map((_, i) => (
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
