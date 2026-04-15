"use client";
import { useEffect, useRef, useState } from "react";

const COOLDOWN_MS = 60 * 60 * 1000; // 1 hour
const LS_KEY = "scan_channels_last_triggered";

function getCooldownRemaining(): number {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return 0;
    const elapsed = Date.now() - parseInt(raw, 10);
    return Math.max(0, COOLDOWN_MS - elapsed);
  } catch {
    return 0;
  }
}

function formatRemaining(ms: number): string {
  const totalSeconds = Math.ceil(ms / 1000);
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

export default function ScanChannelsButton({ channelCount }: { channelCount: number }) {
  const [state, setState] = useState<"idle" | "confirming" | "loading" | "done" | "error">("idle");
  const [added, setAdded] = useState<number | null>(null);
  const [cooldownRemaining, setCooldownRemaining] = useState(0);
  const dialogRef = useRef<HTMLDialogElement>(null);

  // Initialise cooldown from localStorage on mount
  useEffect(() => {
    setCooldownRemaining(getCooldownRemaining());
  }, []);

  // Tick down the cooldown every second while active
  useEffect(() => {
    if (cooldownRemaining <= 0) return;
    const id = setInterval(() => {
      const remaining = getCooldownRemaining();
      setCooldownRemaining(remaining);
      if (remaining <= 0) clearInterval(id);
    }, 1000);
    return () => clearInterval(id);
  }, [cooldownRemaining]);

  useEffect(() => {
    const el = dialogRef.current;
    if (!el) return;
    if (state === "confirming") el.showModal();
    else el.close();
  }, [state]);

  // Sync state when Escape closes the dialog natively
  useEffect(() => {
    const el = dialogRef.current;
    if (!el) return;
    const handleCancel = (e: Event) => {
      e.preventDefault();
      setState("idle");
    };
    el.addEventListener("cancel", handleCancel);
    return () => el.removeEventListener("cancel", handleCancel);
  }, []);

  function handleBackdropClick(e: React.MouseEvent<HTMLDialogElement>) {
    if (e.target === dialogRef.current) setState("idle");
  }

  async function handleScan() {
    setState("loading");
    // Record the start time immediately so the cooldown kicks in right away
    try {
      localStorage.setItem(LS_KEY, Date.now().toString());
    } catch {}
    setCooldownRemaining(COOLDOWN_MS);

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

  const isCoolingDown = cooldownRemaining > 0;
  const isDisabled = state === "loading" || isCoolingDown;

  return (
    <>
      <button
        onClick={() => !isDisabled && setState("confirming")}
        disabled={isDisabled}
        title={isCoolingDown ? `Available again in ${formatRemaining(cooldownRemaining)}` : undefined}
        className="text-sm px-3 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 disabled:opacity-50 disabled:cursor-not-allowed transition cursor-pointer"
      >
        {state === "loading" && "Scanning…"}
        {state === "done" && `Done — ${added} new video${added === 1 ? "" : "s"} queued`}
        {state === "error" && "Scan failed"}
        {(state === "idle" || state === "confirming") && (
          isCoolingDown
            ? `Scan channels (${formatRemaining(cooldownRemaining)})`
            : "Scan channels (last 24h)"
        )}
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
              ⏱ This may take a minute or two — you have {channelCount} channel{channelCount !== 1 ? "s" : ""} to scan.
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
