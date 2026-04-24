import Link from "next/link";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { getUserRole } from "@/lib/supabase/userRole";

const links = [
  { href: "/",         label: "Home" },
  { href: "/channels", label: "Channels" },
  { href: "/topics",   label: "Topics" },
];

export default async function TopNav() {
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
  const role = user ? await getUserRole() : null;

  return (
    <nav className="hidden md:flex items-center justify-between px-6 py-3 bg-neutral-900 border-b border-neutral-800">
      <div className="flex items-center gap-6">
        <Link href="/" className="flex items-center gap-2 flex-shrink-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="YT Collector" width={28} height={28} className="rounded" />
          <span className="font-bold text-sm">YT Collector</span>
        </Link>
        {links.map((l) => (
          <Link key={l.href} href={l.href} className="text-sm text-neutral-400 hover:text-white transition">
            {l.label}
          </Link>
        ))}
      </div>
      <div className="flex items-center gap-4 text-sm">
        <Link
          href="/search"
          className="flex items-center gap-1.5 text-sm bg-neutral-800 hover:bg-neutral-700 text-neutral-200 rounded-lg px-3 py-1.5 transition"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-neutral-400">
            <path fillRule="evenodd" d="M9 3.5a5.5 5.5 0 100 11 5.5 5.5 0 000-11zM2 9a7 7 0 1112.452 4.391l3.328 3.329a.75.75 0 11-1.06 1.06l-3.329-3.328A7 7 0 012 9z" clipRule="evenodd" />
          </svg>
          Search
        </Link>
        {user ? (
          <>
            <Link href="/admin" className="text-neutral-400 hover:text-white transition">
              {role === "owner" ? "Admin" : "Account"}
            </Link>
            <form action="/api/auth/logout" method="POST">
              <button type="submit" className="text-neutral-400 hover:text-white transition">Logout</button>
            </form>
          </>
        ) : (
          <Link href="/login" className="text-neutral-400 hover:text-white transition">Login</Link>
        )}
      </div>
    </nav>
  );
}
