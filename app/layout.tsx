import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";
import { SITE_NAME } from "@/lib/constants";
import SiteHeader from "@/components/SiteHeader";

export const metadata: Metadata = {
  title: `${SITE_NAME} — Study in Germany`,
  description:
    "Track your German student visa journey with real applicant data — queue movement, processing trends, estimated timelines and outcomes.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen flex flex-col">
        <SiteHeader />
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
