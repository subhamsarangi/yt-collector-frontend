"use client";
import { useState, useEffect } from "react";

type ChannelResult = {
  channel_id: string;
  channel_url: string;
  channel_name: string | null;
  thumbnail_url: string | null;
  entries_found: number;
  queued: number;
  error: string | null;
};

type ScanData = {
  scanned_at: string;
  source: string;
  channels_scanned: number;
  channels_with_new_videos: number;
  total_entries_found: number;
  total_queued: number;
  success_count: number;
  error_count: number;
  channels: ChannelResult[];
};

type Response = {
  scans: ScanData[];
  page: number;
  total: number;
  pages: number;
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

export default function ScanHistoryClient() {
  const [page, setPage] = useState(1);
  const [data, setData] = useState<Response | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    setLoading(true);
    setError("");
    fetch(`/api/channels/scan-history?page=${page}`)
      .then((res) => res.json())
      .then((json) => {
        if (json.error) throw new Error(json.error);
        setData(json);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load"))
      .finally(() => setLoading(false));
  }, [page]);

  if (error) return <p className="text-red-400 text-sm">{error}</p>;
  if (loading) return <p className="text-neutral-500">Loading...</p>;
  if (!data) return null;

  return (
    <div className="flex flex-col gap-6">
      {data.scans.length === 0 ? (
        <p className="text-neutral-500 text-sm">No scans yet.</p>
      ) : (
        <div className="w-full">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {data.scans.map((scan) => (
              <div key={scan.scanned_at} className="bg-neutral-900 rounded-lg p-4 border border-neutral-800 flex flex-col gap-3 aspect-square">
                {/* Header */}
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-semibold text-base">
                      {new Date(scan.scanned_at).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: '2-digit' })} {new Date(scan.scanned_at).toLocaleTimeString()}
                    </p>
                    <span className={`text-xs px-2 py-0.5 rounded ${scan.source === 'automated' ? 'bg-blue-900 text-blue-200' : 'bg-purple-900 text-purple-200'}`}>
                      {scan.source === 'automated' ? 'Auto' : 'Manual'}
                    </span>
                  </div>
                  <p className="text-sm text-neutral-500">{timeAgo(scan.scanned_at)}</p>
                  
                  {/* Top channels */}
                  <div className="flex flex-col gap-2 mt-3">
                    {scan.channels.slice(0, 2).map((ch) => (
                      <div key={ch.channel_id} className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full overflow-hidden ring-1 ring-neutral-600 flex-shrink-0">
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
                        </div>
                        <span className="text-sm text-neutral-200 truncate font-medium">{ch.channel_name ?? "—"}</span>
                      </div>
                    ))}
                  </div>
                </div>

              {/* Stats */}
              <div className="flex flex-col gap-2 text-base">
                <div className="flex justify-between">
                  <span className="text-neutral-500">Scanned:</span>
                  <span className="font-semibold">{scan.channels_scanned}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-500">New:</span>
                  <span className={`font-semibold ${scan.total_entries_found > 0 ? "text-green-400" : ""}`}>
                    {scan.total_entries_found}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-500">Queued:</span>
                  <span className="font-semibold">{scan.total_queued}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-500">Errors:</span>
                  <span className={`font-semibold ${scan.error_count > 0 ? "text-red-400" : ""}`}>
                    {scan.error_count}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
        </div>
      )}

      {/* Pagination */}
      {data.pages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-3 py-1.5 text-sm rounded-lg bg-neutral-800 hover:bg-neutral-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            ← Prev
          </button>
          <span className="text-sm text-neutral-500">
            Page {page} of {data.pages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(data.pages, p + 1))}
            disabled={page === data.pages}
            className="px-3 py-1.5 text-sm rounded-lg bg-neutral-800 hover:bg-neutral-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            Next →
          </button>
        </div>
      )}
    </div>
  );
}
