import { NextRequest, NextResponse } from "next/server";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const res = await fetch(`${process.env.OCI_API_URL}/pdf/video/${id}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.OCI_API_KEY}` },
  });
  if (!res.ok) return NextResponse.json({ error: "PDF generation failed" }, { status: 500 });
  const pdf = await res.arrayBuffer();
  return new NextResponse(pdf, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="video-${id}.pdf"`,
    },
  });
}
