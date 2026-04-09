"use client";
import { useState } from "react";

export default function TriggerQueueButton({ enabled = true }: { enabled?: boolean }) {
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState("");

  async function handleClick() {
    if (!enabled) return;
    setLoading(true);
    setToast("");
    try {
      const res = await fetch("/api/queue/trigger", { method: "POST" });
      if (!res.ok) throw new Error("Trigger failed");
      setToast("Queue triggered.");
      setTimeout(() => router.refresh(), 3000);
    } catch (e: unknown) {
      setToast(e instanceof Error ? e.message : "Failed to trigger queue");
      setTimeout(() => router.refresh(), 1000);
    } finally {
      setLoading(false);
      setTimeout(() => setToast(""), 3000);
    }
  }

  return (
    <>
      <button
        onClick={handleClick}
        disabled={loading || !enabled}
        title={!enabled ? "Queue is already processing" : "Start processing pending items"}
        className={`text-sm border rounded px-3 py-1 transition whitespace-nowrap ${
          enabled
            ? "text-neutral-400 hover:text-white border-neutral-700 disabled:opacity-50"
            : "text-neutral-600 border-neutral-800 cursor-not-allowed"
        }`}
      >
        {loading ? "Triggering..." : "▶ Start processing"}
      </button>

      {toast && (
        <div className={`fixed bottom-20 md:bottom-6 left-1/2 -translate-x-1/2 text-sm px-4 py-2 rounded-lg shadow-lg z-50 ${
          toast.includes("failed") || toast.includes("Failed")
            ? "bg-red-900 text-red-200"
            : "bg-neutral-800 text-neutral-200"
        }`}>
          {toast}
        </div>
      )}
    </>
  );
}
