"use client";
import { useRef, useState } from "react";

export default function CookieUpload() {
  const [status, setStatus] = useState<"idle" | "uploading" | "ok" | "error">("idle");
  const [msg, setMsg] = useState("");
  const [fileName, setFileName] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  function handleFileChange() {
    const file = fileRef.current?.files?.[0];
    setFileName(file?.name ?? "");
    // Reset status when a new file is picked
    if (status !== "idle") { setStatus("idle"); setMsg(""); }
  }

  function validate(file: File): string | null {
    if (file.size < 500) return "File is too small — likely empty or invalid.";
    if (file.size > 500 * 1024) return "File is too large for a cookies.txt.";
    return null;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const file = fileRef.current?.files?.[0];
    if (!file) return;

    const validationError = validate(file);
    if (validationError) { setStatus("error"); setMsg(validationError); return; }

    setStatus("uploading");
    setMsg("");

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/admin/cookies", { method: "POST", body: formData });
      const data = await res.json();

      if (res.ok) {
        setStatus("ok");
        setMsg(`✓ Uploaded ${data.bytes} bytes — cookies updated on OCI.`);
        setFileName("");
        if (fileRef.current) fileRef.current.value = "";
        // Auto-clear success after 6s
        setTimeout(() => { setStatus("idle"); setMsg(""); }, 6000);
      } else {
        setStatus("error");
        setMsg(data.error ?? "Upload failed.");
      }
    } catch {
      setStatus("error");
      setMsg("Network error — could not reach server.");
    }
  }

  function handleReset() {
    setStatus("idle");
    setMsg("");
    setFileName("");
    if (fileRef.current) fileRef.current.value = "";
  }

  return (
    <div className="flex flex-col gap-3 border border-neutral-800 rounded-lg p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-neutral-300">YouTube Cookies</h2>
        {status === "ok" && (
          <span className="text-xs text-green-400">Updated</span>
        )}
      </div>

      <p className="text-xs text-neutral-500">
        Upload a fresh <code className="text-neutral-400">cookies.txt</code> exported from your browser while logged into YouTube.
        Replaces the file on OCI used by yt-dlp. File must be at least 500 bytes.
      </p>

      <form onSubmit={handleSubmit} className="flex gap-2 items-center flex-wrap">
        <label className={`flex items-center gap-2 text-xs px-3 py-1.5 rounded border cursor-pointer transition
          ${status === "uploading" ? "opacity-50 cursor-not-allowed border-neutral-700 text-neutral-600" : "border-neutral-700 text-neutral-400 hover:border-neutral-500 hover:text-neutral-300"}`}>
          <span>{fileName || "Choose cookies.txt"}</span>
          <input
            ref={fileRef}
            type="file"
            accept=".txt,text/plain"
            required
            disabled={status === "uploading"}
            onChange={handleFileChange}
            className="hidden"
          />
        </label>

        <button
          type="submit"
          disabled={status === "uploading" || !fileName}
          className="bg-white text-black rounded px-4 py-1.5 text-sm font-medium hover:bg-neutral-200 disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap transition"
        >
          {status === "uploading" ? "Uploading..." : "Upload"}
        </button>

        {(status === "error") && (
          <button type="button" onClick={handleReset}
            className="text-xs text-neutral-500 hover:text-neutral-300 transition">
            Reset
          </button>
        )}
      </form>

      {msg && (
        <p className={`text-xs ${status === "ok" ? "text-green-400" : "text-red-400"}`}>
          {msg}
        </p>
      )}
    </div>
  );
}
