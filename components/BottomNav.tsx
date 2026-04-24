"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/",         label: "Home",     icon: "🏠" },
  { href: "/channels", label: "Channels", icon: "📺" },
  { href: "/topics",   label: "Topics",   icon: "🔖" },
  { href: "/add",      label: "Video",    icon: "🎬" },
  { href: "/admin",    label: "Account",  icon: "👤" },
];

export default function BottomNav() {
  const path = usePathname();
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-neutral-900 border-t border-neutral-800 flex md:hidden z-50">
      {links.map((l) => (
        <Link
          key={l.href}
          href={l.href}
          className={`flex-1 flex flex-col items-center py-2 text-xs gap-1 ${
            path === l.href ? "text-white" : "text-neutral-500"
          }`}
        >
          <span className="text-lg">{l.icon}</span>
          {l.label}
        </Link>
      ))}
    </nav>
  );
}
