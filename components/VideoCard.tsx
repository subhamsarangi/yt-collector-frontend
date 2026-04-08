import Link from "next/link";

type Props = {
  id: string;
  youtube_id: string;
  title: string;
  thumbnail_r2_url: string | null;
  published_at: string | null;
  snippet?: string;
  compact?: boolean;
  channel_name?: string | null;
  channel_url?: string | null;
};

export default function VideoCard({ id, title, thumbnail_r2_url, published_at, snippet, compact, channel_name, channel_url }: Props) {
  const dateStr = published_at
    ? new Date(published_at).toLocaleString(undefined, {
        year: "numeric", month: "short", day: "numeric",
        hour: "2-digit", minute: "2-digit",
      })
    : null;

  if (compact) {
    return (
      <Link href={`/video/${id}`} className="flex gap-3 px-4 py-2 hover:bg-neutral-800 transition">
        {thumbnail_r2_url && (
          <img src={thumbnail_r2_url} alt={title} className="w-16 h-10 object-cover rounded flex-shrink-0" />
        )}
        <p className="text-xs line-clamp-2 self-center">{title}</p>
      </Link>
    );
  }

  return (
    <Link href={`/video/${id}`}
      className="flex gap-3 bg-neutral-900 rounded-lg p-3 hover:bg-neutral-800 transition">
      {thumbnail_r2_url && (
        <img src={thumbnail_r2_url} alt={title} className="w-32 h-20 object-cover rounded flex-shrink-0" />
      )}
      <div className="flex flex-col gap-1 min-w-0">
        <p className="font-medium text-sm line-clamp-2">{title}</p>
        <div className="flex flex-wrap gap-2 text-xs text-neutral-500">
          {channel_name && <span>📺 {channel_name}</span>}
          {dateStr && <span>🗓 {dateStr}</span>}
        </div>
        {snippet && <p className="text-xs text-neutral-400 line-clamp-2 mt-1">{snippet}</p>}
      </div>
    </Link>
  );
}
