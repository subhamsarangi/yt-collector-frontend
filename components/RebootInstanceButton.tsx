"use client";
import { useState } from "react";

export default function RebootInstanceButton() {
  const [step, setStep] = useState<"idle" | "confirm" | "loading" | "done" | "error">("idle");
  const [msg, setMsg] = useState("");

  async function handleConfirm() {
    setStep("loading");
    setMsg("");
    const res = await fetch("/api/admin/reboot-instance", { method: "POST" });
    const data = await res.json();
    if (res.ok) {
      setStep("done");
      setMsg("Reboot initiated. The OCI instance will restart in ~30 seconds.");
      setTimeout(() => setStep("idle"), 10000);
    } else {
      setStep("error");
      setMsg(data.error ?? "Reboot failed.");
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <h2 className="text-sm font-semibold text-neutral-400">OCI Instance</h2>
      <p className="text-xs text-neutral-500">
        Soft-reboot the OCI server. Use this if the backend becomes unresponsive.
        The instance will restart in ~30 seconds.
      </p>

      {step === "idle" && (
        <button
          onClick={() => setStep("confirm")}
          className="text-xs w-fit border border-neutral-700 text-neutral-400 hover:text-white hover:border-neutral-500 rounded px-3 py-1.5 transition"
        >
          ↺ Reboot instance
        </button>
      )}

      {step === "confirm" && (
        <div className="flex items-center gap-3">
          <span className="text-xs text-yellow-400">Reboot the OCI instance?</span>
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
  );
}
