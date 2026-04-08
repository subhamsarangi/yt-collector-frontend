"use client";
import { useState } from "react";

type Props = { href: string; filename: string };

export default function ExportPdfButton({ href, filename }: Props) {
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState("");

  async function handleClick() {
    setLoading(true);
    setToast("");
    try {
      const res = await fetch(href);
      if (!res.ok) throw new Error(`Server error ${res.status}`);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "PDF generation failed";
      setToast(msg);
      setTimeout(() => setToast(""), 4000);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <button
        onClick={handleClick}
        disabled={loading}
        className="text-sm text-neutral-400 hover:text-white border border-neutral-700 rounded px-3 py-1 disabled:opacity-50 transition whitespace-nowrap"
      >
        {loading ? "Generating..." : "Export PDF"}
      </button>

      {toast && (
        <div className="fixed bottom-20 md:bottom-6 left-1/2 -translate-x-1/2 bg-red-900 text-red-200 text-sm px-4 py-2 rounded-lg shadow-lg z-50 animate-pulse">
          {toast}
        </div>
      )}
    </>
  );
}
