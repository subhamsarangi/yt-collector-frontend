import Link from "next/link";
import Image from "next/image";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

const links = [
  { href: "/",         label: "Home" },
  { href: "/channels", label: "Channels" },
  { href: "/topics",   label: "Topics" },
  { href: "/search",   label: "Search" },
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

  return (
    <nav className="hidden md:flex items-center justify-between px-6 py-3 bg-neutral-900 border-b border-neutral-800">
      <div className="flex items-center gap-6">
        <Link href="/" className="flex items-center gap-2 flex-shrink-0">
          <Image src="/logo.png" alt="YT Collector" width={28} height={28} className="rounded" />
          <span className="font-bold text-sm">YT Collector</span>
        </Link>
        {links.map((l) => (
          <Link key={l.href} href={l.href} className="text-sm text-neutral-400 hover:text-white transition">
            {l.label}
          </Link>
        ))}
      </div>
      <div className="flex items-center gap-4 text-sm">
        {user ? (
          <>
            <Link href="/admin" className="text-neutral-400 hover:text-white transition">Admin</Link>
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
