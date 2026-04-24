import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const body = await request.json();
    const { high_priority } = body;

    if (typeof high_priority !== "boolean") {
      return NextResponse.json(
        { error: "high_priority must be a boolean" },
        { status: 400 }
      );
    }

    const { error } = await supabaseAdmin
      .from("channels")
      .update({ high_priority })
      .eq("id", id);

    if (error) {
      console.error("[channels/high-priority] Update error:", error);
      return NextResponse.json(
        { error: "Failed to update channel priority" },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true, high_priority });
  } catch (e) {
    console.error("[channels/high-priority] Error:", e);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
