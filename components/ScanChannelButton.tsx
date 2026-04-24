"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

type Props = {
  channelId: string;
};

export default function ScanChannelButton({ channelId }: Props) {
  const [state, setState] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [result, setResult] = useState<{ queued: number; skipped: number } | null>(null);
  const [error, setError] = useState("");
  const router = useRouter();

  async function handleScan() {
    setState("loading");
    setError("");
    setResult(null);

    const res = await fetch(`/api/channels/${channelId}/scan`, { method: "POST" });
    const data = await res.json();

    if (res.ok) {
      setState("done");
      setResult({ queued: data.queued, skipped: data.skipped });
      if (data.queued > 0) router.refresh();
    } else {
      setState("error");
      setError(data.error ?? "Scan failed.");
    }
  }

  return (
    <div className="flex flex-col gap-1.5 items-end">
      <button
        onClick={handleScan}
        disabled={state === "loading"}
        className="flex items-center gap-2 text-sm bg-neutral-800 hover:bg-neutral-700 text-neutral-200 rounded-lg px-4 py-2.5 transition disabled:opacity-50 w-fit"
      >
        {state === "loading" ? (
          <>
            <svg className="w-3.5 h-3.5 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            Scanning...
          </>
        ) : (
          <>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
              <path fillRule="evenodd" d="M15.312 11.424a5.5 5.5 0 0 1-9.201 2.466l-.312-.311h2.433a.75.75 0 0 0 0-1.5H3.989a.75.75 0 0 0-.75.75v4.242a.75.75 0 0 0 1.5 0v-2.43l.31.31a7 7 0 0 0 11.712-3.138.75.75 0 0 0-1.449-.39Zm1.23-3.723a.75.75 0 0 0 .219-.53V2.929a.75.75 0 0 0-1.5 0V5.36l-.31-.31A7 7 0 0 0 3.239 8.188a.75.75 0 1 0 1.448.389A5.5 5.5 0 0 1 13.89 6.11l.311.31h-2.432a.75.75 0 0 0 0 1.5h4.243a.75.75 0 0 0 .53-.219Z" clipRule="evenodd" />
            </svg>
            Scan channel
          </>
        )}
      </button>

      {state === "done" && result && (
        <p className="text-xs text-neutral-500">
          {result.queued > 0
            ? <span className="text-green-400">{result.queued} new video{result.queued !== 1 ? "s" : ""} queued</span>
            : <span>No new videos found</span>}
          {result.skipped > 0 && <span> · {result.skipped} already exist</span>}
        </p>
      )}
      {state === "error" && <p className="text-xs text-red-400">{error}</p>}
    </div>
  );
}
