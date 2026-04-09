"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

type LogEntry =
  | { type: "step"; text: string }
  | { type: "added"; url: string; name: string }
  | { type: "failed"; url: string; error: string }
  | { type: "done"; added: number; failed: number; skipped: number }
  | { type: "error"; text: string };

export default function BulkImportChannels() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [log, setLog] = useState<LogEntry[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const push = (e: LogEntry) => setLog((prev) => [...prev, e]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const file = fileRef.current?.files?.[0];
    if (!file) return;

    setLoading(true);
    setLog([]);

    const formData = new FormData();
    formData.append("file", file);

    const res = await fetch("/api/channels/bulk", { method: "POST", body: formData });
    if (!res.body) { push({ type: "error", text: "No response." }); setLoading(false); return; }

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
          if (p.error)         push({ type: "error", text: p.error });
          else if (p.step)     push({ type: "step", text: p.step });
          else if (p.added_channel)  push({ type: "added", url: p.added_channel.url, name: p.added_channel.name });
          else if (p.failed_channel) push({ type: "failed", url: p.failed_channel.url, error: p.failed_channel.error });
          else if (p.done)     push({ type: "done", added: p.added, failed: p.failed, skipped: p.skipped });
        } catch { /* skip */ }
      }
    }

    setLoading(false);
    router.refresh();
    if (fileRef.current) fileRef.current.value = "";
  }

  return (
    <div className="flex flex-col gap-3">
      <button
        onClick={() => { setOpen((o) => !o); setLog([]); }}
        className="text-xs text-neutral-500 hover:text-neutral-300 transition w-fit"
      >
        {open ? "▲ Hide bulk import" : "▼ Bulk import from file"}
      </button>

      {open && (
        <div className="flex flex-col gap-3 border border-neutral-800 rounded-lg p-4 bg-neutral-950">
          <p className="text-xs text-neutral-500">
            Upload a .txt file with YouTube channel URLs (one per line). Lines not starting with{" "}
            <code className="text-neutral-400">https://www.youtube.com</code> are ignored.
            Channels already in the table are skipped. All new channels are added under{" "}
            <span className="text-neutral-400">Uncategorized</span> — rename the domain afterwards.
          </p>

          <form onSubmit={handleSubmit} className="flex gap-2 items-center">
            <input
              ref={fileRef}
              type="file"
              accept=".txt,text/plain"
              required
              disabled={loading}
              className="text-sm text-neutral-400 file:mr-3 file:py-1 file:px-3 file:rounded file:border-0 file:text-xs file:bg-neutral-800 file:text-neutral-300 hover:file:bg-neutral-700 disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={loading}
              className="bg-white text-black rounded px-4 py-1.5 text-sm font-medium hover:bg-neutral-200 disabled:opacity-50 whitespace-nowrap"
            >
              {loading ? "Importing..." : "Import"}
            </button>
          </form>

          {log.length > 0 && (
            <div className="flex flex-col gap-1.5 text-xs mt-1">
              {log.map((entry, i) => {
                const isLast = i === log.length - 1;
                if (entry.type === "step") return (
                  <div key={i} className={`flex items-start gap-2 ${loading && isLast ? "text-yellow-400" : "text-neutral-500"}`}>
                    <span className="flex-shrink-0">{loading && isLast ? "⏳" : "·"}</span>
                    <span>{entry.text}</span>
                  </div>
                );
                if (entry.type === "added") return (
                  <div key={i} className="flex items-center gap-2 text-green-400 pl-4">
                    <span>✓</span>
                    <span className="font-medium">{entry.name}</span>
                    <span className="text-neutral-600 truncate">{entry.url}</span>
                  </div>
                );
                if (entry.type === "failed") return (
                  <div key={i} className="flex flex-col gap-0.5 pl-4 text-red-400">
                    <div className="flex items-center gap-2">
                      <span>✗</span>
                      <span className="truncate">{entry.url}</span>
                    </div>
                    <span className="text-red-600 pl-4">{entry.error}</span>
                  </div>
                );
                if (entry.type === "done") return (
                  <div key={i} className="flex items-center gap-2 text-green-400 font-medium mt-1">
                    <span>✓</span>
                    <span>Done — {entry.added} added, {entry.failed} failed, {entry.skipped} skipped.</span>
                  </div>
                );
                if (entry.type === "error") return (
                  <div key={i} className="flex items-center gap-2 text-red-400">
                    <span>✗</span><span>{entry.text}</span>
                  </div>
                );
                return null;
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
