"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

const TABS = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/applicants", label: "Applicants" },
  { href: "/admin/announcements", label: "Announcements" },
  { href: "/admin/settings", label: "Settings" },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  // The login page renders standalone, without the authenticated shell.
  if (pathname === "/admin/login") return <>{children}</>;

  async function handleLogout() {
    await fetch("/api/admin/logout", { method: "POST" });
    router.push("/admin/login");
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-navy-950">Admin Panel</h1>
        <button className="btn-secondary text-xs" onClick={handleLogout}>Log Out</button>
      </div>
      <div className="flex gap-1 border-b border-gray-200 overflow-x-auto">
        {TABS.map((t) => (
          <Link key={t.href} href={t.href} className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-navy-950 whitespace-nowrap">
            {t.label}
          </Link>
        ))}
      </div>
      {children}
    </div>
  );
}
