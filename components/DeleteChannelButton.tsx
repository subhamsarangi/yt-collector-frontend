"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

export default function DeleteChannelButton({
  id,
  redirect,
}: {
  id: string;
  redirect?: string;
}) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const router = useRouter();

  useEffect(() => {
    const el = dialogRef.current;
    if (!el) return;
    if (open) el.showModal();
    else el.close();
  }, [open]);

  function handleBackdropClick(e: React.MouseEvent<HTMLDialogElement>) {
    if (e.target === dialogRef.current) setOpen(false);
  }

  async function handleDelete() {
    setLoading(true);
    await fetch(`/api/channels/${id}/delete`, { method: "POST" });
    setLoading(false);
    setOpen(false);
    if (redirect) router.push(redirect);
    else router.refresh();
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 text-sm text-red-500 hover:text-red-400 transition w-fit cursor-pointer"
      >
        <span>🗑️</span>
        <span>Remove this channel</span>
      </button>
      <p className="text-xs text-neutral-600">
        Removes the channel from tracking. Existing videos are not deleted.
      </p>

      <dialog
        ref={dialogRef}
        onClick={handleBackdropClick}
        className="bg-neutral-900 text-neutral-100 rounded-xl p-0 w-full max-w-sm shadow-2xl border border-neutral-800 backdrop:bg-black/60 fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
      >
        <div className="flex flex-col gap-4 p-6">
          <div className="flex flex-col gap-1">
            <h2 className="font-semibold text-base">Remove channel?</h2>
            <p className="text-sm text-neutral-400">
              This channel will stop being tracked. Videos already collected are not affected.
            </p>
          </div>
          <div className="flex justify-end gap-2">
            <button
              onClick={() => setOpen(false)}
              disabled={loading}
              className="text-sm text-neutral-500 hover:text-white px-3 py-1.5 transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={handleDelete}
              disabled={loading}
              className="text-sm bg-red-600 hover:bg-red-500 text-white rounded px-4 py-1.5 font-medium transition disabled:opacity-50 cursor-pointer"
            >
              {loading ? "Removing..." : "Yes, remove"}
            </button>
          </div>
        </div>
      </dialog>
    </>
  );
}
