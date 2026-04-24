"use client";
import { useState } from "react";
import { markRebootStarted } from "./RebootModal";

type HealthStatus = "unknown" | "checking" | "ok" | "down";

export default function RebootInstanceButton() {
  const [health, setHealth] = useState<HealthStatus>("unknown");
  const [step, setStep] = useState<"idle" | "confirm-soft" | "confirm-hard" | "loading" | "done" | "error">("idle");
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
    const action = step === "confirm-hard" ? "RESET" : "SOFTRESET";
    setStep("loading");
    setMsg("");
    const res = await fetch("/api/admin/reboot-instance", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    const data = await res.json();
    if (res.ok) {
      markRebootStarted();
      setStep("done");
      setHealth("unknown");
      setMsg(`${action === "RESET" ? "Hard" : "Soft"} reboot initiated.`);
      setTimeout(() => setStep("idle"), 10000);
    } else {
      setStep("error");
      setMsg(data.error ?? "Reboot failed.");
    }
  }

  return (
    <div className="flex flex-col gap-3">

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

      {/* Reboot — shown when health is ok or down (not before first check) */}
      {(health === "ok" || health === "down") && (
        <div className={`flex flex-col gap-2 pl-1 border-l-2 ${health === "down" ? "border-red-900" : "border-neutral-700"}`}>
          <p className="text-xs text-neutral-500">
            Soft reboot gracefully restarts. Hard reboot is a forced power cycle — use as last resort.
          </p>

          {step === "idle" && (
            <div className="flex gap-2">
              <button
                onClick={() => setStep("confirm-soft")}
                className="text-xs border border-neutral-700 text-neutral-400 hover:text-white hover:border-neutral-500 rounded px-3 py-1.5 transition"
              >
                ↺ Soft reboot
              </button>
              <button
                onClick={() => setStep("confirm-hard")}
                className="text-xs bg-red-950 border border-red-800 text-red-400 hover:bg-red-900 rounded px-3 py-1.5 transition"
              >
                ⚡ Hard reboot
              </button>
            </div>
          )}

          {(step === "confirm-soft" || step === "confirm-hard") && (
            <div className="flex items-center gap-3">
              <span className="text-xs text-yellow-400">
                {step === "confirm-hard" ? "Force power cycle the instance?" : "Gracefully restart the instance?"}
              </span>
              <button
                onClick={handleConfirm}
                className="text-xs bg-red-900 hover:bg-red-800 text-red-300 rounded px-3 py-1.5 transition"
              >
                Yes, {step === "confirm-hard" ? "hard reboot" : "soft reboot"}
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
