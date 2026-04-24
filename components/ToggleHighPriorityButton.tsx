"use client";
import { useState } from "react";

export default function ToggleHighPriorityButton({
  channelId,
  isHighPriority: initialHighPriority,
  onToggle,
}: {
  channelId: string;
  isHighPriority: boolean;
  onToggle?: (newValue: boolean) => void;
}) {
  const [isHighPriority, setIsHighPriority] = useState(initialHighPriority);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleToggle() {
    setLoading(true);
    setError("");
    const newValue = !isHighPriority;

    try {
      const res = await fetch(`/api/channels/${channelId}/high-priority`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ high_priority: newValue }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Failed to update priority");
      }

      // Update local state
      setIsHighPriority(newValue);
      onToggle?.(newValue);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-1.5">
      <button
        onClick={handleToggle}
        disabled={loading}
        className={`flex items-center gap-2 text-sm rounded-lg px-4 py-2.5 transition disabled:opacity-50 w-fit ${
          isHighPriority
            ? "bg-red-900 hover:bg-red-800 text-red-200"
            : "bg-neutral-800 hover:bg-neutral-700 text-neutral-200"
        }`}
      >
        {loading ? "Updating..." : isHighPriority ? "★ High priority" : "☆ Prioritize"}
      </button>
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  );
}
