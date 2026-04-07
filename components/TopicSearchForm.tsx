"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function TopicSearchForm() {
  const [topic, setTopic] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMsg("");
    const res = await fetch("/api/topic/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ topic }),
    });
    const data = await res.json();
    setLoading(false);
    if (data.ok) {
      setMsg(`Added ${data.added} videos to queue.`);
      setTopic("");
      router.refresh();
    } else {
      setMsg("Search failed.");
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <input value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="Search a topic..."
        required className="flex-1 bg-neutral-900 border border-neutral-700 rounded px-3 py-2 text-sm" />
      <button type="submit" disabled={loading}
        className="bg-white text-black rounded px-4 py-2 text-sm font-medium hover:bg-neutral-200 disabled:opacity-50">
        {loading ? "Searching..." : "Search"}
      </button>
      {msg && <p className="text-xs text-neutral-400 self-center">{msg}</p>}
    </form>
  );
}
