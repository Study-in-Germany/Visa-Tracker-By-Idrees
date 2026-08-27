"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { SITE_NAME } from "@/lib/constants";

const NAV = [
  { href: "/tracker", label: "Tracker" },
  { href: "/analytics", label: "Analytics" },
  { href: "/queue-progress", label: "Queue Progress" },
  { href: "/announcements", label: "Announcements" },
  { href: "/resources", label: "Resources" },
  { href: "/about", label: "About" },
];

export default function SiteHeader() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  return (
    <header className="bg-navy-950 text-white sticky top-0 z-30 shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between h-16 gap-4">
        {/* Hamburger button — mobile only */}
        <button
          type="button"
          aria-label="Open menu"
          onClick={() => setOpen(true)}
          className="sm:hidden -ml-1 p-2 rounded-lg hover:bg-navy-800 transition-colors"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        </button>

        <Link href="/" className="flex items-center gap-2 font-bold text-lg shrink-0">
          <span className="inline-block w-8 h-8 rounded-full bg-gold-500 text-navy-950 flex items-center justify-center text-sm font-extrabold">
            🇩🇪
          </span>
          <span className="hidden sm:inline">
            Visa Tracker <span className="text-gold-400">by Idrees</span>
          </span>
          <span className="sm:hidden">Visa Tracker</span>
        </Link>

        {/* Full nav — desktop only */}
        <nav className="hidden sm:flex items-center gap-0.5 sm:gap-1 text-sm font-medium overflow-x-auto">
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

        {/* Compact actions — mobile only, so Submit/Login are still reachable without opening the menu */}
        <div className="flex sm:hidden items-center gap-2">
          <Link href="/submit" className="px-3 py-2 rounded-lg bg-gold-500 text-navy-950 text-sm font-semibold whitespace-nowrap">
            Submit
          </Link>
        </div>
      </div>

      {/* Backdrop */}
      {open && (
        <div
          className="fixed inset-0 bg-black/50 z-40 sm:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Slide-in panel */}
      <div
        className={`fixed top-0 left-0 h-full w-72 max-w-[80vw] bg-white text-gray-900 z-50 shadow-xl transform transition-transform duration-200 sm:hidden ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between px-4 h-16 border-b border-gray-200">
          <span className="font-bold text-navy-950">{SITE_NAME}</span>
          <button
            type="button"
            aria-label="Close menu"
            onClick={() => setOpen(false)}
            className="p-2 rounded-lg hover:bg-gray-100"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
        <nav className="flex flex-col p-2">
          {NAV.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className={`px-4 py-3 rounded-lg text-sm font-medium ${
                  active ? "bg-navy-50 text-navy-950" : "text-gray-700 hover:bg-gray-50"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
          <div className="border-t border-gray-200 my-2" />
          <Link
            href="/submit"
            onClick={() => setOpen(false)}
            className="px-4 py-3 rounded-lg text-sm font-semibold bg-gold-500 text-navy-950 text-center mx-2"
          >
            Submit Entry
          </Link>
          <Link
            href="/login"
            onClick={() => setOpen(false)}
            className="px-4 py-3 mt-2 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 text-center"
          >
            Login
          </Link>
          <Link
            href="/admin"
            onClick={() => setOpen(false)}
            className="px-4 py-3 rounded-lg text-sm font-medium text-gray-400 hover:bg-gray-50 text-center"
          >
            Admin
          </Link>
        </nav>
      </div>
    </header>
  );
}
