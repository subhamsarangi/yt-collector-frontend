"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function SearchForm({ q }: { q?: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState(q ?? "");

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!loading && query.trim()) {
      setLoading(true);
      router.push(`/search?q=${encodeURIComponent(query)}`);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <input
        name="q"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search videos, transcripts..."
        disabled={loading}
        className="flex-1 bg-neutral-900 border border-neutral-700 rounded px-3 py-2 text-sm disabled:opacity-50"
      />
      <button
        type="submit"
        disabled={loading}
        className="bg-white text-black rounded px-4 py-2 text-sm font-medium hover:bg-neutral-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 whitespace-nowrap"
      >
        {loading ? (
          <>
            <svg className="w-3 h-3 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            Searching...
          </>
        ) : (
          "Search"
        )}
      </button>
    </form>
  );
}
