"use client";
import { useEffect, useRef, useState } from "react";

export default function ScanChannelsButton() {
  const [state, setState] = useState<"idle" | "confirming" | "loading" | "done" | "error">("idle");
  const [added, setAdded] = useState<number | null>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const el = dialogRef.current;
    if (!el) return;
    if (state === "confirming") el.showModal();
    else el.close();
  }, [state]);

  function handleBackdropClick(e: React.MouseEvent<HTMLDialogElement>) {
    if (e.target === dialogRef.current) setState("idle");
  }

  async function handleScan() {
    setState("loading");
    try {
      const res = await fetch("/api/cron/channels");
      const data = await res.json();
      if (!res.ok) throw new Error();
      setAdded(data.added ?? 0);
      setState("done");
    } catch {
      setState("error");
    } finally {
      setTimeout(() => setState("idle"), 4000);
    }
  }

  return (
    <>
      <button
        onClick={() => setState("confirming")}
        disabled={state === "loading"}
        className="text-sm px-3 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 disabled:opacity-50 transition cursor-pointer"
      >
        {state === "loading" && "Scanning…"}
        {state === "done" && `Done — ${added} new video${added === 1 ? "" : "s"} queued`}
        {state === "error" && "Scan failed"}
        {(state === "idle" || state === "confirming") && "Scan channels (last 24h)"}
      </button>

      <dialog
        ref={dialogRef}
        onClick={handleBackdropClick}
        className="bg-neutral-900 text-neutral-100 rounded-xl p-0 w-full max-w-sm shadow-2xl border border-neutral-800 backdrop:bg-black/60 fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
      >
        <div className="flex flex-col gap-4 p-6">
          <div className="flex flex-col gap-1">
            <h2 className="font-semibold text-base">Scan channels?</h2>
            <p className="text-sm text-neutral-400">
              This will check all tracked channels for videos published in the last 24 hours and queue any new ones for processing.
            </p>
            <p className="text-xs text-neutral-600 mt-1">
              ⏱ This may take a minute or two depending on how many channels you have.
            </p>
          </div>
          <div className="flex justify-end gap-2">
            <button
              onClick={() => setState("idle")}
              className="text-sm text-neutral-500 hover:text-white px-3 py-1.5 transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={handleScan}
              className="text-sm bg-white text-black rounded px-4 py-1.5 font-medium hover:bg-neutral-200 transition cursor-pointer"
            >
              Yes, scan now
            </button>
          </div>
        </div>
      </dialog>
    </>
  );
}
