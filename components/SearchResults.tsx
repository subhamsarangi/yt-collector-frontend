"use client";
import { Suspense } from "react";
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
};

function ResultsSkeleton() {
  return (
    <div className="flex flex-col gap-3">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="flex gap-3 bg-neutral-900 rounded-lg p-3">
          <div className="w-32 h-20 rounded bg-neutral-800 animate-pulse flex-shrink-0" />
          <div className="flex flex-col gap-2 flex-1 justify-center">
            <div className="h-3 w-3/4 rounded bg-neutral-800 animate-pulse" />
            <div className="h-3 w-1/2 rounded bg-neutral-800 animate-pulse" />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function SearchResults({
  videos,
  q,
}: {
  videos: Video[];
  q?: string;
}) {
  return (
    <Suspense fallback={<ResultsSkeleton />}>
      <div className="flex flex-col gap-3">
        {q && (
          <p className="text-sm text-neutral-500">
            {videos.length} result{videos.length !== 1 ? "s" : ""} found
          </p>
        )}
        {q && !videos.length && <p className="text-neutral-500 text-sm">No results for "{q}".</p>}
        {videos.map((v) => {
          const snippet = v.transcript
            ? v.transcript.split("\n").find((l: string) => l.toLowerCase().includes(q?.toLowerCase() ?? ""))
            : undefined;
          return <VideoCard key={v.id} {...v} snippet={snippet} />;
        })}
        {!q && <p className="text-neutral-500 text-sm">Enter a search term above.</p>}
      </div>
    </Suspense>
  );
}
