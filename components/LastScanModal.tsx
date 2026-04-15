"use client";
import { useEffect, useRef, useState } from "react";

type ChannelResult = {
  channel_id: string;
  channel_url: string;
  channel_name: string | null;
  thumbnail_url: string | null;
  entries_found: number;
  queued: number;
  error: string | null;
  scanned_at: string;
};

type ScanData = {
  scanned_at: string;
  channels_scanned: number;
  channels_with_new_videos: number;
  total_entries_found: number;
  total_queued: number;
  success_count: number;
  error_count: number;
  channels: ChannelResult[];
};

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function LastScanModal() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [scan, setScan] = useState<ScanData | null>(null);
  const [error, setError] = useState("");
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const el = dialogRef.current;
    if (!el) return;
    if (open) el.showModal();
    else el.close();
  }, [open]);

  function handleBackdropClick(e: React.MouseEvent<HTMLDialogElement>) {
    if (e.target === dialogRef.current) setOpen(false);
  }

  async function handleOpen() {
    setOpen(true);
    if (scan) return; // already loaded
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/channels/last-scan");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed");
      setScan(data.scan);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load scan data");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <button
        onClick={handleOpen}
        className="text-sm px-3 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 transition cursor-pointer"
        title="View last scan results"
      >
        📋 Last scan
      </button>

      <dialog
        ref={dialogRef}
        onClick={handleBackdropClick}
        className="bg-neutral-900 text-neutral-100 rounded-xl p-0 w-full max-w-2xl shadow-2xl border border-neutral-800 backdrop:bg-black/60 fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-800">
          <div className="flex flex-col gap-0.5">
            <h2 className="font-semibold text-sm">Last channel scan</h2>
            {scan && (
              <p className="text-xs text-neutral-500">
                {timeAgo(scan.scanned_at)} · {new Date(scan.scanned_at).toLocaleString()}
              </p>
            )}
          </div>
          <button
            onClick={() => setOpen(false)}
            className="text-neutral-500 hover:text-white transition text-lg leading-none cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-5 flex flex-col gap-5 max-h-[70vh] overflow-y-auto">
          {loading && (
            <div className="flex flex-col gap-3 animate-pulse">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="h-16 bg-neutral-800 rounded-lg" />
                ))}
              </div>
              <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                {[...Array(12)].map((_, i) => (
                  <div key={i} className="aspect-square bg-neutral-800 rounded-full" />
                ))}
              </div>
            </div>
          )}

          {error && <p className="text-sm text-red-400">{error}</p>}

          {!loading && !scan && !error && (
            <p className="text-sm text-neutral-500">No scan data found yet. Run a scan first.</p>
          )}

          {!loading && scan && (
            <>
              {/* Stats grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <StatCard label="Channels scanned" value={scan.channels_scanned} />
                <StatCard
                  label="Channels with new videos"
                  value={scan.channels_with_new_videos}
                  highlight={scan.channels_with_new_videos > 0}
                />
                <StatCard label="New videos found" value={scan.total_entries_found} />
                <StatCard label="Queued for processing" value={scan.total_queued} />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <StatCard label="Successful fetches" value={scan.success_count} color="green" />
                <StatCard
                  label="Errors"
                  value={scan.error_count}
                  color={scan.error_count > 0 ? "red" : undefined}
                />
              </div>

              {/* Channel thumbnail grid */}
              <div className="flex flex-col gap-2">
                <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">
                  Scanned channels
                </p>
                <div className="grid grid-cols-5 sm:grid-cols-8 gap-2">
                  {scan.channels.map((ch) => (
                    <div
                      key={ch.channel_id ?? ch.channel_url}
                      className="flex flex-col items-center gap-1 group"
                      title={`${ch.channel_name ?? ch.channel_url}\n${ch.entries_found} new · ${ch.queued} queued${ch.error ? `\nError: ${ch.error}` : ""}`}
                    >
                      <div className={`relative w-10 h-10 rounded-full overflow-hidden flex-shrink-0 ring-2 ${
                        ch.error
                          ? "ring-red-600"
                          : ch.entries_found > 0
                          ? "ring-green-600"
                          : "ring-neutral-700"
                      }`}>
                        {ch.thumbnail_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={ch.thumbnail_url}
                            alt={ch.channel_name ?? ""}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full bg-neutral-700 flex items-center justify-center text-xs font-bold">
                            {(ch.channel_name ?? ch.channel_url ?? "?")[0]?.toUpperCase()}
                          </div>
                        )}
                        {/* Badge: new video count */}
                        {ch.entries_found > 0 && (
                          <span className="absolute -top-0.5 -right-0.5 bg-green-500 text-black text-[9px] font-bold rounded-full w-4 h-4 flex items-center justify-center leading-none">
                            {ch.entries_found > 9 ? "9+" : ch.entries_found}
                          </span>
                        )}
                        {ch.error && (
                          <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-[9px] font-bold rounded-full w-4 h-4 flex items-center justify-center leading-none">
                            !
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-neutral-500 text-center leading-tight line-clamp-1 w-full">
                        {ch.channel_name ?? "—"}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="flex items-center gap-4 text-xs text-neutral-600 mt-1">
                  <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-green-600 inline-block" /> New videos</span>
                  <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-neutral-700 inline-block" /> No new videos</span>
                  <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-red-600 inline-block" /> Error</span>
                </div>
              </div>

              {/* Error details if any */}
              {scan.error_count > 0 && (
                <div className="flex flex-col gap-2">
                  <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">Errors</p>
                  {scan.channels.filter(c => c.error).map((ch) => (
                    <div key={ch.channel_id ?? ch.channel_url} className="bg-neutral-950 border border-red-900 rounded-lg px-3 py-2 text-xs">
                      <span className="text-neutral-400">{ch.channel_name ?? ch.channel_url}</span>
                      <span className="text-red-400 ml-2">{ch.error}</span>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </dialog>
    </>
  );
}

function StatCard({
  label,
  value,
  highlight,
  color,
}: {
  label: string;
  value: number;
  highlight?: boolean;
  color?: "green" | "red";
}) {
  const valueColor =
    color === "green" ? "text-green-400" :
    color === "red" && value > 0 ? "text-red-400" :
    highlight ? "text-white" :
    "text-neutral-100";

  return (
    <div className="bg-neutral-950 rounded-lg px-3 py-3 flex flex-col gap-1">
      <span className={`text-xl font-bold font-mono ${valueColor}`}>{value}</span>
      <span className="text-xs text-neutral-500 leading-tight">{label}</span>
    </div>
  );
}
