import type { Metadata } from "next";
import Link from "next/link";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Listing Launch",
  description: "Free business listing scan. Find where your business is missing or wrong, then fix it once.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <header className="border-b border-border bg-card/60 backdrop-blur">
          <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
            <Link href="/" className="flex items-center gap-2 font-semibold">
              <span className="inline-block h-6 w-6 rounded-md bg-accent" aria-hidden />
              Listing Launch
            </Link>
            <nav className="flex gap-4 text-sm text-muted">
              <Link href="/#how" className="hover:text-foreground">How it works</Link>
              <Link href="/admin" className="hover:text-foreground">Ops</Link>
              <Link href="/admin/outbox" className="hover:text-foreground">Outbox</Link>
            </nav>
          </div>
        </header>
        <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">{children}</main>
        <footer className="border-t border-border py-6 text-center text-xs text-muted">
          We find, create and correct business listings. We do not sell rankings or guaranteed backlinks.
        </footer>
      </body>
    </html>
  );
}
