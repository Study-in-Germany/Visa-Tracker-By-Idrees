"use client";

import Link from "next/link";

const TABS = [
  { href: "/dashboard", label: "My Visa Journey" },
  { href: "/dashboard/information", label: "My Information" },
  { href: "/dashboard/updates", label: "My Updates" },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-navy-950">My Dashboard</h1>
        <button
          className="btn-secondary text-xs"
          onClick={async () => {
            await fetch("/api/applicant/logout", { method: "POST" });
            window.location.href = "/";
          }}
        >
          Log Out
        </button>
      </div>
      <div className="flex gap-1 border-b border-gray-200">
        {TABS.map((t) => (
          <Link key={t.href} href={t.href} className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-navy-950">
            {t.label}
          </Link>
        ))}
      </div>
      {children}
    </div>
  );
}
