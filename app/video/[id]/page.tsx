import { supabaseAdmin } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import Link from "next/link";

export const revalidate = 60;

function formatDuration(seconds: number) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return h > 0 ? `${h}h ${m}m ${s}s` : `${m}m ${s}s`;
}

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    year: "numeric", month: "short", day: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

export default async function VideoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const { data: video } = await supabaseAdmin
    .from("videos")
    .select("*, channels(id, name, url), topics(id, name)")
    .eq("id", id)
    .single();
  if (!video) notFound();

  const meta = video.metadata ?? {};
  const lines = video.transcript?.split("\n") ?? [];
  const channel = (video as any).channels;
  const topic = (video as any).topics;

  return (
    <div className="flex flex-col gap-6">
      {video.thumbnail_r2_url && (
        <img src={video.thumbnail_r2_url} alt={video.title}
          className="w-full rounded-lg object-cover max-h-72" />
      )}

      <div className="flex items-start justify-between gap-4">
        <h1 className="text-lg font-bold leading-snug">{video.title}</h1>
        <a href={`${process.env.NEXT_PUBLIC_OCI_API_URL}/pdf/video/${id}`}
          className="text-sm text-neutral-400 hover:text-white border border-neutral-700 rounded px-3 py-1 whitespace-nowrap flex-shrink-0">
          Export PDF
        </a>
      </div>

      {/* Channel */}
      {channel && (
        <Link href={`/channels`}
          className="flex items-center gap-2 text-sm text-neutral-400 hover:text-white w-fit">
          <span>📺</span>
          <span>{channel.name}</span>
        </Link>
      )}
      {!channel && meta.channel && (
        <a href={meta.uploader_url ?? meta.webpage_url} target="_blank" rel="noopener noreferrer"
          className="flex items-center gap-2 text-sm text-neutral-400 hover:text-white w-fit">
          <span>📺</span>
          <span>{meta.channel}</span>
        </a>
      )}

      {/* Topic */}
      {topic && (
        <Link href={`/topic/${topic.id}`}
          className="flex items-center gap-2 text-sm text-neutral-400 hover:text-white w-fit">
          <span>🔖</span>
          <span>{topic.name}</span>
        </Link>
      )}

      {/* Stats */}
      <div className="flex flex-wrap gap-4 text-sm text-neutral-400">
        {video.published_at && (
          <span className="flex items-center gap-1">
            <span>🗓</span> {formatDateTime(video.published_at)}
          </span>
        )}
        {meta.duration && (
          <span className="flex items-center gap-1">
            <span>⏱</span> {formatDuration(meta.duration)}
          </span>
        )}
        {meta.view_count && (
          <span className="flex items-center gap-1">
            <span>👁</span> {Number(meta.view_count).toLocaleString()}
          </span>
        )}
        {meta.like_count && (
          <span className="flex items-center gap-1">
            <span>👍</span> {Number(meta.like_count).toLocaleString()}
          </span>
        )}
        {meta.comment_count && (
          <span className="flex items-center gap-1">
            <span>💬</span> {Number(meta.comment_count).toLocaleString()}
          </span>
        )}
      </div>

      {/* Categories & Tags */}
      {(meta.categories?.length > 0 || meta.tags?.length > 0) && (
        <div className="flex flex-wrap gap-2">
          {meta.categories?.map((c: string) => (
            <span key={c} className="text-xs bg-neutral-800 text-neutral-300 rounded px-2 py-1">{c}</span>
          ))}
          {meta.tags?.slice(0, 8).map((t: string) => (
            <span key={t} className="text-xs bg-neutral-900 text-neutral-500 rounded px-2 py-1">{t}</span>
          ))}
        </div>
      )}

      {/* Description — full, no truncation */}
      {video.description && (
        <p className="text-sm text-neutral-400 whitespace-pre-line">{video.description}</p>
      )}

      {/* Chapters */}
      {meta.chapters?.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-neutral-400 mb-2">Chapters</h2>
          <div className="flex flex-col gap-1">
            {meta.chapters.map((ch: any, i: number) => {
              const m = Math.floor(ch.start_time / 60);
              const s = Math.floor(ch.start_time % 60);
              return (
                <div key={i} className="flex gap-3 text-sm">
                  <span className="text-neutral-500 font-mono flex-shrink-0">{`${m}:${String(s).padStart(2,"0")}`}</span>
                  <span>{ch.title}</span>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Transcript */}
      {lines.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-neutral-400 mb-3">Transcript</h2>
          <div className="flex flex-col gap-2">
            {lines.map((line: string, i: number) => {
              const match = line.match(/^\[(\d{2}:\d{2})\]\s*(.*)/);
              if (!match) return null;
              const [, ts, text] = match;
              return (
                <div key={i} id={`t-${i}`} className="flex gap-3 text-sm">
                  <span className="text-neutral-500 font-mono flex-shrink-0">{ts}</span>
                  <span>{text}</span>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {!video.transcript && (
        <p className="text-neutral-500 text-sm">Transcript not available yet.</p>
      )}
    </div>
  );
}
