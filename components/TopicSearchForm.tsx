"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

type LogEntry =
  | { type: "step"; text: string }
  | { type: "queries"; list: string[] }
  | { type: "query_done"; query: string; hits: number; completed: number; total: number }
  | { type: "query_failed"; query: string; error: string }
  | { type: "error"; text: string }
  | { type: "done"; added: number };

export default function TopicSearchForm() {
  const [topic, setTopic] = useState("");
  const [loading, setLoading] = useState(false);
  const [log, setLog] = useState<LogEntry[]>([]);
  const [topicId, setTopicId] = useState<string | null>(null);
  const router = useRouter();

  const push = (entry: LogEntry) => setLog((prev) => [...prev, entry]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setLog([]);
    setTopicId(null);

    const res = await fetch("/api/topic/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ topic }),
    });

    if (!res.body) {
      push({ type: "error", text: "No response from server." });
      setLoading(false);
      return;
    }

    const reader = res.body.getReader();
    const dec = new TextDecoder();
    let buf = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += dec.decode(value, { stream: true });

      const lines = buf.split("\n");
      buf = lines.pop() ?? "";

      for (const line of lines) {
        if (!line.startsWith("data: ")) continue;
        try {
          const p = JSON.parse(line.slice(6));

          if (p.error)             push({ type: "error", text: p.error });
          else if (p.step)         push({ type: "step", text: p.step });
          else if (p.queries)      push({ type: "queries", list: p.queries });
          else if (p.query_done)   push({ type: "query_done", query: p.query_done, hits: p.hits, completed: p.completed, total: p.total });
          else if (p.query_failed) push({ type: "query_failed", query: p.query_failed, error: p.error });
          else if (p.done) {
            push({ type: "done", added: p.added });
            setTopicId(p.topic_id);
            router.refresh();
          }
        } catch { /* skip */ }
      }
    }

    setLoading(false);
    setTopic("");
    if (topicId) router.push(`/topic/${topicId}`);
  }

  return (
    <div className="flex flex-col gap-3">
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          placeholder="Search a topic..."
          required
          disabled={loading}
          className="flex-1 bg-neutral-900 border border-neutral-700 rounded px-3 py-2 text-sm disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={loading}
          className="bg-white text-black rounded px-4 py-2 text-sm font-medium hover:bg-neutral-200 disabled:opacity-50 whitespace-nowrap"
        >
          {loading ? "Searching..." : "Search"}
        </button>
      </form>

      {log.length > 0 && (
        <div className="flex flex-col gap-1.5 text-xs border border-neutral-800 rounded-lg p-3 bg-neutral-950">
          {log.map((entry, i) => {
            const isLast = i === log.length - 1;
            const pulse = loading && isLast;

            if (entry.type === "step") return (
              <div key={i} className={`flex items-start gap-2 ${pulse ? "text-yellow-400" : "text-neutral-400"}`}>
                <span className="mt-0.5 flex-shrink-0">{pulse ? "⏳" : "✓"}</span>
                <span>{entry.text}</span>
              </div>
            );

            if (entry.type === "queries") return (
              <div key={i} className="flex flex-col gap-1 pl-5">
                <span className="text-neutral-500">Queries generated:</span>
                {entry.list.map((q, qi) => (
                  <span key={qi} className="text-neutral-300 font-mono pl-2">→ {q}</span>
                ))}
              </div>
            );

            if (entry.type === "query_done") return (
              <div key={i} className="flex items-center gap-2 pl-5 text-neutral-400">
                <span className="text-green-500">✓</span>
                <span className="font-mono text-neutral-300">{entry.query}</span>
                <span className="text-neutral-600">— {entry.hits} result{entry.hits !== 1 ? "s" : ""} ({entry.completed}/{entry.total})</span>
              </div>
            );

            if (entry.type === "query_failed") return (
              <div key={i} className="flex items-center gap-2 pl-5 text-red-400">
                <span>✗</span>
                <span className="font-mono">{entry.query}</span>
                <span className="text-red-600">— {entry.error}</span>
              </div>
            );

            if (entry.type === "error") return (
              <div key={i} className="flex items-center gap-2 text-red-400">
                <span>✗</span>
                <span>{entry.text}</span>
              </div>
            );

            if (entry.type === "done") return (
              <div key={i} className="flex items-center justify-between gap-2 text-green-400 font-medium">
                <div className="flex items-center gap-2">
                  <span>✓</span>
                  <span>Done — {entry.added} video{entry.added !== 1 ? "s" : ""} added to queue.</span>
                </div>
                {topicId && (
                  <a href={`/topic/${topicId}`} className="text-xs text-white underline underline-offset-2 hover:text-neutral-300 whitespace-nowrap">
                    Go to topic →
                  </a>
                )}
              </div>
            );

            return null;
          })}
        </div>
      )}
    </div>
  );
}
