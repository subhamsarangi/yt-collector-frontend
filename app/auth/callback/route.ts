import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  const { searchParams, origin } = new URL(req.url);
  const code = searchParams.get("code");

  if (code) {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll: () => cookieStore.getAll(),
          setAll: (toSet) => toSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options)),
        },
      }
    );

    const { data: { user } } = await supabase.auth.exchangeCodeForSession(code);

    if (user) {
      // Ensure user row exists (handles OAuth sign-ins)
      const { data: existing } = await supabaseAdmin
        .from("users")
        .select("id, approved")
        .eq("id", user.id)
        .single();

      if (!existing) {
        const isOwner = user.email === process.env.OWNER_EMAIL;
        await supabaseAdmin.from("users").insert({
          id: user.id,
          email: user.email,
          approved: isOwner,
          role: isOwner ? "owner" : "guest",
        });
        return NextResponse.redirect(`${origin}${isOwner ? "/" : "/pending"}`);
      }

      return NextResponse.redirect(`${origin}${existing.approved ? "/" : "/pending"}`);
    }
  }

  return NextResponse.redirect(`${origin}/login`);
}
