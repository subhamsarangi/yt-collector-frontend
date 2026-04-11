"use client";
import { useState } from "react";

export default function AudioCapSlider({ initial }: { initial: number }) {
  const [cap, setCap] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function save() {
    setSaving(true);
    setSaved(false);
    await fetch("/api/admin/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ audio_cap_minutes: cap }),
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div className="flex flex-col gap-3 bg-neutral-900 rounded-lg p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-neutral-400">Audio download cap</h2>
        <span className="text-sm font-mono text-white">{cap} min</span>
      </div>
      <input
        type="range"
        min={5}
        max={30}
        step={1}
        value={cap}
        onChange={(e) => setCap(Number(e.target.value))}
        className="w-full accent-white"
      />
      <div className="flex justify-between text-xs text-neutral-600">
        <span>5 min</span>
        <span>30 min</span>
      </div>
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
