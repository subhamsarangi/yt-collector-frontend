"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

type Props = {
  channelId: string;
};

export default function ScanChannelButton({ channelId }: Props) {
  const [state, setState] = useState<"idle" | "loading">("idle");
  const [toast, setToast] = useState("");
  const [toastType, setToastType] = useState<"success" | "error" | "info">("info");
  const router = useRouter();

  function showToast(msg: string, type: "success" | "error" | "info") {
    setToast(msg);
    setToastType(type);
    setTimeout(() => setToast(""), 4000);
  }

  async function handleScan() {
    setState("loading");

    const res = await fetch(`/api/channels/${channelId}/scan`, { method: "POST" });
    const data = await res.json();
    setState("idle");

    if (res.ok) {
      if (data.queued > 0) {
        showToast(`${data.queued} new video${data.queued !== 1 ? "s" : ""} queued`, "success");
        router.refresh();
      } else {
        showToast("No new videos found", "info");
      }
    } else {
      showToast(data.error ?? "Scan failed.", "error");
    }
  }

  return (
    <>
      <button
        onClick={handleScan}
        disabled={state === "loading"}
        className="flex items-center gap-2 text-sm bg-neutral-800 hover:bg-neutral-700 text-neutral-200 rounded-lg px-4 py-2.5 transition disabled:opacity-50 w-fit"
      >
        {state === "loading" ? (
          <>
            <svg className="w-3.5 h-3.5 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            Scanning...
          </>
        ) : (
          <>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
              <path fillRule="evenodd" d="M15.312 11.424a5.5 5.5 0 0 1-9.201 2.466l-.312-.311h2.433a.75.75 0 0 0 0-1.5H3.989a.75.75 0 0 0-.75.75v4.242a.75.75 0 0 0 1.5 0v-2.43l.31.31a7 7 0 0 0 11.712-3.138.75.75 0 0 0-1.449-.39Zm1.23-3.723a.75.75 0 0 0 .219-.53V2.929a.75.75 0 0 0-1.5 0V5.36l-.31-.31A7 7 0 0 0 3.239 8.188a.75.75 0 1 0 1.448.389A5.5 5.5 0 0 1 13.89 6.11l.311.31h-2.432a.75.75 0 0 0 0 1.5h4.243a.75.75 0 0 0 .53-.219Z" clipRule="evenodd" />
            </svg>
            Scan channel
          </>
        )}
      </button>

      {toast && (
        <div className={`fixed bottom-20 md:bottom-6 left-1/2 -translate-x-1/2 text-sm px-4 py-2 rounded-lg shadow-lg z-50 transition-opacity ${
          toastType === "error"
            ? "bg-red-900 text-red-200"
            : toastType === "success"
            ? "bg-green-900 text-green-200"
            : "bg-neutral-800 text-neutral-200"
        }`}>
          {toast}
        </div>
      )}
    </>
  );
}
