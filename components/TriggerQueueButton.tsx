"use client";
import { useState } from "react";

export default function TriggerQueueButton() {
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState("");

  async function handleClick() {
    setLoading(true);
    setToast("");
    try {
      const res = await fetch("/api/queue/trigger", { method: "POST" });
      if (!res.ok) throw new Error("Trigger failed");
      setToast("Queue triggered.");
    } catch (e: unknown) {
      setToast(e instanceof Error ? e.message : "Failed to trigger queue");
    } finally {
      setLoading(false);
      setTimeout(() => setToast(""), 3000);
    }
  }

  return (
    <>
      <button
        onClick={handleClick}
        disabled={loading}
        className="text-sm text-neutral-400 hover:text-white border border-neutral-700 rounded px-3 py-1 disabled:opacity-50 transition whitespace-nowrap"
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
