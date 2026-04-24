import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { requireOwner } from "@/lib/supabase/requireOwner";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const denied = await requireOwner();
  if (denied) return denied;

  const { id } = await params;

  // Prevent self-delete
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  );
  const { data: { user } } = await supabase.auth.getUser();
  if (user?.id === id) {
    return NextResponse.json({ error: "Cannot delete yourself" }, { status: 400 });
  }

  // Delete from public.users table — auth.users row stays so they can re-register
  await supabaseAdmin.from("users").delete().eq("id", id);

  return NextResponse.redirect(new URL("/admin", _req.url));
}
