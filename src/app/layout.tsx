import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "FundScope — India MF Screener",
  description:
    "Personal mutual fund screener for Indian direct plans. Free on Vercel — optional AI via your OpenAI key.",
};

function Nav() {
  return (
    <header className="border-b border-[var(--border)] bg-[var(--surface)]/80 backdrop-blur-md sticky top-0 z-50">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <Link href="/" className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/15 text-sm font-bold text-emerald-400">
            FS
          </span>
          <div>
            <p className="text-sm font-semibold tracking-tight">FundScope</p>
            <p className="text-[10px] text-[var(--muted)]">India · Direct plans</p>
          </div>
        </Link>
        <nav className="flex items-center gap-1 text-sm">
          <Link
            href="/"
            className="rounded-md px-3 py-1.5 text-[var(--muted)] transition hover:bg-[var(--surface-2)] hover:text-white"
          >
            Screener
          </Link>
          <Link
            href="/portfolio"
            className="rounded-md px-3 py-1.5 text-[var(--muted)] transition hover:bg-[var(--surface-2)] hover:text-white"
          >
            My Portfolio
          </Link>
        </nav>
      </div>
    </header>
  );
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full`}>
      <body className="min-h-full antialiased">
        <Nav />
        <main className="flex-1">{children}</main>
        <footer className="border-t border-[var(--border)] py-6 text-center text-xs text-[var(--muted)]">
          Not investment advice · Data from AMFI via MFapi / mfdata.in · Personal use
        </footer>
      </body>
    </html>
  );
}
