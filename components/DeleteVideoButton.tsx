"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function DeleteVideoButton({ id }: { id: string }) {
  const [confirming, setConfirming] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleDelete() {
    setLoading(true);
    await fetch(`/api/videos/${id}/delete`, { method: "POST" });
    setLoading(false);
    router.push("/");
  }

  if (confirming) {
    return (
      <div className="flex items-center gap-2">
        <button onClick={handleDelete} disabled={loading}
          className="text-xs text-red-400 hover:text-red-300 disabled:opacity-50">
          {loading ? "..." : "Yes, delete"}
        </button>
        <button onClick={() => setConfirming(false)}
          className="text-xs text-neutral-500 hover:text-neutral-300">
          Cancel
        </button>
      </div>
    );
  }

  return (
    <button onClick={() => setConfirming(true)}
      className="text-sm text-neutral-600 hover:text-red-400 transition" title="Delete video">
      Delete
    </button>
  );
}
