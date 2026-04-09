import Link from "next/link";

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
};

const STATUS_LABEL: Record<string, string> = {
  pending:            "Waiting in queue",
  yt_dlp_processing:  "Downloading...",
  yt_dlp_done:        "Download done, waiting for transcription",
  whisper_processing: "Transcribing...",
  whisper_done:       "Transcription done",
  error_ytdlp:        "Download failed",
  error_whisper:      "Transcription failed",
};

export default function VideoCard({
  id,
  title,
  thumbnail_r2_url,
  published_at,
  snippet,
  compact,
  channel_name,
  borderStatus,
  queueStatus,
}: Props) {
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
    <div className={`flex gap-3 bg-neutral-900 rounded-lg p-3 transition ${borderClass} ${id ? "hover:bg-neutral-800" : ""}`}>
      {/* Thumbnail or placeholder */}
      {thumbnail_r2_url ? (
        <img src={thumbnail_r2_url} alt={title ?? ""} className="w-32 h-20 object-cover rounded flex-shrink-0" />
      ) : (
        <div className="w-32 h-20 rounded flex-shrink-0 bg-neutral-800 animate-pulse" />
      )}

      <div className="flex flex-col gap-1 min-w-0 justify-center">
        {/* Title or placeholder */}
        {title ? (
          <p className="font-medium text-sm line-clamp-2">{title}</p>
        ) : (
          <div className="flex flex-col gap-1.5">
            <div className="h-3 w-3/4 rounded bg-neutral-800 animate-pulse" />
            <div className="h-3 w-1/2 rounded bg-neutral-800 animate-pulse" />
          </div>
        )}

        <div className="flex flex-wrap gap-2 text-xs text-neutral-500 mt-1">
          {channel_name && <span>📺 {channel_name}</span>}
          {/* Date or placeholder */}
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
    </div>
  );

  return id ? <Link href={`/video/${id}`}>{card}</Link> : card;
}
