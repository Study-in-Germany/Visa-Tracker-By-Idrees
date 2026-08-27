import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";
import { SITE_NAME } from "@/lib/constants";

export const metadata: Metadata = {
  title: `${SITE_NAME} — Study in Germany`,
  description:
    "Track your German student visa journey with real applicant data — queue movement, processing trends, estimated timelines and outcomes.",
};

const NAV = [
  { href: "/tracker", label: "Tracker" },
  { href: "/analytics", label: "Analytics" },
  { href: "/queue-progress", label: "Queue Progress" },
  { href: "/announcements", label: "Announcements" },
  { href: "/resources", label: "Resources" },
  { href: "/about", label: "About" },
];

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen flex flex-col">
        <header className="bg-navy-950 text-white sticky top-0 z-30 shadow-md">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between h-16 gap-4">
            <Link href="/" className="flex items-center gap-2 font-bold text-lg shrink-0">
              <span className="inline-block w-8 h-8 rounded-full bg-gold-500 text-navy-950 flex items-center justify-center text-sm font-extrabold">
                🇩🇪
              </span>
              <span className="hidden sm:inline">
                Visa Tracker <span className="text-gold-400">by Idrees</span>
              </span>
              <span className="sm:hidden">Visa Tracker</span>
            </Link>
            <nav className="flex items-center gap-0.5 sm:gap-1 text-sm font-medium overflow-x-auto">
              {NAV.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="px-2.5 py-2 rounded-lg hover:bg-navy-800 transition-colors whitespace-nowrap"
                >
                  {item.label}
                </Link>
              ))}
              <Link
                href="/submit"
                className="ml-1 px-3 py-2 rounded-lg bg-gold-500 text-navy-950 hover:bg-gold-400 transition-colors font-semibold whitespace-nowrap"
              >
                Submit Entry
              </Link>
              <Link
                href="/login"
                className="px-2.5 py-2 rounded-lg border border-navy-700 hover:bg-navy-800 transition-colors whitespace-nowrap"
              >
                Login
              </Link>
            </nav>
          </div>
        </header>
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-8">{children}</main>
        <footer className="border-t border-gray-200 py-6 text-center text-xs text-gray-500 space-x-4">
          <span>{SITE_NAME} · Study in Germany — Community &amp; Guidance</span>
          <Link href="/admin" className="underline hover:text-gray-700">
            Admin
          </Link>
        </footer>
      </body>
    </html>
  );
}
