"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function DeleteTopicButton({ id, redirect = false }: { id: string; redirect?: boolean }) {
  const [confirming, setConfirming] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleDelete() {
    setLoading(true);
    await fetch(`/api/topics/${id}/delete`, { method: "POST" });
    setLoading(false);
    if (redirect) router.push("/topics");
    else { setConfirming(false); router.refresh(); }
  }

  if (confirming) {
    return (
      <div className="flex items-center gap-2" onClick={(e) => e.preventDefault()}>
        <button onClick={(e) => { e.preventDefault(); handleDelete(); }} disabled={loading}
          className="text-xs text-red-400 hover:text-red-300 disabled:opacity-50">
          {loading ? "..." : "Yes, delete"}
        </button>
        <button onClick={(e) => { e.preventDefault(); setConfirming(false); }}
          className="text-xs text-neutral-500 hover:text-neutral-300">
          Cancel
        </button>
      </div>
    );
  }

  return (
    <button onClick={(e) => { e.preventDefault(); setConfirming(true); }}
      className="text-neutral-600 hover:text-red-400 transition text-base leading-none" title="Delete topic">
      ✕
    </button>
  );
}
