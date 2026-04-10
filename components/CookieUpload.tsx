"use client";
import { useEffect, useRef, useState } from "react";

type CookieInfo = {
  exists: boolean;
  size?: number;
  modified?: string;
  email?: string | null;
};

export default function CookieUpload() {
  const [status, setStatus] = useState<"idle" | "uploading" | "ok" | "error">("idle");
  const [msg, setMsg] = useState("");
  const [fileName, setFileName] = useState("");
  const [info, setInfo] = useState<CookieInfo | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function loadInfo() {
    try {
      const res = await fetch("/api/admin/cookies");
      if (res.ok) setInfo(await res.json());
    } catch { /* non-fatal */ }
  }

  useEffect(() => { loadInfo(); }, []);

  function handleFileChange() {
    const file = fileRef.current?.files?.[0];
    setFileName(file?.name ?? "");
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
        await loadInfo(); // refresh the info panel
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
    setStatus("idle"); setMsg(""); setFileName("");
    if (fileRef.current) fileRef.current.value = "";
  }

  return (
    <div className="flex flex-col gap-3 border border-neutral-800 rounded-lg p-4">
      <h2 className="text-sm font-semibold text-neutral-300">YouTube Cookies</h2>

      {/* Current cookie status */}
      {info && (
        <div className={`text-xs rounded-lg px-3 py-2 flex flex-col gap-1 ${info.exists ? "bg-neutral-900" : "bg-red-950 border border-red-800"}`}>
          {info.exists ? (
            <>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-green-500 flex-shrink-0" />
                <span className="text-neutral-300 font-medium">
                  {info.email ? info.email : "Cookie file present"}
                </span>
              </div>
              <div className="flex gap-4 text-neutral-500 pl-4">
                <span>{info.size ? `${info.size} bytes` : ""}</span>
                {info.modified && (
                  <span>Updated {new Date(info.modified).toLocaleString()}</span>
                )}
              </div>
            </>
          ) : (
            <div className="flex items-center gap-2 text-red-400">
              <span className="w-2 h-2 rounded-full bg-red-500 flex-shrink-0" />
              <span>No cookie file found on OCI — yt-dlp will fail bot checks.</span>
            </div>
          )}
        </div>
      )}

      <p className="text-xs text-neutral-500">
        Upload a fresh <code className="text-neutral-400">cookies.txt</code> exported from your browser while logged into YouTube.
        Replaces the file on OCI used by yt-dlp.
      </p>

      <form onSubmit={handleSubmit} className="flex gap-2 items-center flex-wrap">
        <label className={`flex items-center gap-2 text-xs px-3 py-1.5 rounded border cursor-pointer transition
          ${status === "uploading" ? "opacity-50 cursor-not-allowed border-neutral-700 text-neutral-600"
            : "border-neutral-700 text-neutral-400 hover:border-neutral-500 hover:text-neutral-300"}`}>
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

        {status === "error" && (
          <button type="button" onClick={handleReset}
            className="text-xs text-neutral-500 hover:text-neutral-300 transition">
            Reset
          </button>
        )}
      </form>

      {msg && (
        <p className={`text-xs ${status === "ok" ? "text-green-400" : "text-red-400"}`}>{msg}</p>
      )}
    </div>
  );
}
