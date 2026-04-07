import Link from "next/link";

type Props = {
  id: string;
  youtube_id: string;
  title: string;
  thumbnail_r2_url: string | null;
  published_at: string | null;
  snippet?: string; // highlighted transcript snippet
};

export default function VideoCard({ id, title, thumbnail_r2_url, published_at, snippet }: Props) {
  return (
    <Link href={`/video/${id}`} className="flex gap-3 bg-neutral-900 rounded-lg p-3 hover:bg-neutral-800 transition">
      {thumbnail_r2_url && (
        <img src={thumbnail_r2_url} alt={title} className="w-32 h-20 object-cover rounded flex-shrink-0" />
      )}
      <div className="flex flex-col gap-1 min-w-0">
        <p className="font-medium text-sm line-clamp-2">{title}</p>
        {published_at && (
          <p className="text-xs text-neutral-500">{new Date(published_at).toLocaleDateString()}</p>
        )}
        {snippet && <p className="text-xs text-neutral-400 line-clamp-2 mt-1">{snippet}</p>}
      </div>
    </Link>
  );
}
