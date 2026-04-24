"use client";
import { useState } from "react";

export default function TranscribeButton({ videoId }: { videoId: string }) {
  const [state, setState] = useState<"idle" | "loading" | "queued" | "error">("idle");
  const [error, setError] = useState("");

  async function handleClick() {
    setState("loading");
    setError("");

    const res = await fetch(`/api/videos/${videoId}/transcribe`, { method: "POST" });
    const data = await res.json();

    if (!res.ok) {
      setState("error");
      setError(data.error ?? "Something went wrong.");
      return;
    }

    setState("queued");
    // Hard reload so the server re-renders with the new queue item and ProcessingLog appears
    window.location.reload();
  }

  if (state === "queued") {
    return (
      <p className="text-sm text-green-400">
        Queued for transcription — processing will start shortly.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-1.5">
      <button
        onClick={handleClick}
        disabled={state === "loading"}
        className="flex items-center gap-2 text-sm bg-neutral-800 hover:bg-neutral-700 text-neutral-200 rounded-lg px-4 py-2.5 transition disabled:opacity-50 w-fit"
      >
        <span>🎙️</span>
        {state === "loading" ? "Queuing..." : "Transcribe & summarize"}
      </button>
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  );
}
