"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

type Result =
  | { ok: true; youtube_id: string }
  | { skipped: true; youtube_id: string; title?: string; id?: string; queued?: boolean; status?: string }
  | { error: string };

export default function AddVideoForm() {
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [pollMsg, setPollMsg] = useState<string | null>(null);

  async function triggerAndPoll(youtube_id: string) {
    // Trigger queue runner
    await fetch("/api/queue/trigger", { method: "POST" }).catch(() => {});

    // Poll for video to appear (max 3 min)
    const deadline = Date.now() + 180_000;
    while (Date.now() < deadline) {
      await new Promise((r) => setTimeout(r, 4000));
      const res = await fetch(`/api/videos?youtube_id=${youtube_id}`).catch(() => null);
      if (res?.ok) {
        const data = await res.json().catch(() => null);
        const video = data?.videos?.find((v: { youtube_id: string; id: string }) => v.youtube_id === youtube_id);
        if (video?.id) {
          router.push(`/video/${video.id}`);
          return;
        }
      }
      // Check queue status for progress message
      const qRes = await fetch(`/api/queue/status?youtube_id=${youtube_id}`).catch(() => null);
      if (qRes?.ok) {
        const qData = await qRes.json().catch(() => null);
        if (qData?.status) setPollMsg(`Processing: ${qData.status.replace(/_/g, " ")}...`);
      }
    }
    setPollMsg("Taking longer than expected — check back soon.");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!url.trim()) return;
    setLoading(true);
    setResult(null);
    setPollMsg(null);

    try {
      const res = await fetch("/api/videos/add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: url.trim() }),
      });
      const data = await res.json();
      setResult(data);

      if (res.ok && !data.error) {
        setUrl("");
        if ("skipped" in data && data.id) {
          // Already exists — go straight to video
          router.push(`/video/${data.id}`);
          return;
        }
        if ("ok" in data) {
          setPollMsg("Queued — starting processing...");
          await triggerAndPoll(data.youtube_id);
        }
      }
    } catch {
      setResult({ error: "Network error" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://youtube.com/watch?v=... or /shorts/..."
          disabled={loading}
          className="bg-neutral-900 border border-neutral-700 rounded px-3 py-2 text-sm disabled:opacity-50 w-full"
        />
        <button
          type="submit"
          disabled={loading || !url.trim()}
          className="bg-white text-black rounded px-4 py-2 text-sm font-medium hover:bg-neutral-200 disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <svg className="w-3 h-3 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              {pollMsg ?? "Adding..."}
            </>
          ) : "Add Video"}
        </button>
      </form>

      {result && !loading && (
        <div className={`rounded-lg px-4 py-3 text-sm ${
          "error" in result ? "bg-red-950 border border-red-800 text-red-300" :
          "skipped" in result ? "bg-neutral-800 border border-neutral-700 text-neutral-300" :
          "bg-green-950 border border-green-800 text-green-300"
        }`}>
          {"error" in result && <p>{result.error}</p>}
          {"skipped" in result && result.queued && (
            <p>Already queued — status: <span className="font-mono">{result.status}</span></p>
          )}
          {"skipped" in result && !result.queued && (
            <p>
              Already exists
              {result.title && `: "${result.title}"`}
              {result.id && (
                <> — <Link href={`/video/${result.id}`} className="underline hover:text-white">View video</Link></>
              )}
            </p>
          )}
          {"ok" in result && pollMsg && <p>{pollMsg}</p>}
        </div>
      )}
    </div>
  );
}
