"use client";
import { useEffect, useState } from "react";

const REBOOT_KEY = "oci_reboot_at";
const WAIT_SECONDS = 100;

export function markRebootStarted() {
  localStorage.setItem(REBOOT_KEY, Date.now().toString());
}

export function clearRebootMark() {
  localStorage.removeItem(REBOOT_KEY);
}

export default function RebootModal() {
  const [remaining, setRemaining] = useState<number | null>(null);

  useEffect(() => {
    function calc() {
      const raw = localStorage.getItem(REBOOT_KEY);
      if (!raw) { setRemaining(null); return; }
      const elapsed = Math.floor((Date.now() - parseInt(raw)) / 1000);
      const left = WAIT_SECONDS - elapsed;
      if (left <= 0) { clearRebootMark(); setRemaining(null); }
      else setRemaining(left);
    }

    calc();
    const id = setInterval(calc, 1000);
    return () => clearInterval(id);
  }, []);

  if (remaining === null) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="bg-neutral-900 border border-neutral-700 rounded-2xl p-8 max-w-sm w-full mx-4 flex flex-col items-center gap-5 shadow-2xl">
        {/* Spinner */}
        <svg className="w-10 h-10 animate-spin text-yellow-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>

        <div className="flex flex-col items-center gap-2 text-center">
          <h2 className="text-lg font-bold text-white">Server Rebooting</h2>
          <p className="text-sm text-neutral-400">Please wait while the instance restarts. Do not close this page.</p>
        </div>

        {/* Countdown */}
        <div className="flex flex-col items-center gap-1">
          <span className="text-4xl font-mono font-bold text-yellow-400">{remaining}</span>
          <span className="text-xs text-neutral-500">seconds remaining</span>
        </div>

        {/* Progress bar */}
        <div className="w-full bg-neutral-800 rounded-full h-1.5">
          <div
            className="bg-yellow-400 h-1.5 rounded-full transition-all duration-1000"
            style={{ width: `${((WAIT_SECONDS - remaining) / WAIT_SECONDS) * 100}%` }}
          />
        </div>
      </div>
    </div>
  );
}
