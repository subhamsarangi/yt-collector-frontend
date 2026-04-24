import type { Metadata } from "next";
import { Geist, Lora } from "next/font/google";
import Link from "next/link";
import "./globals.css";
import BottomNav from "@/components/BottomNav";
import TopNav from "@/components/TopNav";
import RebootModal from "@/components/RebootModal";

const geist = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const lora = Lora({ variable: "--font-lora", subsets: ["latin"], style: ["normal", "italic"] });

const isDev = process.env.NODE_ENV === "development";

export const metadata: Metadata = {
  title: {
    default: isDev ? "[dev] YT Collector" : "YT Collector",
    template: isDev ? "[dev] %s" : "%s",
  },
  description: "YouTube scraping, transcription & search platform",
  icons: { icon: "/favicon.ico" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${geist.variable} ${lora.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-neutral-950 text-neutral-100 pb-16 md:pb-0" style={{ fontFamily: "var(--font-geist-sans)" }}>
        {/* Global diagonal grid pattern */}
        <div
          className="fixed inset-0 -z-10 pointer-events-none"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M0 20 L20 0 L40 20 L20 40 Z' fill='none' stroke='rgba(255,255,255,0.03)' stroke-width='1'/%3E%3C/svg%3E")`,
            backgroundSize: '40px 40px'
          }}
        />
        <TopNav />
        {/* Mobile header — logo only, visible on small screens */}
        <header className="flex md:hidden items-center justify-between px-4 py-3 bg-neutral-900 border-b border-neutral-800">
          <Link href="/" className="flex items-center gap-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.png" alt="YT Collector" width={24} height={24} className="rounded" />
            <span className="font-bold text-sm">YT Collector</span>
          </Link>
          <Link href="/search" className="text-neutral-400 hover:text-white transition p-1">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
              <path fillRule="evenodd" d="M9 3.5a5.5 5.5 0 100 11 5.5 5.5 0 000-11zM2 9a7 7 0 1112.452 4.391l3.328 3.329a.75.75 0 11-1.06 1.06l-3.329-3.328A7 7 0 012 9z" clipRule="evenodd" />
            </svg>
          </Link>
        </header>
        <main className="flex-1 w-full px-4 py-6 md:px-6">{children}</main>
        <BottomNav />
        <RebootModal />
      </body>
    </html>
  );
}
