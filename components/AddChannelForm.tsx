"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AddChannelForm() {
  const [url, setUrl] = useState("");
  const [name, setName] = useState("");
  const [domain, setDomain] = useState("");
  const [fetching, setFetching] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleUrlBlur() {
    if (!url) return;
    setFetching(true);
    setName("");
    setDomain("");
    try {
      const res = await fetch("/api/channels/info", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ channel_url: url }),
      });
      if (res.ok) {
        const data = await res.json();
        setName(data.name ?? "");
        setDomain(data.domain ?? "");
      }
    } finally {
      setFetching(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    await fetch("/api/channels", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, url, domain }),
    });
    setUrl(""); setName(""); setDomain("");
    setLoading(false);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <div className="flex flex-col sm:flex-row gap-2">

        <div className="flex-1 flex flex-col gap-1">
          <label className="text-xs text-neutral-400">Channel URL <span className="text-red-500">*</span></label>
          <input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onBlur={handleUrlBlur}
            placeholder="https://youtube.com/@..."
            required
            className="bg-neutral-900 border border-neutral-700 rounded px-3 py-2 text-sm"
          />
        </div>

        <div className="flex-1 flex flex-col gap-1">
          <label className="text-xs text-neutral-400">
            Channel name <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={fetching ? "" : "Auto-filled from URL"}
              required
              disabled={fetching}
              className="w-full bg-neutral-900 border border-neutral-700 rounded px-3 py-2 text-sm disabled:opacity-50"
            />
            {fetching && (
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 text-xs animate-pulse">
                fetching...
              </span>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs text-neutral-400">Domain <span className="text-red-500">*</span></label>
          <div className="relative">
            <input
              value={domain}
              onChange={(e) => setDomain(e.target.value)}
              placeholder={fetching ? "" : "e.g. AI"}
              required
              disabled={fetching}
              className="w-32 bg-neutral-900 border border-neutral-700 rounded px-3 py-2 text-sm disabled:opacity-50"
            />
            {fetching && (
              <span className="absolute right-2 top-1/2 -translate-y-1/2 text-neutral-500 text-xs animate-pulse">
                ...
              </span>
            )}
          </div>
        </div>

      </div>
      <button
        type="submit"
        disabled={loading || fetching || !name}
        className="self-start bg-white text-black rounded px-4 py-2 text-sm font-medium hover:bg-neutral-200 disabled:opacity-50"
      >
        {loading ? "Adding..." : "Add Channel"}
      </button>
    </form>
  );
}
