import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "./server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * Verifies the requesting user is the owner.
 * Returns null if authorized, or a 403 NextResponse if not.
 */
export async function requireOwner(req?: NextRequest): Promise<NextResponse | null> {
  try {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll: () => cookieStore.getAll(),
          setAll: () => {},
        },
      }
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data } = await supabaseAdmin
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single();

    if (data?.role !== "owner") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    return null; // authorized
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
