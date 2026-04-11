"use client";
import { useEffect, useRef, useState } from "react";

type Step = { ts: string; text: string; ok?: boolean };

const ACTIVE_STATUSES = new Set([
  "pending", "metadata_processing", "metadata_done",
  "audio_processing", "audio_done", "transcribing", "summarizing",
]);

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

function formatTs(iso: string) {
  return new Date(iso).toLocaleTimeString(undefined, {
    hour: "2-digit", minute: "2-digit", second: "2-digit",
  });
}

export default function ProcessingLog({
  videoId,
  initialSteps,
  initialStatus,
}: {
  videoId: string;
  initialSteps: Step[];
  initialStatus: string | null;
}) {
  const [steps, setSteps] = useState<Step[]>(initialSteps);
  const [status, setStatus] = useState<string | null>(initialStatus);
  const [open, setOpen] = useState(ACTIVE_STATUSES.has(initialStatus ?? ""));
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const isActive = ACTIVE_STATUSES.has(status ?? "");

  useEffect(() => {
    if (!isActive) return;

    async function poll() {
      const res = await fetch(`/api/videos/${videoId}/processing-log`);
      if (!res.ok) return;
      const data = await res.json();
      setSteps(data.steps ?? []);
      setStatus(data.status);
    }

    intervalRef.current = setInterval(poll, 3000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [isActive, videoId]);

  // Auto-open when active, keep open after completion
  useEffect(() => {
    if (isActive) setOpen(true);
  }, [isActive]);

  if (steps.length === 0 && !isActive) return null;

  return (
    <details open={open} onToggle={(e) => setOpen((e.target as HTMLDetailsElement).open)} className="group">
      <summary className="cursor-pointer text-xs text-neutral-500 hover:text-neutral-300 transition select-none list-none flex items-center gap-2">
        <span className="group-open:rotate-90 transition-transform inline-block">▶</span>
        <span>Processing log</span>
        {status && (
          <span className={`ml-1 px-1.5 py-0.5 rounded text-xs font-mono ${
            status.startsWith("error_") ? "bg-red-900/50 text-red-400" :
            status === "complete"       ? "bg-green-900/50 text-green-400" :
                                          "bg-yellow-900/50 text-yellow-400"
          }`}>
            {STATUS_LABEL[status] ?? status}
          </span>
        )}
        {isActive && (
          <span className="w-1.5 h-1.5 rounded-full bg-yellow-400 animate-pulse" />
        )}
      </summary>

      <div className="mt-2 flex flex-col gap-1.5 text-xs border border-neutral-800 rounded-lg p-3 bg-neutral-950">
        {steps.length === 0 && (
          <span className="text-neutral-600">No steps recorded yet...</span>
        )}
        {steps.map((s, i) => {
          const isLast = i === steps.length - 1;
          return (
            <div key={i} className={`flex items-start gap-3 ${s.ok === false ? "text-red-400" : isLast && isActive ? "text-yellow-300" : "text-neutral-400"}`}>
              <span className="text-neutral-600 font-mono flex-shrink-0 tabular-nums">{formatTs(s.ts)}</span>
              <span className={`flex-shrink-0 ${s.ok === false ? "text-red-500" : isLast && isActive ? "text-yellow-400" : "text-green-500"}`}>
                {s.ok === false ? "✗" : isLast && isActive ? "⏳" : "✓"}
              </span>
              <span>{s.text}</span>
            </div>
          );
        })}
      </div>
    </details>
  );
}
