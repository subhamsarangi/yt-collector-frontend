"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AddChannelForm() {
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [domain, setDomain] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    await fetch("/api/channels", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, url, domain }),
    });
    setName(""); setUrl(""); setDomain("");
    setLoading(false);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-2">
      <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Channel name"
        required className="flex-1 bg-neutral-900 border border-neutral-700 rounded px-3 py-2 text-sm" />
      <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="Channel URL"
        required className="flex-1 bg-neutral-900 border border-neutral-700 rounded px-3 py-2 text-sm" />
      <input value={domain} onChange={(e) => setDomain(e.target.value)} placeholder="Domain (e.g. AI)"
        required className="w-32 bg-neutral-900 border border-neutral-700 rounded px-3 py-2 text-sm" />
      <button type="submit" disabled={loading}
        className="bg-white text-black rounded px-4 py-2 text-sm font-medium hover:bg-neutral-200 disabled:opacity-50">
        {loading ? "Adding..." : "Add"}
      </button>
    </form>
  );
}
