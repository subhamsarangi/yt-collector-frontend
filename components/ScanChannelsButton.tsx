"use client";

import { useState } from "react";

export default function ScanChannelsButton() {
  const [state, setState] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [added, setAdded] = useState<number | null>(null);

  async function handleScan() {
    setState("loading");
    try {
      const res = await fetch("/api/cron/channels");
      const data = await res.json();
      if (!res.ok) throw new Error();
      setAdded(data.added ?? 0);
      setState("done");
    } catch {
      setState("error");
    } finally {
      setTimeout(() => setState("idle"), 4000);
    }
  }

  return (
    <button
      onClick={handleScan}
      disabled={state === "loading"}
      className="text-sm px-3 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 disabled:opacity-50 transition-colors"
    >
      {state === "loading" && "Scanning…"}
      {state === "done" && `Done — ${added} new video${added === 1 ? "" : "s"} queued`}
      {state === "error" && "Scan failed"}
      {state === "idle" && "Scan channels (last 24h)"}
    </button>
  );
}
