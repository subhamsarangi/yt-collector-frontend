"use client";
import { useState } from "react";

export default function ScanLimitSlider({ initial }: { initial: number }) {
  const [limit, setLimit] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function save() {
    setSaving(true);
    setSaved(false);
    await fetch("/api/admin/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ scan_videos_per_run: limit }),
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div className="flex flex-col gap-3 bg-neutral-900 rounded-lg p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-neutral-400">New videos queued per scan</h2>
        <span className="text-sm font-mono text-white">{limit}</span>
      </div>
      <input
        type="range"
        min={1}
        max={100}
        step={1}
        value={limit}
        onChange={(e) => setLimit(Number(e.target.value))}
        className="w-full accent-white"
      />
      <div className="flex justify-between text-xs text-neutral-600">
        <span>1</span>
        <span>100</span>
      </div>
      <p className="text-xs text-neutral-500">
        Limits how many new videos are queued per channel scan run to avoid yt-dlp rate limiting.
      </p>
      <button
        onClick={save}
        disabled={saving}
        className="text-xs bg-neutral-800 hover:bg-neutral-700 text-white rounded px-3 py-1.5 self-end transition"
      >
        {saving ? "Saving..." : saved ? "Saved ✓" : "Save"}
      </button>
    </div>
  );
}
