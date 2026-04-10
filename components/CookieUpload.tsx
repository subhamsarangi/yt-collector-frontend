"use client";
import { useEffect, useRef, useState } from "react";

type CookieInfo = { exists: boolean; size?: number; modified?: string; email?: string | null };
type InfoState = "loading" | "ok" | "unreachable" | "no-file";

export default function CookieUpload() {
  const [infoState, setInfoState] = useState<InfoState>("loading");
  const [info, setInfo] = useState<CookieInfo | null>(null);
  const [uploadStatus, setUploadStatus] = useState<"idle" | "uploading" | "ok" | "error">("idle");
  const [msg, setMsg] = useState("");
  const [fileName, setFileName] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  async function loadInfo() {
    setInfoState("loading");
    try {
      const res = await fetch("/api/admin/cookies");
      if (!res.ok) { setInfoState("unreachable"); return; }
      const data: CookieInfo = await res.json();
      setInfo(data);
      setInfoState(data.exists ? "ok" : "no-file");
    } catch {
      setInfoState("unreachable");
    }
  }

  useEffect(() => { loadInfo(); }, []);

  function handleFileChange() {
    const file = fileRef.current?.files?.[0];
    setFileName(file?.name ?? "");
    if (uploadStatus !== "idle") { setUploadStatus("idle"); setMsg(""); }
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
    const err = validate(file);
    if (err) { setUploadStatus("error"); setMsg(err); return; }

    setUploadStatus("uploading");
    setMsg("");
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/admin/cookies", { method: "POST", body: formData });
      const data = await res.json();
      if (res.ok) {
        setUploadStatus("ok");
        setMsg(`✓ Uploaded ${data.bytes} bytes — cookies updated on OCI.`);
        setFileName("");
        if (fileRef.current) fileRef.current.value = "";
        await loadInfo();
        setTimeout(() => { setUploadStatus("idle"); setMsg(""); }, 6000);
      } else {
        setUploadStatus("error");
        setMsg(data.error ?? "Upload failed.");
      }
    } catch {
      setUploadStatus("error");
      setMsg("Network error — could not reach server.");
    }
  }

  // Upload is disabled until we know the OCI server is reachable
  const uploadDisabled = uploadStatus === "uploading" || infoState === "loading" || infoState === "unreachable";

  return (
    <div className="flex flex-col gap-3 border border-neutral-800 rounded-lg p-4">
      <h2 className="text-sm font-semibold text-neutral-300">YouTube Cookies</h2>

      {/* Status panel */}
      {infoState === "loading" && (
        <div className="text-xs text-neutral-500 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-neutral-600 animate-pulse flex-shrink-0" />
          Checking OCI server...
        </div>
      )}

      {infoState === "unreachable" && (
        <div className="text-xs rounded-lg px-3 py-2 bg-red-950 border border-red-800 flex flex-col gap-1">
          <div className="flex items-center gap-2 text-red-400">
            <span className="w-2 h-2 rounded-full bg-red-500 flex-shrink-0" />
            Cannot reach OCI server — upload is disabled until the server responds.
          </div>
          <button onClick={loadInfo} className="text-xs text-neutral-500 hover:text-neutral-300 transition w-fit mt-1">
            Retry
          </button>
        </div>
      )}

      {infoState === "no-file" && (
        <div className="text-xs rounded-lg px-3 py-2 bg-yellow-950 border border-yellow-800 flex items-center gap-2 text-yellow-400">
          <span className="w-2 h-2 rounded-full bg-yellow-500 flex-shrink-0" />
          No cookie file on OCI yet — yt-dlp will fail bot checks. Upload one below.
        </div>
      )}

      {infoState === "ok" && info && (
        <div className="text-xs rounded-lg px-3 py-2 bg-neutral-900 flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-green-500 flex-shrink-0" />
            <span className="text-neutral-300 font-medium">
              {info.email ?? "Cookie file present"}
            </span>
          </div>
          <div className="flex gap-4 text-neutral-500 pl-4">
            {info.size && <span>{info.size} bytes</span>}
            {info.modified && <span>Updated {new Date(info.modified).toLocaleString()}</span>}
          </div>
        </div>
      )}

      <p className="text-xs text-neutral-500">
        Upload a fresh <code className="text-neutral-400">cookies.txt</code> exported from your browser while logged into YouTube.
        Replaces the file on OCI used by yt-dlp.
      </p>

      <form onSubmit={handleSubmit} className="flex gap-2 items-center flex-wrap">
        <label className={`flex items-center gap-2 text-xs px-3 py-1.5 rounded border transition
          ${uploadDisabled ? "opacity-40 cursor-not-allowed border-neutral-800 text-neutral-600"
            : "cursor-pointer border-neutral-700 text-neutral-400 hover:border-neutral-500 hover:text-neutral-300"}`}>
          <span>{fileName || "Choose cookies.txt"}</span>
          <input
            ref={fileRef}
            type="file"
            accept=".txt,text/plain"
            required
            disabled={uploadDisabled}
            onChange={handleFileChange}
            className="hidden"
          />
        </label>

        <button
          type="submit"
          disabled={uploadDisabled || !fileName}
          className="bg-white text-black rounded px-4 py-1.5 text-sm font-medium hover:bg-neutral-200 disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap transition"
        >
          {uploadStatus === "uploading" ? "Uploading..." : "Upload"}
        </button>

        {uploadStatus === "error" && (
          <button type="button"
            onClick={() => { setUploadStatus("idle"); setMsg(""); setFileName(""); if (fileRef.current) fileRef.current.value = ""; }}
            className="text-xs text-neutral-500 hover:text-neutral-300 transition">
            Reset
          </button>
        )}
      </form>

      {msg && (
        <p className={`text-xs ${uploadStatus === "ok" ? "text-green-400" : "text-red-400"}`}>{msg}</p>
      )}
    </div>
  );
}
