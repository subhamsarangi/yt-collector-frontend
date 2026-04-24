"use client";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
} from "recharts";

type Props = {
  event: string;
  label: string;
  icon: string;
  count1h: number;
  count24h: number;
  threshold: { hourly: number; daily: number };
  hourlyBuckets: number[];
};

function barColor(pct: number) {
  return pct >= 100 ? "#ef4444" : pct >= 70 ? "#f59e0b" : "#22c55e";
}

function textColor(pct: number) {
  return pct >= 100 ? "text-red-400" : pct >= 70 ? "text-amber-400" : "text-neutral-300";
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-neutral-800 border border-neutral-700 rounded px-2 py-1 text-xs text-neutral-200">
      <p className="text-neutral-400">{label}</p>
      <p className="font-mono font-semibold">{payload[0].value} calls</p>
    </div>
  );
};

export default function UsageCard({
  event,
  label,
  icon,
  count1h,
  count24h,
  threshold,
  hourlyBuckets,
}: Props) {
  const hourlyPct = Math.min(100, Math.round((count1h / threshold.hourly) * 100));
  const dailyPct  = Math.min(100, Math.round((count24h / threshold.daily) * 100));

  // Build chart data — 24 hourly buckets, oldest first
  const chartData = hourlyBuckets.map((val, i) => ({
    hour: i === 23 ? "now" : `${23 - i}h ago`,
    calls: val,
  }));

  const maxVal = Math.max(...hourlyBuckets, 1);
  const areaColor = barColor(dailyPct);

  return (
    <div className="bg-neutral-900 rounded-lg p-6 flex flex-col gap-4">
      {/* Title */}
      <div className="flex items-center justify-between">
        <span className="text-base font-medium flex items-center gap-2">
          <span className="text-lg">{icon}</span> {label}
        </span>
        <span className="text-xs text-neutral-600 font-mono">{event}</span>
      </div>

      {/* Meters */}
      <div className="grid grid-cols-2 gap-6">
        <div className="flex flex-col gap-2">
          <div className="flex justify-between text-sm">
            <span className="text-neutral-500">Last hour</span>
            <span className={`font-mono font-semibold ${textColor(hourlyPct)}`}>
              {count1h} / {threshold.hourly}
            </span>
          </div>
          <div className="h-2 bg-neutral-800 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all"
              style={{ width: `${hourlyPct}%`, backgroundColor: barColor(hourlyPct) }}
            />
          </div>
        </div>
        <div className="flex flex-col gap-2">
          <div className="flex justify-between text-sm">
            <span className="text-neutral-500">Last 24h</span>
            <span className={`font-mono font-semibold ${textColor(dailyPct)}`}>
              {count24h} / {threshold.daily}
            </span>
          </div>
          <div className="h-2 bg-neutral-800 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all"
              style={{ width: `${dailyPct}%`, backgroundColor: barColor(dailyPct) }}
            />
          </div>
        </div>
      </div>

      {/* Area chart */}
      <div className="h-28">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 4, right: 0, left: -28, bottom: 0 }}>
            <defs>
              <linearGradient id={`grad-${event}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={areaColor} stopOpacity={0.3} />
                <stop offset="95%" stopColor={areaColor} stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis
              dataKey="hour"
              tick={{ fontSize: 9, fill: "#525252" }}
              tickLine={false}
              axisLine={false}
              interval={5}
            />
            <YAxis
              tick={{ fontSize: 9, fill: "#525252" }}
              tickLine={false}
              axisLine={false}
              allowDecimals={false}
              domain={[0, maxVal + 1]}
            />
            <Tooltip content={<CustomTooltip />} />
            {/* Threshold reference line */}
            <ReferenceLine
              y={threshold.hourly}
              stroke="#525252"
              strokeDasharray="3 3"
              label={{ value: "limit", position: "insideTopRight", fontSize: 9, fill: "#525252" }}
            />
            <Area
              type="monotone"
              dataKey="calls"
              stroke={areaColor}
              strokeWidth={2}
              fill={`url(#grad-${event})`}
              dot={false}
              activeDot={{ r: 3, fill: areaColor }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
