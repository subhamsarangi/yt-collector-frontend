"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function DeleteChannelButton({ id, redirect }: { id: string; redirect?: string }) {
  const [confirming, setConfirming] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleDelete() {
    setLoading(true);
    await fetch(`/api/channels/${id}/delete`, { method: "POST" });
    setLoading(false);
    setConfirming(false);
    if (redirect) {
      router.push(redirect);
    } else {
      router.refresh();
    }
  }

  if (confirming) {
    return (
      <div className="flex items-center gap-2">
        <button onClick={handleDelete} disabled={loading}
          className="text-xs text-red-400 hover:text-red-300 disabled:opacity-50">
          {loading ? "..." : "Yes"}
        </button>
        <button onClick={() => setConfirming(false)}
          className="text-xs text-neutral-500 hover:text-neutral-300">
          No
        </button>
      </div>
    );
  }

  return (
    <button onClick={() => setConfirming(true)} title="Remove channel"
      className="text-neutral-600 hover:text-red-400 transition text-base leading-none">
      ✕
    </button>
  );
}
