import { Metadata } from "next";
import AddVideoForm from "@/components/AddVideoForm";

export const metadata: Metadata = { title: "Add Video" };

export default function AddVideoPage() {
  return (
    <div className="flex flex-col gap-6 max-w-lg mx-auto">
      <h1 className="text-xl font-bold">Add Video</h1>
      <p className="text-sm text-neutral-400">Paste a YouTube URL or Shorts link to fetch, transcribe and index it.</p>
      <AddVideoForm />
    </div>
  );
}
