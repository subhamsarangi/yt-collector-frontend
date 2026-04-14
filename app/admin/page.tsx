import { supabaseAdmin } from "@/lib/supabase/server";
import { getUserRole } from "@/lib/supabase/userRole";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import CookieUpload from "@/components/CookieUpload";
import RebootInstanceButton from "@/components/RebootInstanceButton";
import AudioCapSlider from "@/components/AudioCapSlider";
import ScanLimitSlider from "@/components/ScanLimitSlider";

export const revalidate = 0;

export default async function AdminPage() {
  const role = await getUserRole();

  // Guest view
  if (role !== "owner") {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
    );
    const { data: { user } } = await supabase.auth.getUser();

    return (
      <div className="flex flex-col gap-6 max-w-md">
        <h1 className="text-xl font-bold">Account</h1>

        <div className="flex flex-col gap-2 bg-neutral-900 rounded-lg p-4">
          <h2 className="text-sm font-semibold text-neutral-400">Your account</h2>
          <p className="text-sm">{user?.email}</p>
          <p className="text-xs text-neutral-500">
            Role: <span className="text-neutral-300">Guest</span> · Status:{" "}
            <span className="text-green-400">Approved</span>
          </p>
        </div>

        <div className="flex flex-col gap-2 bg-neutral-900 rounded-lg p-4">
          <h2 className="text-sm font-semibold text-neutral-400">About YT Collector</h2>
          <p className="text-sm text-neutral-400 leading-relaxed">
            YT Collector is a personal platform that automatically tracks YouTube channels,
            searches for topics, transcribes videos, and makes everything full-text searchable.
          </p>
          <ul className="text-sm text-neutral-500 flex flex-col gap-1 mt-1">
            <li>📺 Browse tracked channels by domain</li>
            <li>🔖 Explore topic searches and their videos</li>
            <li>🔍 Full-text search across all transcripts</li>
            <li>📄 Export any video or topic as PDF</li>
          </ul>
        </div>

        <form action="/api/auth/logout" method="POST">
          <button type="submit"
            className="text-sm text-red-400 hover:text-red-300 transition">
            Log out
          </button>
        </form>
      </div>
    );
  }

  // Owner view — fetch current user's ID to prevent self-revoke
  const cookieStore2 = await cookies();
  const supabase2 = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore2.getAll(), setAll: () => {} } }
  );
  const { data: { user: currentUser } } = await supabase2.auth.getUser();

  const { data: users } = await supabaseAdmin
    .from("users")
    .select("id, email, approved, role, created_at")
    .order("created_at", { ascending: false });

  const { data: capSetting } = await supabaseAdmin
    .from("settings")
    .select("value")
    .eq("key", "audio_cap_minutes")
    .single();
  const audioCap = (capSetting?.value as number) ?? 10;

  const { data: scanLimitSetting } = await supabaseAdmin
    .from("settings")
    .select("value")
    .eq("key", "scan_videos_per_run")
    .single();
  const scanLimit = (scanLimitSetting?.value as number) ?? 20;

  return (
    <div className="flex flex-col gap-8">
      <h1 className="text-xl font-bold">Admin</h1>

      <section className="flex flex-col gap-3">
        <h2 className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">Server</h2>
        <RebootInstanceButton />
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">Transcription</h2>
        <AudioCapSlider initial={audioCap} />
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">Channel Scanning</h2>
        <ScanLimitSlider initial={scanLimit} />
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">Cookies</h2>
        <CookieUpload />
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">Accounts</h2>
        {users?.map((u) => {
          const isSelf = u.id === currentUser?.id;
          return (
            <div key={u.id} className="flex items-center justify-between bg-neutral-900 rounded-lg px-4 py-3">
              <div>
                <p className="text-sm font-medium">{u.email} {isSelf && <span className="text-xs text-neutral-500">(you)</span>}</p>
                <p className="text-xs text-neutral-500">{u.role} · joined {new Date(u.created_at).toLocaleDateString()}</p>
              </div>
              {isSelf ? (
                <span className="text-xs text-neutral-600 px-3 py-1">owner</span>
              ) : (
                <form action={`/api/admin/users/${u.id}/${u.approved ? "revoke" : "approve"}`} method="POST">
                  <button type="submit"
                    className={`text-xs rounded px-3 py-1 ${u.approved ? "bg-red-900 text-red-300 hover:bg-red-800" : "bg-green-900 text-green-300 hover:bg-green-800"}`}>
                    {u.approved ? "Revoke" : "Approve"}
                  </button>
                </form>
              )}
            </div>
          );
        })}
        {!users?.length && <p className="text-neutral-500 text-sm">No users yet.</p>}
        <form action="/api/auth/logout" method="POST">
          <button type="submit" className="text-sm text-red-400 hover:text-red-300 transition">
            Log out
          </button>
        </form>
      </section>
    </div>
  );
}
