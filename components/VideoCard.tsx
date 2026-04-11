"use client";
import Link from "next/link";
import { useState } from "react";

type Props = {
  id?: string;
  youtube_id: string;
  title?: string | null;
  thumbnail_r2_url?: string | null;
  published_at?: string | null;
  snippet?: string;
  compact?: boolean;
  channel_name?: string | null;
  channel_url?: string | null;
  // undefined = complete (no border), "processing" = yellow, "error" = red
  borderStatus?: "processing" | "error";
  // queue status label shown when video data isn't available yet
  queueStatus?: string | null;
  last_error?: string | null;
};

const STATUS_LABEL: Record<string, string> = {
  pending:             "Waiting in queue",
  metadata_processing: "Fetching metadata...",
  metadata_done:       "Metadata saved, downloading audio",
  audio_processing:    "Downloading audio...",
  audio_done:          "Audio ready, waiting for transcription",
  transcribing:        "Transcribing...",
  summarizing:         "Summarizing...",
  complete:            "Complete",
  error_metadata:      "Metadata fetch failed",
  error_audio:         "Audio download failed",
  error_transcription: "Transcription failed",
};

function ErrorModal({ error, onClose }: { error: string; onClose: () => void }) {
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    navigator.clipboard.writeText(error).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
      onClick={onClose}
    >
      <div
        className="bg-neutral-900 border border-red-700 rounded-lg p-5 max-w-lg w-full mx-4 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-semibold text-red-400">Error details</span>
          <div className="flex items-center gap-3">
            <button
              onClick={handleCopy}
              className="text-xs text-neutral-400 hover:text-white transition"
            >
              {copied ? "Copied!" : "Copy"}
            </button>
            <button onClick={onClose} className="text-neutral-500 hover:text-white text-lg leading-none">✕</button>
          </div>
        </div>
        <pre className="text-xs text-red-300 whitespace-pre-wrap break-all font-mono max-h-64 overflow-y-auto">
          {error}
        </pre>
      </div>
    </div>
  );
}

export default function VideoCard({
  id,
  youtube_id,
  title,
  thumbnail_r2_url,
  published_at,
  snippet,
  compact,
  channel_name,
  borderStatus,
  queueStatus,
  last_error,
}: Props) {
  const [showError, setShowError] = useState(false);

  const dateStr = published_at
    ? new Date(published_at).toLocaleDateString(undefined, {
        year: "numeric", month: "short", day: "numeric",
      })
    : null;

  const borderClass =
    borderStatus === "error"
      ? "border border-red-600"
      : borderStatus === "processing"
      ? "border border-yellow-600"
      : "";

  const isError = borderStatus === "error";

  // Red dot button — stops link navigation
  const errorDot = isError && last_error ? (
    <button
      onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowError(true); }}
      className="absolute top-2 right-2 w-3 h-3 rounded-full bg-red-500 hover:bg-red-400 transition flex-shrink-0"
      title="View error details"
    />
  ) : null;

  if (compact) {
    const inner = (
      <div className="flex gap-3 px-4 py-2 hover:bg-neutral-800 transition">
        {thumbnail_r2_url ? (
          <img src={thumbnail_r2_url} alt={title ?? ""} className="w-16 h-10 object-cover rounded flex-shrink-0" />
        ) : (
          <div className="w-16 h-10 rounded flex-shrink-0 bg-neutral-800 animate-pulse" />
        )}
        {title ? (
          <p className="text-xs line-clamp-2 self-center">{title}</p>
        ) : (
          <div className="h-3 w-40 rounded bg-neutral-800 animate-pulse self-center" />
        )}
      </div>
    );
    return id ? <Link href={`/video/${id}`}>{inner}</Link> : <div>{inner}</div>;
  }

  const card = (
    <div className={`relative flex gap-3 bg-neutral-900 rounded-lg p-3 transition ${borderClass} ${id ? "hover:bg-neutral-800" : ""}`}>
      {errorDot}

      {/* Thumbnail or placeholder */}
      {thumbnail_r2_url ? (
        <img src={thumbnail_r2_url} alt={title ?? ""} className="w-32 h-20 object-cover rounded flex-shrink-0" />
      ) : (
        <div className="w-32 h-20 rounded flex-shrink-0 bg-neutral-800 animate-pulse" />
      )}

      <div className="flex flex-col gap-1 min-w-0 justify-center">
        {/* Title or youtube_id fallback */}
        {title ? (
          <p className="font-medium text-sm line-clamp-2">{title}</p>
        ) : (
          <p className="text-xs text-neutral-500 font-mono">{youtube_id}</p>
        )}

        <div className="flex flex-wrap gap-2 text-xs text-neutral-500 mt-1">
          {channel_name && <span>📺 {channel_name}</span>}
          {dateStr ? (
            <span>🗓 {dateStr}</span>
          ) : (
            <div className="h-2.5 w-20 rounded bg-neutral-800 animate-pulse" />
          )}
        </div>

        {/* Queue status badge */}
        {queueStatus && (
          <span className={`text-xs mt-1 ${queueStatus.startsWith("error_") ? "text-red-400" : "text-yellow-400"}`}>
            {STATUS_LABEL[queueStatus] ?? queueStatus}
          </span>
        )}

        {snippet && <p className="text-xs text-neutral-400 line-clamp-2 mt-1">{snippet}</p>}
      </div>

      {showError && last_error && (
        <ErrorModal error={last_error} onClose={() => setShowError(false)} />
      )}
    </div>
  );

  return id ? <Link href={`/video/${id}`}>{card}</Link> : card;
}
