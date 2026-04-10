import { NextRequest, NextResponse } from "next/server";

const OCI = process.env.OCI_API_URL!;
const OCI_KEY = process.env.OCI_API_KEY!;

export async function GET() {
  const res = await fetch(`${OCI}/cookies/info`, {
    headers: { Authorization: `Bearer ${OCI_KEY}` },
  });
  if (!res.ok) return NextResponse.json({ exists: false });
  return NextResponse.json(await res.json());
}

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "No file" }, { status: 400 });

  // Validate it looks like a Netscape cookie file
  const text = await file.text();
  if (!text.includes("Netscape HTTP Cookie File") && !text.includes(".youtube.com")) {
    return NextResponse.json({ error: "File doesn't look like a valid cookies.txt" }, { status: 400 });
  }

  const ociForm = new FormData();
  ociForm.append("file", new Blob([text], { type: "text/plain" }), "cookies.txt");

  const res = await fetch(`${OCI}/cookies`, {
    method: "POST",
    headers: { Authorization: `Bearer ${OCI_KEY}` },
    body: ociForm,
  });

  if (!res.ok) return NextResponse.json({ error: "OCI upload failed" }, { status: 500 });
  const data = await res.json();
  return NextResponse.json({ ok: true, bytes: data.bytes });
}
