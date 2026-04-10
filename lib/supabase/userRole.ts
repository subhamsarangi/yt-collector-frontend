import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { supabaseAdmin } from "./server";

/**
 * Returns the current user's role ("owner" | "guest" | null).
 * null means not logged in or not in the users table.
 */
export async function getUserRole(): Promise<"owner" | "guest" | null> {
  try {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
    );
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data } = await supabaseAdmin
      .from("users").select("role").eq("id", user.id).single();
    return (data?.role as "owner" | "guest") ?? null;
  } catch {
    return null;
  }
}
