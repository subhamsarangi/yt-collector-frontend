import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const baseUrl = process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : "http://localhost:3000";

  const res = await fetch(`${baseUrl}/api/cron/queue-runner`, {
    method: "POST",
    headers: { "x-webhook-secret": process.env.QUEUE_WEBHOOK_SECRET! },
  });

  if (!res.ok) return NextResponse.json({ error: "Trigger failed" }, { status: 500 });
  return NextResponse.json({ ok: true });
}
