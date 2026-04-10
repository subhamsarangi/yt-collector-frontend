import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import BottomNav from "@/components/BottomNav";
import TopNav from "@/components/TopNav";

const geist = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "YT Collector",
  description: "YouTube scraping, transcription & search platform",
  icons: { icon: "/favicon.ico" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${geist.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-neutral-950 text-neutral-100 pb-16 md:pb-0">
        <TopNav />
        {/* Mobile header — logo only, visible on small screens */}
        <header className="flex md:hidden items-center gap-2 px-4 py-3 bg-neutral-900 border-b border-neutral-800">
          <a href="/" className="flex items-center gap-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.png" alt="YT Collector" width={24} height={24} className="rounded" />
            <span className="font-bold text-sm">YT Collector</span>
          </a>
        </header>
        <main className="flex-1 max-w-5xl mx-auto w-full px-4 py-6">{children}</main>
        <BottomNav />
      </body>
    </html>
  );
}
