import { supabaseAdmin } from "@/lib/supabase/server";
import { getUserRole } from "@/lib/supabase/userRole";
import { notFound } from "next/navigation";
import Link from "next/link";
import ExportPdfButton from "@/components/ExportPdfButton";
import DeleteVideoButton from "@/components/DeleteVideoButton";
import ProcessingLog from "@/components/ProcessingLog";
import RetryVideoButton from "@/components/RetryVideoButton";

export const revalidate = 0;

function formatDuration(seconds: number) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return h > 0 ? `${h}h ${m}m ${s}s` : `${m}m ${s}s`;
}

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    year: "numeric", month: "short", day: "numeric",
  });
}

export default async function VideoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const role = await getUserRole();
  const isOwner = role === "owner";

  const { data: video } = await supabaseAdmin
    .from("videos")
    .select("*, channels(id, name, url, thumbnail_url), topics(id, name)")
    .eq("id", id)
    .single();
  if (!video) notFound();

  const meta = video.metadata ?? {};
  const lines = video.transcript?.split("\n") ?? [];
  const channel = (video as any).channels;
  const topic = (video as any).topics;

  // Fetch processing log via queue record
  const { data: queueRow } = await supabaseAdmin
    .from("queue").select("id, status").eq("youtube_id", video.youtube_id).order("created_at", { ascending: false }).limit(1).single();
  const { data: procLog } = queueRow
    ? await supabaseAdmin.from("processing_logs").select("steps").eq("queue_id", queueRow.id).single()
    : { data: null };
  const processingSteps = (procLog?.steps as Array<{ ts: string; text: string; ok?: boolean }>) ?? [];
  const queueStatus = queueRow?.status ?? null;

  return (
    <div className="flex flex-col gap-6">
      {video.thumbnail_r2_url && (
        <a href={`https://www.youtube.com/watch?v=${video.youtube_id}`} target="_blank" rel="noopener noreferrer">
          <img src={video.thumbnail_r2_url} alt={video.title}
            className="w-full rounded-lg object-cover max-h-72 hover:opacity-90 transition" />
        </a>
      )}

      <div className="flex items-start justify-between gap-4">
        <h1 className="text-lg font-bold leading-snug">{video.title}</h1>
        <div className="flex items-center gap-2 flex-shrink-0">
          {isOwner && <DeleteVideoButton id={id} />}
          <ExportPdfButton href={`/api/pdf/video/${id}`} filename={`video-${id}.pdf`} />
        </div>
      </div>

      {/* Channel — uniform avatar row for both tracked channels and topic videos */}
      {(channel || meta.channel) && (() => {
        const name = channel?.name ?? meta.channel ?? "";
        const avatarUrl = channel?.thumbnail_url ?? null;
        const href = channel ? "/channels" : (meta.uploader_url ?? meta.webpage_url ?? "#");
        const isExternal = !channel;
        const initial = name.charAt(0).toUpperCase();

        const avatar = avatarUrl ? (
          <img src={avatarUrl} alt={name} className="w-8 h-8 rounded-full object-cover flex-shrink-0" />
        ) : (
          <div className="w-8 h-8 rounded-full bg-neutral-700 flex items-center justify-center text-xs font-bold flex-shrink-0">
            {initial}
          </div>
        );

        return isExternal ? (
          <a href={href} target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-2 text-sm text-neutral-400 hover:text-white w-fit">
            {avatar}
            <span>{name}</span>
          </a>
        ) : (
          <Link href={href} className="flex items-center gap-2 text-sm text-neutral-400 hover:text-white w-fit">
            {avatar}
            <span>{name}</span>
          </Link>
        );
      })()}

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

      {/* Summary — shown right after tags */}
      {video.summary && (
        <section className="bg-neutral-900 rounded-lg p-4">
          <h2 className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-3">Summary</h2>
          <ul className="flex flex-col gap-2">
            {video.summary.split("\n").filter((l: string) => l.trim()).map((line: string, i: number) => (
              <li key={i} className="flex items-start gap-2">
                <span className="text-neutral-600 flex-shrink-0 mt-1 text-xs">•</span>
                <span className="text-sm text-neutral-300 leading-relaxed" style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}>
                  {line.replace(/^[•\-]\s*/, "")}
                </span>
              </li>
            ))}
          </ul>
        </section>
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

      {/* Processing log + retry */}
      {(processingSteps.length > 0 || queueStatus) && (
        <div className="flex flex-col gap-2">
          <ProcessingLog
            videoId={id}
            initialSteps={processingSteps}
            initialStatus={queueStatus}
          />
          {isOwner && queueStatus && (
            <RetryVideoButton videoId={id} queueStatus={queueStatus} />
          )}
        </div>
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
