import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const host = req.headers.get("host") ?? "localhost:3000";
  const protocol = host.includes("localhost") ? "http" : "https";
  const baseUrl = `${protocol}://${host}`;

  const res = await fetch(`${baseUrl}/api/cron/queue-runner`, {
    method: "POST",
    headers: { "x-webhook-secret": process.env.QUEUE_WEBHOOK_SECRET! },
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    return NextResponse.json({ error: `Trigger failed: ${res.status} ${body}` }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
