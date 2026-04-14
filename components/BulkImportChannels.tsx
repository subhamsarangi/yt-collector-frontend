"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

type LogEntry =
  | { type: "step"; text: string }
  | { type: "added"; url: string; name: string }
  | { type: "failed"; url: string; error: string }
  | { type: "done"; added: number; failed: number; skipped: number }
  | { type: "error"; text: string };

type Tab = "paste" | "file";

export default function BulkImportChannels() {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<Tab>("paste");
  const [loading, setLoading] = useState(false);
  const [log, setLog] = useState<LogEntry[]>([]);
  const [pasteValue, setPasteValue] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const push = (e: LogEntry) => setLog((prev) => [...prev, e]);

  async function readStream(body: ReadableStream) {
    const reader = body.getReader();
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
          if (p.error)              push({ type: "error", text: p.error });
          else if (p.step)          push({ type: "step", text: p.step });
          else if (p.added_channel) push({ type: "added", url: p.added_channel.url, name: p.added_channel.name });
          else if (p.failed_channel)push({ type: "failed", url: p.failed_channel.url, error: p.failed_channel.error });
          else if (p.done)          push({ type: "done", added: p.added, failed: p.failed, skipped: p.skipped });
        } catch { /* skip */ }
      }
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setLog([]);

    try {
      let res: Response;

      if (tab === "paste") {
        // Turn pasted text into a File blob so the existing API route works unchanged
        const blob = new Blob([pasteValue], { type: "text/plain" });
        const formData = new FormData();
        formData.append("file", blob, "channels.txt");
        res = await fetch("/api/channels/bulk", { method: "POST", body: formData });
      } else {
        const file = fileRef.current?.files?.[0];
        if (!file) { push({ type: "error", text: "No file selected." }); setLoading(false); return; }
        const formData = new FormData();
        formData.append("file", file);
        res = await fetch("/api/channels/bulk", { method: "POST", body: formData });
      }

      if (!res.body) { push({ type: "error", text: "No response from server." }); return; }
      await readStream(res.body);
    } catch (err) {
      push({ type: "error", text: err instanceof Error ? err.message : "Unexpected error." });
    } finally {
      setLoading(false);
      router.refresh();
      setPasteValue("");
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  const doneEntry = log.find((e) => e.type === "done") as Extract<LogEntry, { type: "done" }> | undefined;

  return (
    <div className="flex flex-col gap-3">
      <button
        onClick={() => { setOpen((o) => !o); setLog([]); }}
        className="text-xs text-neutral-500 hover:text-neutral-300 transition w-fit"
      >
        {open ? "▲ Hide bulk import" : "▼ Bulk import channels"}
      </button>

      {open && (
        <div className="flex flex-col gap-4 border border-neutral-800 rounded-lg p-4 bg-neutral-950">

          {/* Tabs */}
          <div className="flex gap-1 border-b border-neutral-800 -mx-4 px-4">
            {(["paste", "file"] as Tab[]).map((t) => (
              <button
                key={t}
                onClick={() => { setTab(t); setLog([]); }}
                disabled={loading}
                className={`text-xs px-3 py-1.5 -mb-px border-b-2 transition ${
                  tab === t
                    ? "border-white text-white"
                    : "border-transparent text-neutral-500 hover:text-neutral-300"
                }`}
              >
                {t === "paste" ? "Paste URLs" : "Upload file"}
              </button>
            ))}
          </div>

          <p className="text-xs text-neutral-500">
            One YouTube channel URL per line. Lines not starting with{" "}
            <code className="text-neutral-400">https://www.youtube.com</code> are ignored.
            Channels already saved are skipped automatically. New channels go under{" "}
            <span className="text-neutral-400">Uncategorized</span>.
          </p>

          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            {tab === "paste" ? (
              <textarea
                value={pasteValue}
                onChange={(e) => setPasteValue(e.target.value)}
                disabled={loading}
                placeholder={"https://www.youtube.com/@channel1\nhttps://www.youtube.com/@channel2\n..."}
                rows={6}
                className="w-full bg-neutral-900 border border-neutral-700 rounded px-3 py-2 text-xs text-neutral-300 placeholder-neutral-600 resize-y font-mono disabled:opacity-50 focus:outline-none focus:border-neutral-500"
              />
            ) : (
              <input
                ref={fileRef}
                type="file"
                accept=".txt,text/plain"
                required
                disabled={loading}
                className="text-sm text-neutral-400 file:mr-3 file:py-1 file:px-3 file:rounded file:border-0 file:text-xs file:bg-neutral-800 file:text-neutral-300 hover:file:bg-neutral-700 disabled:opacity-50"
              />
            )}

            <button
              type="submit"
              disabled={loading || (tab === "paste" && !pasteValue.trim())}
              className="bg-white text-black rounded px-4 py-2 text-sm font-medium hover:bg-neutral-200 disabled:opacity-50 w-fit"
            >
              {loading ? "Importing…" : "Import"}
            </button>
          </form>

          {/* Log */}
          {log.length > 0 && (
            <div className="flex flex-col gap-1 text-xs border-t border-neutral-800 pt-3 max-h-64 overflow-y-auto">
              {log.map((entry, i) => {
                const isLast = i === log.length - 1;

                if (entry.type === "step") return (
                  <div key={i} className={`flex items-start gap-2 ${loading && isLast ? "text-yellow-400" : "text-neutral-500"}`}>
                    <span className="flex-shrink-0 mt-px">{loading && isLast ? "⏳" : "·"}</span>
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
                  <div key={i} className="flex flex-col gap-0.5 pl-4">
                    <div className="flex items-center gap-2 text-red-400">
                      <span>✗</span>
                      <span className="truncate">{entry.url}</span>
                    </div>
                    <span className="text-red-600 pl-4">{entry.error}</span>
                  </div>
                );

                if (entry.type === "error") return (
                  <div key={i} className="flex items-center gap-2 text-red-400 font-medium">
                    <span>✗</span><span>{entry.text}</span>
                  </div>
                );

                // "done" — rendered as summary banner below
                return null;
              })}
            </div>
          )}

          {/* Summary banner */}
          {doneEntry && (
            <div className={`rounded-lg px-4 py-3 text-sm font-medium flex items-center gap-3 ${
              doneEntry.failed > 0 && doneEntry.added === 0
                ? "bg-red-950 border border-red-700 text-red-300"
                : doneEntry.failed > 0
                ? "bg-yellow-950 border border-yellow-700 text-yellow-300"
                : "bg-green-950 border border-green-700 text-green-300"
            }`}>
              <span>{doneEntry.failed > 0 && doneEntry.added === 0 ? "✗" : "✓"}</span>
              <span>
                {doneEntry.added} added
                {doneEntry.skipped > 0 && `, ${doneEntry.skipped} already existed`}
                {doneEntry.failed > 0 && `, ${doneEntry.failed} failed`}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
