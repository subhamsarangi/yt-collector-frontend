"use client";
import { useState } from "react";

export default function MigrateChannelThumbnailsButton() {
  const [state, setState] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [result, setResult] = useState<{ migrated: number; failed: number; skipped: number } | null>(null);

  async function handleMigrate() {
    setState("loading");
    try {
      const res = await fetch("/api/admin/migrate-channel-thumbnails", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error();
      setResult(data);
      setState("done");
    } catch {
      setState("error");
    }
  }

  return (
    <div className="flex flex-col gap-2 bg-neutral-900 rounded-lg p-4">
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-0.5">
          <span className="text-sm font-semibold text-neutral-400">Mirror channel thumbnails to R2</span>
          <span className="text-xs text-neutral-600">
            Downloads existing YouTube thumbnail URLs and re-hosts them on R2. Run once.
          </span>
        </div>
        <button
          onClick={handleMigrate}
          disabled={state === "loading" || state === "done"}
          className="text-xs bg-neutral-800 hover:bg-neutral-700 text-white rounded px-3 py-1.5 transition disabled:opacity-50 cursor-pointer flex-shrink-0 ml-4"
        >
          {state === "loading" ? "Migrating..." : state === "done" ? "Done ✓" : "Run migration"}
        </button>
      </div>
      {state === "done" && result && (
        <p className="text-xs text-green-400">
          {result.migrated} migrated · {result.skipped} already on R2 · {result.failed} failed
        </p>
      )}
      {state === "error" && (
        <p className="text-xs text-red-400">Migration failed. Check logs.</p>
      )}
    </div>
  );
}
