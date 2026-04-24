"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

type Props = {
  videoId: string;
};

export default function SummarizeButton({ videoId }: Props) {
  const [state, setState] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [error, setError] = useState("");
  const router = useRouter();

  async function handleSummarize() {
    setState("loading");
    setError("");
    const res = await fetch(`/api/videos/${videoId}/summarize`, { method: "POST" });
    const data = await res.json();
    if (res.ok) {
      setState("done");
      router.refresh();
    } else {
      setState("error");
      setError(data.error ?? "Summarization failed.");
    }
  }

  if (state === "done") {
    return <p className="text-sm text-green-400">Summary generated.</p>;
  }

  return (
    <div className="flex flex-col gap-1.5">
      <button
        onClick={handleSummarize}
        disabled={state === "loading"}
        className="flex items-center gap-2 text-sm bg-neutral-800 hover:bg-neutral-700 text-neutral-200 rounded-lg px-4 py-2.5 transition disabled:opacity-50 w-fit"
      >
        <span>✨</span>
        {state === "loading" ? "Summarizing..." : "Generate summary"}
      </button>
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  );
}
