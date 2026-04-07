import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const { channel_url } = await req.json();
  if (!channel_url) return NextResponse.json({ error: "Missing channel_url" }, { status: 400 });

  const res = await fetch(`${process.env.OCI_API_URL}/channel/info`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.OCI_API_KEY}` },
    body: JSON.stringify({ channel_url }),
  });

  if (!res.ok) return NextResponse.json({ error: "Failed to fetch channel info" }, { status: 500 });
  return NextResponse.json(await res.json());
}
