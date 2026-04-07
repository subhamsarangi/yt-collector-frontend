import { supabaseAdmin } from "@/lib/supabase/server";
import { notFound } from "next/navigation";

export const revalidate = 60;

export default async function VideoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const { data: video } = await supabaseAdmin.from("videos").select("*").eq("id", id).single();
  if (!video) notFound();

  const meta = video.metadata ?? {};
  const lines = video.transcript?.split("\n") ?? [];

  return (
    <div className="flex flex-col gap-6">
      {video.thumbnail_r2_url && (
        <img src={video.thumbnail_r2_url} alt={video.title} className="w-full rounded-lg object-cover max-h-64" />
      )}

      <div className="flex items-start justify-between gap-4">
        <h1 className="text-lg font-bold leading-snug">{video.title}</h1>
        <a href={`${process.env.NEXT_PUBLIC_OCI_API_URL}/pdf/video/${id}`}
          className="text-sm text-neutral-400 hover:text-white border border-neutral-700 rounded px-3 py-1 whitespace-nowrap flex-shrink-0">
          Export PDF
        </a>
      </div>

      <div className="flex gap-4 text-sm text-neutral-400">
        {video.published_at && <span>{new Date(video.published_at).toLocaleDateString()}</span>}
        {meta.view_count && <span>{Number(meta.view_count).toLocaleString()} views</span>}
        {meta.like_count && <span>{Number(meta.like_count).toLocaleString()} likes</span>}
        {meta.duration && <span>{Math.floor(meta.duration / 60)}m {meta.duration % 60}s</span>}
      </div>

      {video.description && (
        <p className="text-sm text-neutral-400 whitespace-pre-line line-clamp-4">{video.description}</p>
      )}

      {lines.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-neutral-400 mb-3">Transcript</h2>
          <div className="flex flex-col gap-2">
            {lines.map((line: string, i: number) => {
              const match = line.match(/^\[(\d{2}:\d{2})\]\s*(.*)/);
              if (!match) return null;
              const [, ts, text] = match;
              return (
                <div key={i} id={`t-${i}`} className="flex gap-3 text-sm">
                  <span className="text-neutral-500 font-mono flex-shrink-0">{ts}</span>
                  <span>{text}</span>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {!video.transcript && (
        <p className="text-neutral-500 text-sm">Transcript not available yet.</p>
      )}
    </div>
  );
}
