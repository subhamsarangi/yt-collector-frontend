"use client";
import { useState } from "react";

type HealthStatus = "unknown" | "checking" | "ok" | "down";

export default function RebootInstanceButton() {
  const [health, setHealth] = useState<HealthStatus>("unknown");
  const [step, setStep] = useState<"idle" | "confirm" | "loading" | "done" | "error">("idle");
  const [msg, setMsg] = useState("");

  async function checkHealth() {
    setHealth("checking");
    try {
      const res = await fetch("/api/admin/health-check", { method: "GET" });
      const data = await res.json();
      setHealth(data.ok ? "ok" : "down");
    } catch {
      setHealth("down");
    }
  }

  async function handleConfirm() {
    setStep("loading");
    setMsg("");
    const res = await fetch("/api/admin/reboot-instance", { method: "POST" });
    const data = await res.json();
    if (res.ok) {
      setStep("done");
      setHealth("unknown");
      setMsg("Reboot initiated. Instance will restart in ~30 seconds.");
      setTimeout(() => setStep("idle"), 10000);
    } else {
      setStep("error");
      setMsg(data.error ?? "Reboot failed.");
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <h2 className="text-sm font-semibold text-neutral-400">OCI Instance</h2>

      {/* Health check */}
      <div className="flex items-center gap-3">
        <button
          onClick={checkHealth}
          disabled={health === "checking"}
          className="text-xs border border-neutral-700 text-neutral-400 hover:text-white hover:border-neutral-500 rounded px-3 py-1.5 transition disabled:opacity-50"
        >
          {health === "checking" ? "Checking..." : "Check health"}
        </button>

        {health === "ok" && (
          <span className="flex items-center gap-1.5 text-xs text-green-400">
            <span className="w-2 h-2 rounded-full bg-green-500" />
            Backend is healthy
          </span>
        )}
        {health === "down" && (
          <span className="flex items-center gap-1.5 text-xs text-red-400">
            <span className="w-2 h-2 rounded-full bg-red-500" />
            Backend is unreachable
          </span>
        )}
      </div>

      {/* Reboot — only shown when health check failed */}
      {health === "down" && (
        <div className="flex flex-col gap-2 pl-1 border-l-2 border-red-900">
          <p className="text-xs text-neutral-500">
            Soft-reboot the OCI server. The instance will restart in ~30 seconds.
          </p>

          {step === "idle" && (
            <button
              onClick={() => setStep("confirm")}
              className="text-xs w-fit bg-red-950 border border-red-800 text-red-400 hover:bg-red-900 rounded px-3 py-1.5 transition"
            >
              ↺ Reboot instance
            </button>
          )}

          {step === "confirm" && (
            <div className="flex items-center gap-3">
              <span className="text-xs text-yellow-400">Are you sure?</span>
              <button
                onClick={handleConfirm}
                className="text-xs bg-red-900 hover:bg-red-800 text-red-300 rounded px-3 py-1.5 transition"
              >
                Yes, reboot
              </button>
              <button
                onClick={() => setStep("idle")}
                className="text-xs text-neutral-500 hover:text-neutral-300 transition"
              >
                Cancel
              </button>
            </div>
          )}

          {step === "loading" && (
            <span className="text-xs text-yellow-400">Sending reboot command...</span>
          )}

          {step === "done" && (
            <span className="text-xs text-green-400">{msg}</span>
          )}

          {step === "error" && (
            <div className="flex items-center gap-3">
              <span className="text-xs text-red-400">{msg}</span>
              <button onClick={() => setStep("idle")} className="text-xs text-neutral-500 hover:text-neutral-300">
                Dismiss
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
