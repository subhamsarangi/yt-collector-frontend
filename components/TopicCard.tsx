"use client";
import { useState } from "react";
import Link from "next/link";

type Props = {
  id: string;
  name: string;
  thumb: string | null;
  count: number;
};

export default function TopicCard({ id, name, thumb, count }: Props) {
  const [loading, setLoading] = useState(false);

  return (
    <div className="relative group">
      <Link
        href={`/topic/${id}`}
        onClick={() => !loading && setLoading(true)}
        className="block"
      >
        <div className="relative rounded-xl overflow-hidden aspect-square bg-neutral-900 border border-white/10 shadow-lg shadow-black/40">
          {/* Thumbnail */}
          {thumb ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={thumb}
              alt={name}
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
          ) : (
            <div className="w-full h-full bg-neutral-800" />
          )}

          {/* Gradient overlay */}
          <div
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(to top, rgba(0,0,0,0.97) 0%, rgba(0,0,0,0.6) 50%, rgba(0,0,0,0.1) 100%)",
            }}
          />

          {/* Topic name + count */}
          <div className="absolute bottom-0 left-0 right-0 p-4">
            <p
              className="topic-card-name text-white font-semibold leading-snug"
              // eslint-disable-next-line react/no-danger
              {...{} as object}
              style={{
                fontSize: `${
                  name.length < 15
                    ? 3.5
                    : name.length < 25
                    ? 3
                    : name.length < 40
                    ? 2.5
                    : name.length < 60
                    ? 2
                    : 1.6
                }rem`,
                display: "-webkit-box",
                WebkitLineClamp: 3,
                WebkitBoxOrient: "vertical",
                overflow: "hidden",
                lineHeight: 1.2,
              }}
            >
              {name}
            </p>
            <p className="text-neutral-400 text-xs mt-1">
              {count} video{count !== 1 ? "s" : ""}
            </p>
          </div>

          {/* Loading overlay */}
          {loading && (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
              <svg
                className="w-8 h-8 animate-spin text-white"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
            </div>
          )}
        </div>
      </Link>
    </div>
  );
}
