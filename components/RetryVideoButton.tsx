"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

type Props = {
  videoId: string;
  queueStatus: string;
};

const LABEL: Record<string, string> = {
  error_metadata:      "Retry metadata fetch",
  error_audio:         "Retry audio download",
  error_transcription: "Retry transcription",
};

const FROM: Record<string, string> = {
  error_metadata:      "Will restart from the beginning",
  error_audio:         "Will skip metadata, retry audio download",
  error_transcription: "Will skip download, retry transcription only",
};

export default function RetryVideoButton({ videoId, queueStatus }: Props) {
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");
  const router = useRouter();

  if (!["error_metadata", "error_audio", "error_transcription"].includes(queueStatus)) return null;

  async function handleRetry() {
    setLoading(true);
    setMsg("");
    const res = await fetch(`/api/videos/${videoId}/retry`, { method: "POST" });
    const data = await res.json();
    setLoading(false);
    if (res.ok) {
      setMsg("Queued for retry — processing will start shortly.");
      router.refresh();
    } else {
      setMsg(data.error ?? "Retry failed.");
    }
  }

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center gap-3">
        <button
          onClick={handleRetry}
          disabled={loading}
          className="text-xs bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded px-3 py-1.5 transition disabled:opacity-50"
        >
          {loading ? "Retrying..." : LABEL[queueStatus]}
        </button>
        <span className="text-xs text-neutral-600">{FROM[queueStatus]}</span>
      </div>
      {msg && <p className="text-xs text-green-400">{msg}</p>}
    </div>
  );
}
