import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import BottomNav from "@/components/BottomNav";

const geist = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "YT Collector",
  description: "YouTube scraping, transcription & search platform",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${geist.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-neutral-950 text-neutral-100 pb-16 md:pb-0">
        <main className="flex-1 max-w-5xl mx-auto w-full px-4 py-6">{children}</main>
        <BottomNav />
      </body>
    </html>
  );
}
