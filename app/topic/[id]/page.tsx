import { supabaseAdmin } from "@/lib/supabase/server";
import VideoCard from "@/components/VideoCard";
import DeleteTopicButton from "@/components/DeleteTopicButton";
import { notFound } from "next/navigation";

export const revalidate = 10;

const STATUS_LABEL: Record<string, string> = {
  pending:             "Waiting in queue",
  yt_dlp_processing:   "Downloading...",
  yt_dlp_done:         "Download done, waiting for transcription",
  whisper_processing:  "Transcribing...",
  whisper_done:        "Transcription done",
  complete:            "Complete",
  error_ytdlp:         "Download failed",
  error_whisper:       "Transcription failed",
};

const STATUS_COLOR: Record<string, string> = {
  pending:             "text-neutral-500",
  yt_dlp_processing:   "text-yellow-400",
  yt_dlp_done:         "text-blue-400",
  whisper_processing:  "text-yellow-400",
  whisper_done:        "text-blue-400",
  complete:            "text-green-400",
  error_ytdlp:         "text-red-400",
  error_whisper:       "text-red-400",
};

export default async function TopicPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const { data: topic } = await supabaseAdmin.from("topics").select("*").eq("id", id).single();
  if (!topic) notFound();

  const { data: videos } = await supabaseAdmin
    .from("videos")
    .select("id, youtube_id, title, thumbnail_r2_url, published_at")
    .eq("topic_id", id)
    .order("published_at", { ascending: false });

  // Queue items for this topic that aren't complete yet
  const { data: queueItems } = await supabaseAdmin
    .from("queue")
    .select("id, youtube_id, status, retries, whisper_retries, last_error")
    .eq("source_id", id)
    .neq("status", "complete")
    .order("created_at", { ascending: true });

  const hasActivity = (videos?.length ?? 0) > 0 || (queueItems?.length ?? 0) > 0;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">{topic.name}</h1>
        <div className="flex items-center gap-3">
          {(videos?.length ?? 0) > 0 && (
            <a href={`${process.env.NEXT_PUBLIC_OCI_API_URL}/pdf/topic/${id}`}
              className="text-sm text-neutral-400 hover:text-white border border-neutral-700 rounded px-3 py-1">
              Export PDF
            </a>
          )}
          <DeleteTopicButton id={id} redirect={true} />
        </div>
      </div>

      {/* In-progress queue items */}
      {(queueItems?.length ?? 0) > 0 && (
        <div className="flex flex-col gap-2">
          <p className="text-xs text-neutral-500 uppercase tracking-wider">Processing</p>
          {queueItems?.map((item) => (
            <div key={item.id} className="flex items-center justify-between bg-neutral-900 rounded-lg px-4 py-3">
              <span className="text-xs text-neutral-400 font-mono">{item.youtube_id}</span>
              <span className={`text-xs ${STATUS_COLOR[item.status] ?? "text-neutral-400"}`}>
                {STATUS_LABEL[item.status] ?? item.status}
              </span>
              {item.last_error && (
                <span className="text-xs text-red-400 truncate max-w-xs ml-2" title={item.last_error}>
                  {item.last_error}
                </span>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Completed videos */}
      {(videos?.length ?? 0) > 0 && (
        <div className="flex flex-col gap-3">
          {videos?.map((v) => <VideoCard key={v.id} {...v} />)}
        </div>
      )}

      {!hasActivity && (
        <p className="text-neutral-500 text-sm">No videos found for this topic.</p>
      )}
    </div>
  );
}
