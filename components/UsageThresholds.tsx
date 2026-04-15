"use client";
import { useState } from "react";

type ThresholdMap = Record<string, { hourly: number; daily: number }>;

export default function UsageThresholds({
  events,
  labels,
  initial,
}: {
  events: string[];
  labels: Record<string, string>;
  initial: ThresholdMap;
}) {
  const [values, setValues] = useState<ThresholdMap>(
    Object.fromEntries(events.map(e => [e, { ...initial[e] }]))
  );
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  function update(event: string, field: "hourly" | "daily", val: number) {
    setValues(prev => ({
      ...prev,
      [event]: { ...prev[event], [field]: Math.max(1, val) },
    }));
  }

  async function save() {
    setSaving(true);
    setSaved(false);

    // Upsert each threshold as a settings key: threshold_<event>
    await Promise.all(
      events.map(event =>
        fetch("/api/admin/settings/thresholds", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ event, hourly: values[event].hourly, daily: values[event].daily }),
        })
      )
    );

    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div className="flex flex-col gap-3 bg-neutral-900 rounded-lg p-4">
      <p className="text-xs text-neutral-500">
        Set the call count at which each metric turns amber (70%) and red (100%).
      </p>

      <div className="grid grid-cols-[1fr_auto_auto] gap-x-4 gap-y-2 items-center">
        <span className="text-xs text-neutral-600 font-semibold">Metric</span>
        <span className="text-xs text-neutral-600 font-semibold text-right">Hourly</span>
        <span className="text-xs text-neutral-600 font-semibold text-right">Daily</span>

        {events.map(event => (
          <>
            <span key={`${event}-label`} className="text-sm text-neutral-300">{labels[event]}</span>
            <input
              key={`${event}-hourly`}
              type="number"
              min={1}
              value={values[event].hourly}
              onChange={e => update(event, "hourly", Number(e.target.value))}
              className="w-16 bg-neutral-800 text-white text-sm text-right rounded px-2 py-1 font-mono border border-neutral-700 focus:outline-none focus:border-neutral-500"
            />
            <input
              key={`${event}-daily`}
              type="number"
              min={1}
              value={values[event].daily}
              onChange={e => update(event, "daily", Number(e.target.value))}
              className="w-16 bg-neutral-800 text-white text-sm text-right rounded px-2 py-1 font-mono border border-neutral-700 focus:outline-none focus:border-neutral-500"
            />
          </>
        ))}
      </div>

      <button
        onClick={save}
        disabled={saving}
        className="text-xs bg-neutral-800 hover:bg-neutral-700 text-white rounded px-3 py-1.5 self-end transition mt-1"
      >
        {saving ? "Saving..." : saved ? "Saved ✓" : "Save thresholds"}
      </button>
    </div>
  );
}
