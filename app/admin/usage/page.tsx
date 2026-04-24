import { supabaseAdmin } from "@/lib/supabase/server";
import { getUserRole } from "@/lib/supabase/userRole";
import { redirect } from "next/navigation";
import Link from "next/link";
import UsageThresholds from "@/components/UsageThresholds";
import UsageCard from "@/components/UsageCard";

export const revalidate = 0;

export const metadata = { title: "API Usage" };

// ── Default thresholds (can be overridden via settings) ──────────────────────
const DEFAULT_THRESHOLDS: Record<string, { hourly: number; daily: number }> = {
  ytdlp_channel_scan: { hourly: 10,  daily: 50  },
  ytdlp_topic_search: { hourly: 5,   daily: 20  },
  ytdlp_metadata:     { hourly: 20,  daily: 100 },
  ytdlp_audio:        { hourly: 10,  daily: 50  },
  groq_whisper:       { hourly: 10,  daily: 50  },
  groq_llama:         { hourly: 20,  daily: 100 },
  groq_qwen:          { hourly: 10,  daily: 30  },
};

const EVENT_LABELS: Record<string, { label: string; icon: string; group: string }> = {
  ytdlp_channel_scan: { label: "Channel scans",      icon: "📺", group: "yt-dlp" },
  ytdlp_topic_search: { label: "Topic searches",     icon: "🔍", group: "yt-dlp" },
  ytdlp_metadata:     { label: "Metadata fetches",   icon: "📋", group: "yt-dlp" },
  ytdlp_audio:        { label: "Audio downloads",    icon: "🎵", group: "yt-dlp" },
  groq_whisper:       { label: "Whisper (STT)",       icon: "🎙️", group: "Groq" },
  groq_llama:         { label: "Llama (summarize)",  icon: "✍️", group: "Groq" },
  groq_qwen:          { label: "Qwen (search AI)",   icon: "🤖", group: "Groq" },
};

type UsageRow = { event: string; created_at: string; meta: Record<string, unknown> };

function countByEvent(rows: UsageRow[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const row of rows) {
    counts[row.event] = (counts[row.event] ?? 0) + 1;
  }
  return counts;
}

export default async function UsagePage() {
  const role = await getUserRole();
  if (role !== "owner") redirect("/admin");

  const now = new Date();
  const since24h = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
  const since1h  = new Date(now.getTime() - 60 * 60 * 1000).toISOString();

  const [{ data: rows24h }, { data: rows1h }, { data: thresholdRows }] = await Promise.all([
    supabaseAdmin.from("usage_logs").select("event, created_at, meta").gte("created_at", since24h).order("created_at", { ascending: false }),
    supabaseAdmin.from("usage_logs").select("event, created_at, meta").gte("created_at", since1h).order("created_at", { ascending: false }),
    supabaseAdmin.from("settings").select("key, value").like("key", "threshold_%"),
  ]);

  // Merge DB thresholds over defaults
  const thresholds = { ...DEFAULT_THRESHOLDS };
  for (const row of thresholdRows ?? []) {
    const key = row.key.replace("threshold_", "");
    if (thresholds[key]) {
      thresholds[key] = row.value as { hourly: number; daily: number };
    }
  }

  const counts24h = countByEvent((rows24h ?? []) as UsageRow[]);
  const counts1h  = countByEvent((rows1h  ?? []) as UsageRow[]);

  const events = Object.keys(EVENT_LABELS);
  const ytdlpEvents = events.filter(e => EVENT_LABELS[e].group === "yt-dlp");
  const groqEvents  = events.filter(e => EVENT_LABELS[e].group === "Groq");

  // Build hourly breakdown (last 24 buckets)
  const hourlyBuckets: Record<string, number[]> = {};
  for (const event of events) hourlyBuckets[event] = new Array(24).fill(0);
  for (const row of (rows24h ?? []) as UsageRow[]) {
    const hoursAgo = Math.floor((now.getTime() - new Date(row.created_at).getTime()) / (60 * 60 * 1000));
    if (hoursAgo < 24 && hourlyBuckets[row.event]) {
      hourlyBuckets[row.event][23 - hoursAgo]++;
    }
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center gap-3">
        <Link href="/admin" className="text-neutral-500 hover:text-white text-sm transition">← Admin</Link>
        <h1 className="text-xl font-bold">API Usage</h1>
      </div>

      <p className="text-sm text-neutral-500">
        Hourly and daily call counts for yt-dlp and Groq. Amber = approaching threshold, red = over threshold.
      </p>

      {/* yt-dlp section */}
      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-bold text-neutral-300">yt-dlp</h2>
        <div className="grid grid-cols-1 md:grid-cols-1 lg:grid-cols-2 gap-4">
          {ytdlpEvents.map(event => (
            <UsageCard
              key={event}
              event={event}
              label={EVENT_LABELS[event].label}
              icon={EVENT_LABELS[event].icon}
              count1h={counts1h[event] ?? 0}
              count24h={counts24h[event] ?? 0}
              threshold={thresholds[event]}
              hourlyBuckets={hourlyBuckets[event]}
            />
          ))}
        </div>
      </section>

      {/* Groq section */}
      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-bold text-neutral-300">Groq</h2>
        <div className="grid grid-cols-1 md:grid-cols-1 lg:grid-cols-2 gap-4">
          {groqEvents.map(event => (
            <UsageCard
              key={event}
              event={event}
              label={EVENT_LABELS[event].label}
              icon={EVENT_LABELS[event].icon}
              count1h={counts1h[event] ?? 0}
              count24h={counts24h[event] ?? 0}
              threshold={thresholds[event]}
              hourlyBuckets={hourlyBuckets[event]}
            />
          ))}
        </div>
      </section>

      {/* Threshold editor */}
      <section className="flex flex-col gap-3 max-w-3xl mx-auto w-full">
        <h2 className="text-lg font-bold text-neutral-300">Thresholds</h2>
        <UsageThresholds
          events={events}
          labels={Object.fromEntries(events.map(e => [e, EVENT_LABELS[e].label]))}
          initial={thresholds}
        />
      </section>

      <p className="text-xs text-neutral-600">
        Last updated: {now.toLocaleTimeString()} · Data retained for 30 days
      </p>
    </div>
  );
}
