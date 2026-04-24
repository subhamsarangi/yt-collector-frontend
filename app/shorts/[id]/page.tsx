import { supabaseAdmin } from "@/lib/supabase/server";
import { getUserRole } from "@/lib/supabase/userRole";
import { notFound } from "next/navigation";
import Link from "next/link";
import ExportPdfButton from "@/components/ExportPdfButton";
import DeleteVideoButton from "@/components/DeleteVideoButton";
import ProcessingLog from "@/components/ProcessingLog";
import RetryVideoButton from "@/components/RetryVideoButton";
import TranscribeButton from "@/components/TranscribeButton";
import SummarizeButton from "@/components/SummarizeButton";

export const revalidate = 0;

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { data } = await supabaseAdmin.from("videos").select("title").eq("id", id).single();
  return { title: data?.title ?? "Short" };
}

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    year: "numeric", month: "short", day: "numeric",
  });
}

export default async function ShortsPage({ params }: { params: Promise<{ id: string }> }) {
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

  // For topic videos (no channel_id FK), try to find a tracked channel by YouTube channel_id in URL.
  let trackedChannel: { id: string; name: string; url: string; thumbnail_url: string | null } | null = null;
  if (!channel && meta.channel_id) {
    const { data: byId } = await supabaseAdmin
      .from("channels")
      .select("id, name, url, thumbnail_url")
      .ilike("url", `%${meta.channel_id}%`)
      .single();
    trackedChannel = byId ?? null;

    // Fallback: match by @handle extracted from uploader_url
    if (!trackedChannel && meta.uploader_url) {
      const handleMatch = (meta.uploader_url as string).match(/\/@([^/?]+)/);
      if (handleMatch) {
        const { data: byHandle } = await supabaseAdmin
          .from("channels")
          .select("id, name, url, thumbnail_url")
          .ilike("url", `%@${handleMatch[1]}%`)
          .single();
        trackedChannel = byHandle ?? null;
      }
    }
  }

  // Fetch processing log via queue record
  const { data: queueRow } = await supabaseAdmin
    .from("queue").select("id, status").eq("youtube_id", video.youtube_id).order("created_at", { ascending: false }).limit(1).single();
  const { data: procLog } = queueRow
    ? await supabaseAdmin.from("processing_logs").select("steps").eq("queue_id", queueRow.id).single()
    : { data: null };
  const processingSteps = (procLog?.steps as Array<{ ts: string; text: string; ok?: boolean }>) ?? [];
  const queueStatus = queueRow?.status ?? null;

  const activeStatuses = new Set([
    "pending", "metadata_processing", "metadata_done",
    "audio_processing", "audio_done", "transcribing", "summarizing",
  ]);
  const isProcessing = queueStatus ? activeStatuses.has(queueStatus) : false;
  const showTranscribeButton =
    isOwner && !video.transcript && !isProcessing &&
    (!queueStatus || queueStatus === "complete" || queueStatus.startsWith("error_"));

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Left column: Shorts-optimized thumbnail with 9:16 aspect ratio */}
        {video.thumbnail_r2_url && (
          <a
            href={`https://www.youtube.com/shorts/${video.youtube_id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="relative block group overflow-hidden rounded-lg"
          >
            <div className="relative w-full" style={{ paddingBottom: "177.78%" }}>
              <img
                src={video.thumbnail_r2_url}
                alt={video.title}
                className="absolute inset-0 w-full h-full object-cover"
              />
              {/* Grey gradient overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
              {/* YouTube icon */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/yt.png"
                alt="Play on YouTube"
                className="absolute inset-0 m-auto w-14 h-14 transition-transform duration-200 group-hover:scale-105 drop-shadow-lg"
              />
            </div>
          </a>
        )}

        {/* Right column: Content */}
        <div className="flex flex-col gap-6">
          <div className="flex items-start justify-between gap-4">
            <h1 className="text-lg font-bold leading-snug">{video.title}</h1>
            <div className="flex items-center gap-2 flex-shrink-0">
              {isOwner && <DeleteVideoButton id={id} />}
              <ExportPdfButton href={`/api/pdf/video/${id}`} filename={`short-${id}.pdf`} />
            </div>
          </div>

          {/* Channel */}
          {(channel || trackedChannel || meta.channel) && (() => {
            const resolvedChannel = channel ?? trackedChannel;
            const name = resolvedChannel?.name ?? meta.channel ?? "";
            const avatarUrl = resolvedChannel?.thumbnail_url ?? null;
            const isTracked = !!resolvedChannel;
            const href = resolvedChannel
              ? `/channel/${resolvedChannel.id}`
              : (meta.uploader_url ?? meta.webpage_url ?? "#");
            const isExternal = !resolvedChannel;
            const initial = name.charAt(0).toUpperCase();

            const avatar = avatarUrl ? (
              <img src={avatarUrl} alt={name} className="w-8 h-8 rounded-full object-cover flex-shrink-0" />
            ) : (
              <div className="w-8 h-8 rounded-full bg-neutral-700 flex items-center justify-center text-xs font-bold flex-shrink-0">
                {initial}
              </div>
            );

            const nameRow = (
              <span className="flex items-center gap-1">
                <span>{name}</span>
                {isTracked && (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                    className="w-3.5 h-3.5 text-blue-400 flex-shrink-0"
                    aria-label="Tracked channel"
                  >
                    <path
                      fillRule="evenodd"
                      d="M16.403 12.652a3 3 0 0 0 0-5.304 3 3 0 0 0-3.75-3.751 3 3 0 0 0-5.305 0 3 3 0 0 0-3.751 3.75 3 3 0 0 0 0 5.305 3 3 0 0 0 3.75 3.751 3 3 0 0 0 5.305 0 3 3 0 0 0 3.751-3.75Zm-2.546-4.46a.75.75 0 0 0-1.214-.883l-3.483 4.79-1.88-1.88a.75.75 0 1 0-1.06 1.061l2.5 2.5a.75.75 0 0 0 1.137-.089l4-5.5Z"
                      clipRule="evenodd"
                    />
                  </svg>
                )}
              </span>
            );

            return isExternal ? (
              <a href={href} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-2 text-sm text-neutral-400 hover:text-white w-fit">
                {avatar}
                {nameRow}
              </a>
            ) : (
              <Link href={href} className="flex items-center gap-2 text-sm text-neutral-400 hover:text-white w-fit">
                {avatar}
                {nameRow}
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

          {/* Summary */}
          {video.summary && (
            <section className="bg-neutral-900 rounded-lg p-4">
              <h2 className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-3">Summary</h2>
              <ul className="flex flex-col gap-2">
                {video.summary.split("\n").filter((l: string) => l.trim()).map((line: string, i: number) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="text-neutral-600 flex-shrink-0 mt-1 text-xs">•</span>
                    <span className="text-sm text-neutral-300 leading-relaxed" style={{ fontFamily: "var(--font-lora)" }}>
                      {line.replace(/^[•\-]\s*/, "")}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* Summarize button */}
          {isOwner && video.transcript && !video.summary && (
            <SummarizeButton videoId={id} />
          )}

          {/* Description */}
          {video.description && (
            <p className="text-sm text-neutral-400 whitespace-pre-line">{video.description}</p>
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

          {/* Transcribe & Summarize buttons */}
          {showTranscribeButton && <TranscribeButton videoId={id} />}
          {!video.transcript && !showTranscribeButton && (
            <p className="text-neutral-500 text-sm">Transcript not available yet.</p>
          )}
        </div>
      </div>

      {/* Transcript - full width below the 2-column layout */}
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
    </div>
  );
}
