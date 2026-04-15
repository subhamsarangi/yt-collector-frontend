"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

type Channel = {
  id: string;
  name: string;
  url: string;
  domain: string;
  thumbnail_url: string | null;
  created_at: string;
};

export default function EditChannelModal({ channel }: { channel: Channel }) {
  const [open, setOpen] = useState(false);
  const [domains, setDomains] = useState<string[]>([]);
  const [domain, setDomain] = useState(channel.domain);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const dialogRef = useRef<HTMLDialogElement>(null);
  const router = useRouter();

  // Sync dialog open/close with state
  useEffect(() => {
    const el = dialogRef.current;
    if (!el) return;
    if (open) {
      el.showModal();
    } else {
      el.close();
    }
  }, [open]);

  // Close on backdrop click
  function handleBackdropClick(e: React.MouseEvent<HTMLDialogElement>) {
    if (e.target === dialogRef.current) setOpen(false);
  }

  async function handleOpen() {
    setDomain(channel.domain);
    setError("");
    // Fetch domains fresh each time
    const res = await fetch("/api/domains");
    if (res.ok) {
      const data = await res.json();
      setDomains(data.map((d: { name: string }) => d.name));
    }
    setOpen(true);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    const res = await fetch(`/api/channels/${channel.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ domain }),
    });
    setSaving(false);
    if (res.ok) {
      setOpen(false);
      router.push(`/channel/${channel.id}`);
    } else {
      const data = await res.json();
      setError(data.error ?? "Failed to save.");
    }
  }

  const readonlyClass =
    "w-full bg-neutral-950 border border-neutral-800 rounded px-3 py-2 text-sm text-neutral-500 cursor-default select-all";

  return (
    <>
      <button
        onClick={handleOpen}
        title="Edit channel"
        className="flex items-center gap-1.5 text-sm text-neutral-400 hover:text-white transition cursor-pointer"
      >
        <span>✎</span>
        <span>Edit</span>
      </button>

      <dialog
        ref={dialogRef}
        onClick={handleBackdropClick}
        className="bg-neutral-900 text-neutral-100 rounded-xl p-0 w-full max-w-md shadow-2xl border border-neutral-800 backdrop:bg-black/60 fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
      >
        <form onSubmit={handleSave}>
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-800">
            <div className="flex items-center gap-3">
              {channel.thumbnail_url ? (
                <img
                  src={channel.thumbnail_url}
                  alt={channel.name}
                  className="w-8 h-8 rounded-full object-cover flex-shrink-0"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-neutral-700 flex items-center justify-center text-sm font-bold flex-shrink-0">
                  {channel.name[0]}
                </div>
              )}
              <span className="font-semibold text-sm truncate">{channel.name}</span>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="text-neutral-500 hover:text-white transition text-lg leading-none cursor-pointer"
            >
              ✕
            </button>
          </div>

          {/* Body */}
          <div className="flex flex-col gap-4 px-5 py-5">
            {/* Read-only fields */}
            <div className="flex flex-col gap-1">
              <label className="text-xs text-neutral-500">Channel name</label>
              <input readOnly value={channel.name} className={readonlyClass} />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs text-neutral-500">URL</label>
              <input readOnly value={channel.url} className={readonlyClass} />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs text-neutral-500">Channel ID (internal)</label>
              <input readOnly value={channel.id} className={readonlyClass} />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs text-neutral-500">Added on</label>
              <input
                readOnly
                value={new Date(channel.created_at).toLocaleDateString(undefined, {
                  year: "numeric", month: "short", day: "numeric",
                })}
                className={readonlyClass}
              />
            </div>

            {/* Editable field */}
            <div className="flex flex-col gap-1">
              <label className="text-xs text-neutral-400 font-semibold">
                Category <span className="text-red-500">*</span>
              </label>
              <select
                value={domain}
                onChange={(e) => setDomain(e.target.value)}
                required
                className="w-full bg-neutral-800 border border-neutral-700 rounded px-3 py-2 text-sm focus:outline-none focus:border-neutral-500"
              >
                <option value="">Select category</option>
                {domains.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>

            {error && <p className="text-xs text-red-400">{error}</p>}
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-2 px-5 py-4 border-t border-neutral-800">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="text-sm text-neutral-500 hover:text-white px-3 py-1.5 transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || !domain || domain === channel.domain}
              className="text-sm bg-white text-black rounded px-4 py-1.5 font-medium hover:bg-neutral-200 disabled:opacity-40 transition cursor-pointer"
            >
              {saving ? "Saving..." : "Save"}
            </button>
          </div>
        </form>
      </dialog>
    </>
  );
}
