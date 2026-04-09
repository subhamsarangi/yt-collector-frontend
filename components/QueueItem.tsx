"use client";
import { useState } from "react";

const STATUS_LABEL: Record<string, string> = {
  pending:            "Waiting in queue",
  yt_dlp_processing:  "Downloading...",
  yt_dlp_done:        "Download done, waiting for transcription",
  whisper_processing: "Transcribing...",
  whisper_done:       "Transcription done",
  complete:           "Complete",
  error_ytdlp:        "Download failed",
  error_whisper:      "Transcription failed",
};

const STATUS_COLOR: Record<string, string> = {
  pending:            "text-neutral-500",
  yt_dlp_processing:  "text-yellow-400",
  yt_dlp_done:        "text-blue-400",
  whisper_processing: "text-yellow-400",
  whisper_done:       "text-blue-400",
  complete:           "text-green-400",
  error_ytdlp:        "text-red-400",
  error_whisper:      "text-red-400",
};

type Props = {
  id: string;
  youtube_id: string;
  status: string;
  last_error?: string | null;
};

export default function QueueItem({ youtube_id, status, last_error }: Props) {
  const [open, setOpen] = useState(false);
  const isError = status.startsWith("error_");

  return (
    <div className="bg-neutral-900 rounded-lg overflow-hidden">
      <div
        className={`flex items-center justify-between px-4 py-3 ${isError ? "cursor-pointer hover:bg-neutral-800 transition" : ""}`}
        onClick={() => isError && setOpen((o) => !o)}
      >
        <span className="text-xs text-neutral-400 font-mono">{youtube_id}</span>
        <div className="flex items-center gap-2">
          {isError ? (
            <span className="text-xs bg-red-900 text-red-300 rounded px-2 py-0.5">
              {STATUS_LABEL[status] ?? status}
            </span>
          ) : (
            <span className={`text-xs ${STATUS_COLOR[status] ?? "text-neutral-400"}`}>
              {STATUS_LABEL[status] ?? status}
            </span>
          )}
          {isError && (
            <span className="text-neutral-600 text-xs">{open ? "▲" : "▼"}</span>
          )}
        </div>
      </div>

      {isError && open && last_error && (
        <div className="px-4 pb-3 border-t border-neutral-800">
          <pre className="text-xs text-red-300 whitespace-pre-wrap break-all mt-2 font-mono">
            {last_error}
          </pre>
        </div>
      )}
    </div>
  );
}
