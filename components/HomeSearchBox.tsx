"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function HomeSearchBox() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const q = formData.get("q") as string;
    if (q.trim() && !loading) {
      setLoading(true);
      router.push(`/search?q=${encodeURIComponent(q)}`);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <input
        name="q"
        type="text"
        placeholder="Search videos, transcripts..."
        disabled={loading}
        className="flex-1 bg-neutral-900 border border-neutral-700 rounded-lg px-4 py-3 text-sm placeholder-neutral-600 focus:outline-none focus:border-neutral-500 transition disabled:opacity-50"
      />
      <button
        type="submit"
        disabled={loading}
        className="bg-white text-black rounded-lg px-4 py-3 text-sm font-medium hover:bg-neutral-200 transition whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
      >
        {loading ? (
          <>
            <svg className="w-4 h-4 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
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
