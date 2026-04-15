import { supabaseAdmin } from "@/lib/supabase/server";
import { getUserRole } from "@/lib/supabase/userRole";
import { redirect } from "next/navigation";
import Link from "next/link";
import UsageThresholds from "@/components/UsageThresholds";

export const revalidate = 0;

export const metadata = { title: "API Usage" };

// ── Default thresholds (can be overridden via settings) ──────────────────────
const DEFAULT_THRESHOLDS: Record<string, { hourly: number; daily: number }> = {
  ytdlp_channel_scan: { hourly: 10,  daily: 50  },
  ytdlp_topic_search: { hourly: 5,   daily: 20  },
  ytdlp_metadata:     { hourly: 20,  daily: 100 },
  ytdlp_audio:        { hourly: 10,  daily: 50  },
  groq_whisper:       { hourly: 10,  daily: 50  },
  groq_kimi:          { hourly: 20,  daily: 100 },
  groq_qwen:          { hourly: 10,  daily: 30  },
};

const EVENT_LABELS: Record<string, { label: string; icon: string; group: string }> = {
  ytdlp_channel_scan: { label: "Channel scans",      icon: "📺", group: "yt-dlp" },
  ytdlp_topic_search: { label: "Topic searches",     icon: "🔍", group: "yt-dlp" },
  ytdlp_metadata:     { label: "Metadata fetches",   icon: "📋", group: "yt-dlp" },
  ytdlp_audio:        { label: "Audio downloads",    icon: "🎵", group: "yt-dlp" },
  groq_whisper:       { label: "Whisper (STT)",       icon: "🎙️", group: "Groq" },
  groq_kimi:          { label: "Kimi (summarize)",   icon: "✍️", group: "Groq" },
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
    <div className="flex flex-col gap-8 max-w-3xl">
      <div className="flex items-center gap-3">
        <Link href="/admin" className="text-neutral-500 hover:text-white text-sm transition">← Admin</Link>
        <h1 className="text-xl font-bold">API Usage</h1>
      </div>

      <p className="text-sm text-neutral-500">
        Hourly and daily call counts for yt-dlp and Groq. Amber = approaching threshold, red = over threshold.
      </p>

      {/* yt-dlp section */}
      <section className="flex flex-col gap-3">
        <h2 className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">yt-dlp</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
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
        <h2 className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">Groq</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
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
      <section className="flex flex-col gap-3">
        <h2 className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">Thresholds</h2>
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

// ── Inline server component for each row ─────────────────────────────────────
function UsageCard({
  event,
  label,
  icon,
  count1h,
  count24h,
  threshold,
  hourlyBuckets,
}: {
  event: string;
  label: string;
  icon: string;
  count1h: number;
  count24h: number;
  threshold: { hourly: number; daily: number };
  hourlyBuckets: number[];
}) {
  const hourlyPct  = Math.min(100, Math.round((count1h  / threshold.hourly) * 100));
  const dailyPct   = Math.min(100, Math.round((count24h / threshold.daily)  * 100));

  const barColor = (pct: number) =>
    pct >= 100 ? "bg-red-500" : pct >= 70 ? "bg-amber-400" : "bg-green-500";

  const textColor = (pct: number) =>
    pct >= 100 ? "text-red-400" : pct >= 70 ? "text-amber-400" : "text-neutral-300";

  const maxBucket = Math.max(...hourlyBuckets, 1);

  return (
    <div className="bg-neutral-900 rounded-lg p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium flex items-center gap-2">
          <span>{icon}</span> {label}
        </span>
        <span className="text-xs text-neutral-600 font-mono">{event}</span>
      </div>

      {/* Meters */}
      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1">
          <div className="flex justify-between text-xs">
            <span className="text-neutral-500">Last hour</span>
            <span className={`font-mono font-semibold ${textColor(hourlyPct)}`}>
              {count1h} / {threshold.hourly}
            </span>
          </div>
          <div className="h-1.5 bg-neutral-800 rounded-full overflow-hidden">
            <div className={`h-full rounded-full transition-all ${barColor(hourlyPct)}`} style={{ width: `${hourlyPct}%` }} />
          </div>
        </div>
        <div className="flex flex-col gap-1">
          <div className="flex justify-between text-xs">
            <span className="text-neutral-500">Last 24h</span>
            <span className={`font-mono font-semibold ${textColor(dailyPct)}`}>
              {count24h} / {threshold.daily}
            </span>
          </div>
          <div className="h-1.5 bg-neutral-800 rounded-full overflow-hidden">
            <div className={`h-full rounded-full transition-all ${barColor(dailyPct)}`} style={{ width: `${dailyPct}%` }} />
          </div>
        </div>
      </div>

      {/* Sparkline — 24 hourly buckets */}
      <div className="flex items-end gap-px h-8" title="Calls per hour over last 24h">
        {hourlyBuckets.map((val, i) => (
          <div
            key={i}
            className="flex-1 bg-neutral-700 rounded-sm"
            style={{ height: `${Math.max(2, Math.round((val / maxBucket) * 100))}%` }}
            title={`${val} calls`}
          />
        ))}
      </div>
      <p className="text-xs text-neutral-600 -mt-1">← 24h ago · now →</p>
    </div>
  );
}
